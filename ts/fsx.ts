import { promisify } from 'util';
import fs from 'fs';

export const access = promisify(fs.access);
export const copyFile = promisify(fs.copyFile);
export const mkdir = promisify(fs.mkdir);

export async function exists(path: fs.PathLike) {
  try {
    await access(path);
    return true;
  }
  catch {
    return false;
  }
}