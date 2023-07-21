import { exec } from 'child_process';
import { createWriteStream } from 'fs';
import gm from 'gm';
import { IncomingHttpHeaders } from 'http';
import https from 'https';
import path from 'path';

import { clearFileName } from './fs';
import { textToSlug } from './str';

/**
 * Download
 */

export const downloadFileToFolder = (
  url: string,
  fileTitle: string,
  downloadFolderPath: string,
): Promise<{ filePath: string; fileName: string; fileExt?: string }> =>
  new Promise((resolve, reject) => {
    https
      .get(url, response => {
        const { headers } = response;
        const fileExt = headersToFileExt(headers);
        const fileName = fileExt ? `${fileTitle}.${fileExt}` : fileTitle;
        const filePath = path.join(downloadFolderPath, fileName);

        const file = createWriteStream(filePath);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve({ filePath, fileName, fileExt });
        });
      })
      .on('error', err => {
        reject(err);
      });
  });

const headersToFileExt = (headers: IncomingHttpHeaders): string | undefined => {
  const contentType = headers['content-type'];
  if (!contentType) return;
  const ext = contentType.split('/').pop();
  if (ext === 'jpeg') return 'jpg';
  if (ext === 'quicktime') return 'mov';
  return ext;
};

/**
 * Video
 */

// You can stream copy if the MOV file contains video and audio that is compatible with MP4:
// ffmpeg -i input.mov -c copy -movflags +faststart  output.mp4
// This will convert the MOV to H.264 video and AAC audio:
// ffmpeg -i input.mov -c:v libx264 -c:a aac -vf format=yuv420p -movflags +faststart output.mp4
export const convertVideo = async (inputFile: string, outputFile: string): Promise<void> =>
  new Promise((resolve, reject) => {
    exec(`ffmpeg -i "${inputFile}" -c copy -movflags +faststart  "${outputFile}"`, (err, stdout, stderr) => {
      if (err) return reject(stderr);
      return resolve();
    });
  });

export const createVideoScreenshot = async (inputFile: string, outputFile: string): Promise<void> =>
  new Promise((resolve, reject) => {
    exec(`ffmpeg -i "${inputFile}" -ss 00:00:01 -vframes 1 "${outputFile}"`, (err, stdout, stderr) => {
      if (err) return reject(stderr);
      return resolve();
    });
  });

/**
 * Images
 */

const GraphicsMagick = gm.subClass({ imageMagick: true });

export const convertImage = async (inputFile: string, outputFile: string): Promise<void> =>
  new Promise((resolve, reject) => {
    GraphicsMagick(inputFile).write(outputFile, err => (err ? reject(err) : resolve()));
  });

/**
 * Utils
 */

export const assetTitleToFileTitle = (title: string, url: string): string => {
  const urlFileName = clearFileName(path.basename(url)); // some-photo.jpeg
  const urlExt = path.extname(urlFileName).replace('.', ''); // jpg or ''
  let mod = textToSlug(title);
  // Remove extension from title
  if (urlExt) mod = mod.replace(new RegExp(`${urlExt}$`), '');
  // Clear file name
  mod = clearFileName(mod);
  return `${mod}`;
};
