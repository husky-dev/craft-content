import crypto from 'crypto';
import { accessSync, createReadStream, mkdirSync, readdirSync, statSync } from 'fs';
import path from 'path';

export const mkdirp = (folderPath: string) => mkdirSync(folderPath, { recursive: true });

export const listFilesInFolder = (folderPath: string, extensions?: string[]): string[] => {
  const res: string[] = [];
  const items = readdirSync(folderPath);
  for (const item of items) {
    const itemPath = path.resolve(folderPath, item);
    const stat = statSync(itemPath);
    if (stat.isDirectory()) {
      const newItems = listFilesInFolder(itemPath, extensions);
      res.push(...newItems);
    } else if (isFileExtensionInList(itemPath, extensions)) {
      res.push(itemPath);
    }
  }
  return res;
};

const isFileExtensionInList = (filePath: string, extensions?: string[]): boolean => {
  if (!extensions) return true;
  const ext = path.extname(filePath);
  if (!ext) return false;
  return extensions.includes(ext.substring(1).toLocaleLowerCase());
};

// Is file exists
export const isFileExists = (filePath: string): boolean => {
  try {
    accessSync(filePath);
    return true;
  } catch (err) {
    return false;
  }
};

export const clearFileName = (fileName: string): string => {
  let mod = fileName.toLocaleLowerCase();
  // Replace all not allowed symbols
  mod = mod.replace(/[^a-z0-9_\-.]/gi, '_');
  // Replace all double dashes
  mod = mod.replace(/-+/g, '-');
  // Replace all double underscores
  mod = mod.replace(/_+/g, '_');
  // Remove first and last underscore
  mod = mod.replace(/^_|_$/g, '');
  // Remove first and last dash
  mod = mod.replace(/^-|-$/g, '');
  return mod;
};

export const getFileHash = async (filePath: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    const hash = crypto.createHash('sha256');
    // Listen to the 'data' event to read the file
    stream.on('data', data => {
      hash.update(data);
    });
    // Listen to the 'end' event to get the hash value
    stream.on('end', () => {
      const fileHash = hash.digest('hex');
      resolve(fileHash);
    });
    stream.on('error', err => reject(err));
  });
