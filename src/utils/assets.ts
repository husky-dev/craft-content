import { exec } from 'child_process';
import { copyFileSync, createWriteStream, existsSync, unlinkSync } from 'fs';
import gm from 'gm';
import { IncomingHttpHeaders } from 'http';
import https from 'https';
import path from 'path';

import { clearFileName, getFileHash, listFilesInFolder, mkdirp } from './fs';
import { log } from './log';
import { md5, textToSlug } from './str';

export const checkAssetsCacheFodler = (cacheFolderPath: string) => {
  mkdirp(cacheFolderPath);
};

/**
 * Download
 */

interface DownloadFileToAssetFolderConf {
  url: string;
  title?: string;
  assetsFolderPath: string;
  cacheFolderPath: string;
}

export const downloadFileToAssetFolder = async (config: DownloadFileToAssetFolderConf) => {
  const { url, title, assetsFolderPath, cacheFolderPath } = config;
  const urlHash = md5(url); // asdf
  const fileTitle = urlToFileTitle(url, title); // some-photo
  // Chek if file exists already at assets folder
  const exAssetsFolderFiles = listFilesInFolder(assetsFolderPath);
  const exAssetsFilePath = exAssetsFolderFiles.find(name => name.includes(fileTitle));
  if (exAssetsFilePath) {
    const fileName = path.basename(exAssetsFilePath);
    log.debug('File exists already: ', fileName);
    return { fileName };
  }
  // Check if file exists in cache
  const exCacheFiles = listFilesInFolder(cacheFolderPath);
  const exCacheFilePath = exCacheFiles.find(name => name.includes(urlHash));
  if (exCacheFilePath) {
    // Gettitn file extension which was was found at the cache
    const exChacheFileExt = path.extname(exCacheFilePath).replace('.', '');
    // And use it for the new file
    const fileName = exChacheFileExt ? `${fileTitle}.${exChacheFileExt}` : fileTitle;
    const filePath = path.join(assetsFolderPath, fileName);
    log.debug('File found at the cache: ', fileName);
    copyFileSync(exCacheFilePath, filePath);
    return { fileName };
  }
  // Download file
  log.info('Downloading asset: ', url);
  const downloads = await downloadFileToFolder(url, urlHash, cacheFolderPath);
  let newCacheFileExt = downloads.fileExt;
  let newCacheFilePath = downloads.filePath;

  // Convert tiff to jpg
  if (!!newCacheFileExt && ['tiff', 'tif', 'octet-stream'].includes(newCacheFileExt)) {
    const cacheFileConvPath = path.join(cacheFolderPath, `${urlHash}.jpg`);
    await convertImage(newCacheFilePath, cacheFileConvPath);
    unlinkSync(newCacheFilePath);
    newCacheFileExt = 'jpg';
    newCacheFilePath = cacheFileConvPath;
  }

  const fileName = `${fileTitle}.${newCacheFileExt}`;
  const filePath = path.join(assetsFolderPath, fileName);
  copyFileSync(newCacheFilePath, filePath);
  return { fileName };
};

// Converts URL to file title like some-photo-asdf
const urlToFileTitle = (url: string, title?: string): string => {
  const urlHash = md5(url).slice(0, 4);
  const urlFileName = clearFileName(path.basename(url)); // some-photo.jpeg
  const urlExt = path.extname(urlFileName).replace('.', ''); // jpg or ''
  // Title provided
  if (title) {
    let mod = textToSlug(title);
    // Remove extension from title, like JPG
    if (urlExt) mod = mod.replace(new RegExp(`${urlExt}$`), '');
    // Clear file name
    mod = clearFileName(mod);
    return `${mod}-${urlHash}`;
  }
  const urlFileTitle = path.parse(urlFileName).name; // some-photo
  return `${urlFileTitle}-${urlHash}`;
};

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

export const convertVideoAsset = async (
  inputFilePath: string,
  format: string,
  assetsCacheFilderPath: string,
): Promise<string> => {
  const inputFileExt = path.extname(inputFilePath).replace('.', '');
  const inputFileName = path.basename(inputFilePath, `.${inputFileExt}`);
  const inputFileFolderPath = path.dirname(inputFilePath);
  const inputFileHash = await getFileHash(inputFilePath);
  const outputFilePath = path.join(inputFileFolderPath, `${inputFileName}.${format}`);
  if (existsSync(outputFilePath)) {
    log.debug('Converted video asset founded: ', inputFilePath, format);
    return outputFilePath;
  }
  const cacheFilePath = path.join(assetsCacheFilderPath, `${inputFileHash}.${format}`);
  if (!existsSync(cacheFilePath)) {
    log.debug('Converting video asset: ', inputFilePath, format);
    await convertVideo(inputFilePath, cacheFilePath);
  } else {
    log.debug('Converted video asset founded at cache: ', inputFilePath, format);
  }
  copyFileSync(cacheFilePath, outputFilePath);
  return outputFilePath;
};

export const getVideoPoster = async (inputFilePath: string, assetsCacheFilderPath: string): Promise<string> => {
  const inputFileExt = path.extname(inputFilePath).replace('.', ''); // mp4
  const inputFileName = path.basename(inputFilePath, `.${inputFileExt}`); // video
  const inputFileFolderPath = path.dirname(inputFilePath); // /path/to/post
  const inputFileHash = await getFileHash(inputFilePath); // 1234567890
  const shortInputFileHash = inputFileHash.slice(0, 4); // 1234
  const outputFilePath = path.join(inputFileFolderPath, `${inputFileName}-${shortInputFileHash}.jpg`); // /path/to/post/video.jpg
  if (existsSync(outputFilePath)) {
    log.debug('Video poster found: ', outputFilePath);
    return outputFilePath;
  }
  // eslint-disable-next-line max-len
  const cacheFilePath = path.join(assetsCacheFilderPath, `${inputFileHash}.jpg`); // /path/to/cache/1234567890.jpg
  if (!existsSync(cacheFilePath)) {
    log.debug('Creating video poster: ', inputFilePath);
    await createVideoScreenshot(inputFilePath, cacheFilePath);
  } else {
    log.debug('Video poster founded at cache');
  }
  copyFileSync(cacheFilePath, outputFilePath);
  return outputFilePath;
};

// You can stream copy if the MOV file contains video and audio that is compatible with MP4:
// ffmpeg -i input.mov -c copy -movflags +faststart  output.mp4
// This will convert the MOV to H.264 video and AAC audio:
// ffmpeg -i input.mov -c:v libx264 -c:a aac -vf format=yuv420p -movflags +faststart output.mp4
const convertVideo = async (inputFile: string, outputFile: string): Promise<void> =>
  new Promise((resolve, reject) => {
    exec(`ffmpeg -i "${inputFile}" -c copy -movflags +faststart  "${outputFile}"`, (err, stdout, stderr) => {
      if (err) return reject(stderr);
      return resolve();
    });
  });

const createVideoScreenshot = async (inputFile: string, outputFile: string): Promise<void> =>
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
