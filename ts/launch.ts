import { spawn } from 'child_process';

const minecraft = spawn('c:\\bedrock-server\\bedrock_server.exe');

const startup = () => {
  return new Promise<void>(r => {
    const listener = (data: Buffer) => {
      if (data.toString().includes('Server started')) {
        minecraft.stdout.off('data', listener);
        r();
      }
    };

    minecraft.stdout.on('data', listener);
  });
};

const send = (cmd: string) => {
  return new Promise<string>(r => {
    minecraft.stdout.once('data', (data) => {
      r(data.toString());
    });

    minecraft.stdin.write(`${cmd}\n`);
  });
};

const wait = (ms: number) => {
  return new Promise<void>(r => {
    setTimeout(() => r(), ms);
  });
};

const listPermissions = async () => {
  const response = await send('permission list');

  
};

const backup = async () => {
  await send('save hold');

  let files: string[] | null = null;

  while (files === null) {
    const response = await send('save query');
    if (response !== null && response.length > 1) {
      const lines = response.split('\n');
      if (lines.length === 3) {
        const fileRefs = lines[1].split(', ');
        files = fileRefs.map(x => x.split(':')[0]);
        break;
      }
    }

    await wait(100);
  }

  await send('save resume');
};

(async () => {
  await startup();

  const rv = await send('permission list');
  console.log(rv);

  await backup();

  await send('stop');
})();