import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import * as fsx from './fsx';
import { DateTime } from 'luxon';
import mkdirp from 'mkdirp';
import del from 'del';

export interface BedrockPermissions {
  ops: string[]
  permissions: { xuid: string, permission: 'operator' | 'member' | 'visitor' }
}

export interface BedrockFile {
  name: string
  size: number
}

export interface BedrockPlayer {
  handle: string
  xuid: string
}

const fsp = fs.promises;

class BedrockEvents {
  static SERVER_STARTED = 'server-started';
  static SERVER_STOPPED = 'server-stopped';
  static PERMISSIONS_LISTED = 'permissions-listed';
  static SAVE_HELD = 'save-held';
  static SAVE_RESUMED = 'save-resume';
  static PLAYER_CONNECTED = 'player-connected';
  static PLAYER_DISCONNECTED = 'player-disconnected';
}

class BedrockMessages {
  static SERVER_STARTED = '[INFO] Server started.';
  static SERVER_STOPPED = 'Quit correctly';
  static SAVE_HELD = 'Saving...';
  static SAVE_RESUMED = 'Changes to the level are resumed.';
}

export class Bedrock {
  
  private readonly serverPath: string;
  private readonly events = new EventEmitter();
  private server?: ChildProcessWithoutNullStreams;
  private backupTimeoutId: NodeJS.Timeout | null = null;
  private backingUp = false;
  private currentMessage = '';
  private settings: Record<string, string> = {};

  private _playerCount = 0;
  get playerCount() {
    return this._playerCount;
  }

  constructor(serverPath: string) {
    this.serverPath = serverPath;
  }

  private dataListener(data: Buffer) {
    const dataStr = data.toString();

    if (dataStr.substring(dataStr.length - 1) !== '\n') {
      this.currentMessage += dataStr;
      return;
    }

    const message = this.currentMessage + dataStr.trim();
    this.currentMessage = '';

    if (message === BedrockMessages.SERVER_STARTED) {
      this.events.emit(BedrockEvents.SERVER_STARTED);
    }
    else if (message === BedrockMessages.SERVER_STOPPED) {
      this.events.emit(BedrockEvents.SERVER_STOPPED);
    }
    else if (message === BedrockMessages.SAVE_HELD) {
      this.events.emit(BedrockEvents.SAVE_HELD);
    }
    else if (message === BedrockMessages.SAVE_RESUMED) {
      this.events.emit(BedrockEvents.SAVE_RESUMED);
    }
    else if (message.startsWith('[INFO] Player connected')) {
      const arr = message
        .replace('[INFO] Player connected: ', '')
        .split(', xuid: ');
      
      const player: BedrockPlayer = {
        handle: arr[0],
        xuid: arr[1]
      };

      if (++this._playerCount > 0) {
        this.startBackups();
      }
      
      this.events.emit(BedrockEvents.PLAYER_CONNECTED, player);
    }
    else if (message.startsWith('[INFO] Player disconnected')) {
      const arr = message
        .replace('[INFO] Player disconnected: ', '')
        .split(', xuid: ');
      
      const player: BedrockPlayer = {
        handle: arr[0],
        xuid: arr[1]
      };

      if (--this._playerCount === 0) {
        this.stopBackups();
      }
      
      this.events.emit(BedrockEvents.PLAYER_DISCONNECTED, player);
    }
    else if (message.includes('"command":')) {
      this.events.emit(BedrockEvents.PERMISSIONS_LISTED, message);
    }
  }

  private send(cmd: string) {
    this.server!.stdin.write(`${cmd}\n`);
  }

  private sendAndWait(cmd: string, event: string, timeout = 30000) {
    return new Promise<any[]>((resolve, reject) => {
      const listener = ((...args: any[]) => {
        clearTimeout(timeoutId);

        resolve(args);
      }).bind(this);

      const timeoutId = setTimeout(() => {
        this.events.off(event, listener);

        reject(new Error(`Request timed out: ${cmd}`));
      }, timeout);

      this.events.once(event, listener);

      this.server!.stdin.write(`${cmd}\n`);
    });
  }

  private once(event: string, timeout = 30000) {
    return new Promise<any[]>((resolve, reject) => {
      const listener = ((...args: any[]) => {
        clearTimeout(timeoutId);

        resolve(args);
      }).bind(this);

      const timeoutId = setTimeout(() => {
        this.events.off(event, listener);

        reject(new Error('Request timed out'));
      }, timeout);

      this.events.once(event, listener);
    });
  }

  private wait(ms: number) {
    return new Promise<void>(r => {
      setTimeout(() => r(), ms);
    });
  }

  private startBackups() {
    if (this.backupTimeoutId !== null) {
      return;
    }

    this.backupTimeoutId = setTimeout(async () => {
      await this.backup();

      this.backupTimeoutId = null;
      this.startBackups();
    }, 5 * 1000 * 60);
  }

  private stopBackups() {
    if (this.backupTimeoutId === null) {
      return;
    }

    clearTimeout(this.backupTimeoutId);
    this.backupTimeoutId = null;
  }

  async load() {
    const contents = await fsp.readFile(path.join(this.serverPath, 'server.properties'));
    const lines = contents.toString().split('\n');
    for (const line of lines) {
      const cleaned = line.trim();

      if (cleaned.startsWith('#') || !cleaned.includes('=')) {
        continue;
      }

      const keyValue = cleaned.split('=');
      this.settings[keyValue[0].trim()] = keyValue[1].trim();
    }
  }

  async start(): Promise<void> {
    if (!Object.keys(this.settings).length) {
      await this.load();
    }

    if (this.isRunning()) {
      throw new Error('Server already running');
    }

    this.server = spawn(path.join(this.serverPath, 'bedrock_server.exe'));

    this.server.stdout.on('data', this.dataListener.bind(this));

    await this.once(BedrockEvents.SERVER_STARTED);

    console.log(`${this.settings['server-name']} started!`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning()) {
      return;
    }
          
    await this.sendAndWait('stop', BedrockEvents.SERVER_STOPPED);

    await new Promise<void>(r => {
      this.server!.once('close', () => {
        this.server = undefined;
        this._playerCount = 0;
        
        r();
      });
    });
  }

  isRunning() {
    return this.server !== undefined;
  }

  async listPermissions(): Promise<BedrockPermissions> {
    const args = await this.sendAndWait('permission list',
      BedrockEvents.PERMISSIONS_LISTED);
    
    const message: string = args[0];
    
    const arr = message
      .replace(/(\*|)###(\*|)/g, '')
      .replace(/\s/g, '')
      .replace('}{', '}*###*{')
      .split('*###*');
    
    return {
      ops: JSON.parse(arr[0]).result,
      permissions: JSON.parse(arr[1]).result
    };
  }

  private saveQuery() {
    return new Promise<BedrockFile[] | null>(r => {
      this.server!.stdout.once('data', (data: Buffer) => {
        const message = data.toString().trim();
        if (message.length === 0 || !message.startsWith('Data saved.')) {
          r(null);
          return;
        }

        const arr = message
          .replace('Data saved. Files are now ready to be copied.', '')
          .trim()
          .split(', ');

        const files: BedrockFile[] = [];
        for (const f of arr) {
          const fArr = f.split(':');
          files.push({ name: fArr[0], size: Number(fArr[1]) });
        }

        r(files);
      });
      
      this.send('save query');
    });
  }

  async backup(name?: string) {
    if (this.backingUp) {
      throw new Error('Already backing up');
    }

    this.backingUp = true;

    this.sendAndWait('save hold', BedrockEvents.SAVE_HELD);

    let files = await this.saveQuery();
    while (files === null) {
      await this.wait(100);
      files = await this.saveQuery();
    }

    const backupBasePath = path.join(this.serverPath, 'backups');
    if (!await fsx.exists(backupBasePath)) {
      await fsp.mkdir(backupBasePath);
    }

    let backupPath = path.join(backupBasePath, DateTime.utc().toFormat('yyyy-MM-dd-HH-mm'));
    if (name !== undefined) {
      backupPath += `-${name}`;
    }

    if (await fsx.exists(backupPath)) {
      let idx = 1;
      while (await fsx.exists(`${backupPath}-${idx}`)) {
        idx++;
      }

      backupPath = `${backupPath}-${idx}`;
    }

    await fsp.mkdir(backupPath);

    for (const file of files) {
      const srcPath = path.join(this.serverPath, 'worlds', file.name),
        destPath = path.join(backupPath, file.name);
      
      if (file.name.includes(path.posix.sep)) {
        await mkdirp(destPath.substring(0, destPath.lastIndexOf(path.sep)));
      }
      
      await fsp.copyFile(srcPath, destPath);
    }

    this.send('save resume');

    this.backingUp = false;
  }

  async listBackups() {
    const backupBasePath = path.join(this.serverPath, 'backups');
    if (!await fsx.exists(backupBasePath)) {
      return [];
    }

    return await fsp.readdir(backupBasePath, {
      withFileTypes: false
    });
  }

  async restore(backupName: string) {
    const backupBasePath = path.join(this.serverPath, 'backups'),
      backupPath = path.join(backupBasePath, backupName);
    
    if (!await fsx.exists(backupPath)) {
      return;
    }

    this.stopBackups();

    await this.backup('before-restore');

    await this.stop();

    await del(path.join(this.serverPath, 'worlds', this.settings['level-name']), { force: true });

    fsx.copyDir(backupPath, path.join(this.serverPath, 'worlds'));

    await this.start();
  }

}