import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';

const fsp = fs.promises;

export async function exists(srcPath: fs.PathLike) {
  try {
    await fsp.access(srcPath);
    return true;
  }
  catch {
    return false;
  }
}

export async function copyDir(srcPath: string, destPath: string) {
  const entries = await fsp.readdir(srcPath);
  if (entries === null) {
    throw new Error('Directory not found');
  }

  await mkdirp(destPath);

  for (const entry of entries) {
    const entryPath = path.join(srcPath, entry);

    const stat = await fsp.stat(entryPath);
    if (stat === null) {
      throw new Error('Entry not found');
    }

    const destEntryPath = path.join(destPath, entry);
    
    if (stat.isFile()) {
      await fsp.copyFile(entryPath, destEntryPath);
    }
    else {
      await copyDir(entryPath, destEntryPath);
    }
  }

}