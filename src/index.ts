import { OptionValues, program } from 'commander';
import { copyFileSync, existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';

import {
  AssetEntry,
  assetTitleToFileTitle,
  clearContent,
  clearFileName,
  convertImage,
  convertVideo,
  createVideoScreenshot,
  downloadFileToFolder,
  getFileHash,
  getFrontMatter,
  getImageEntries,
  getPdfEntries,
  getVideoEntries,
  isErr,
  isFileExists,
  isStr,
  listFilesInFolder,
  log,
  md5,
  MdFileData,
  MdFileDataCover,
  mkdirp,
  modGalleryBlocks,
  modMediaCaptions,
  modYoutubeEmbeds as modYoutubeEntries,
  removeMarkdown,
  textToSlug,
} from './utils';

// =====================
// Import
// =====================

const readMdFielData = (filePath: string): MdFileData | undefined => {
  let content = readFileSync(filePath, 'utf8');
  if (!content) return undefined;
  const fileTitle = path.parse(filePath).name;
  // Title
  let title: string | undefined;
  // H1 title
  const h1TitleMatch = /^# (.+?)\n/g.exec(content);
  if (h1TitleMatch) {
    title = removeMarkdown(h1TitleMatch[1]);
    content = content.replace(h1TitleMatch[0], '');
  }
  // Frontmatter title
  const frontmatterTitleMatch = /> Title: (.+?)\n/g.exec(content);
  if (frontmatterTitleMatch) {
    title = removeMarkdown(frontmatterTitleMatch[1]);
    content = content.replace(frontmatterTitleMatch[0], '');
  }
  // Date
  let date: Date | undefined;
  const dateMatch = /> Date: (.+?)\n/g.exec(content);
  if (dateMatch) {
    const dateStr = dateMatch[1];
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      date = parsedDate;
      content = content.replace(dateMatch[0], '');
    }
  }
  // Category
  let categories: string[] | undefined;
  const categoriesMatch = /> Category: (.+?)\n/g.exec(content);
  if (categoriesMatch) {
    categories = categoriesMatch[1].split(',').map(t => t.trim());
    content = content.replace(categoriesMatch[0], '');
  }
  // Tags
  let tags: string[] | undefined;
  const tagsMatch = /> Tags: (.+?)\n/g.exec(content);
  if (tagsMatch) {
    tags = tagsMatch[1].split(',').map(t => t.trim());
    content = content.replace(tagsMatch[0], '');
  }
  // Series
  let series: string[] | undefined;
  const seriesMatch = /> Series: (.+?)\n/g.exec(content);
  if (seriesMatch) {
    series = seriesMatch[1].split(',').map(t => t.trim());
    content = content.replace(seriesMatch[0], '');
  }
  // Language
  let lang: string | undefined;
  const langMatch = /> Language: (.+?)\n/g.exec(content);
  if (langMatch) {
    lang = langMatch[1].trim().toLocaleLowerCase();
    if (lang === 'ua') lang = 'uk';
    content = content.replace(langMatch[0], '');
  }
  // Slug
  const titleSlug = textToSlug(title ? title : fileTitle);
  let paramsSlug: string | undefined;
  const paramsSlugMatch = /> Slug: (.+?)\n/g.exec(content);
  if (paramsSlugMatch) {
    paramsSlug = paramsSlugMatch[1];
    content = content.replace(paramsSlugMatch[0], '');
  }
  const slug = paramsSlug ? paramsSlug : titleSlug;
  // Draft
  let draft: boolean = false;
  const draftMatch = /> Draft: (.+?)\n/g.exec(content);
  if (draftMatch) {
    draft = draftMatch[1] === 'true';
    content = content.replace(draftMatch[0], '');
  }
  // Original
  let original: string | undefined;
  const originalMatch = /> Original: (.+?)\n/g.exec(content);
  if (originalMatch) {
    original = originalMatch[1];
    content = content.replace(originalMatch[0], '');
  }
  // ShowToc
  let showToc: boolean | undefined;
  const showTocMatch = /> ShowToc: (.+?)\n/g.exec(content);
  if (showTocMatch) {
    showToc = showTocMatch[1] === 'true';
    content = content.replace(showTocMatch[0], '');
  }
  // TocOpen
  let tocOpen: boolean | undefined;
  const tocOpenMatch = /> TocOpen: (.+?)\n/g.exec(content);
  if (tocOpenMatch) {
    tocOpen = tocOpenMatch[1] === 'true';
    content = content.replace(tocOpenMatch[0], '');
  }
  // Social
  let social: string | undefined;
  const socialMatch = /> Social: (.+?)\n/g.exec(content);
  if (socialMatch) {
    social = socialMatch[1];
    content = content.replace(socialMatch[0], '');
  }
  // Clear
  content = clearContent(content);
  // Format content
  content = modMediaCaptions(content);
  // Cover
  let cover: MdFileDataCover | undefined;
  const coverMatch = contentToCover(content);
  if (coverMatch) {
    cover = coverMatch.data;
    content = coverMatch.content;
  }
  // Final clear
  content = clearContent(content);
  return {
    slug,
    title,
    content,
    date,
    categories,
    series,
    lang,
    tags,
    cover,
    original,
    draft,
    social,
    showToc,
    tocOpen,
  };
};

/**
 * Extract first image from content and return it as cover
 * @param content - Markdown content
 * @returns - Cover data and content without cover
 */
const contentToCover = (content: string): { data: MdFileDataCover; content: string } | undefined => {
  const lines = content.split('\n');
  if (!lines.length) return undefined;
  const imgReg = /!\[[^\]]*\]\((.*?)\s*("(?:.*[^"])")?\s*\)/g;
  const imgMatch = imgReg.exec(lines[0]);
  if (!imgMatch) return undefined;
  const image = imgMatch[1];
  let caption: string | undefined;
  if (imgMatch[2]) {
    caption = imgMatch[2].replace(/"/g, '');
  }
  const newContent = lines.slice(1).join('\n');
  return { data: { image, caption }, content: newContent };
};

// =====================
// Export
// =====================

const createPostWithMdData = async (data: MdFileData, opts: CliOptions): Promise<string> => {
  const postFolderPath = path.join(opts.distPath, data.slug);
  const filePath = path.join(postFolderPath, data.lang ? `index.${data.lang}.md` : 'index.md');
  // Create folder
  mkdirp(postFolderPath);
  mkdirp(path.join(postFolderPath, 'assets'));
  // Dowload cover
  if (data.cover) {
    const assetsFolder = path.join(postFolderPath, 'assets');
    const { fileName } = await downloadAsset(data.cover.image, data.cover.caption || '', assetsFolder, opts);
    data.cover.image = `assets/${fileName}`;
  }
  // Get content
  let content = data.content;
  // Download assets
  content = await downloadPostAssets(content, postFolderPath, opts);
  // Post process content after assets download
  content = modYoutubeEntries(content);
  content = modGalleryBlocks(content);
  content = await modVideoEntries(content, postFolderPath, opts);
  // Add frontmatter to content
  const frontMatter = getFrontMatter(data);
  content = frontMatter + '\n\n' + content;
  // Write file
  writeFileSync(filePath, content);
  return filePath;
};

// Download asssets with folder
const downloadPostAssets = async (content: string, folderPath: string, opts: CliOptions): Promise<string> => {
  let mod = content;
  const assetsFolder = path.join(folderPath, 'assets');
  mkdirp(assetsFolder);
  const assetEntries: AssetEntry[] = [...getImageEntries(mod), ...getPdfEntries(mod), ...getVideoEntries(mod)];
  for (const entry of assetEntries) {
    const { fileName } = await downloadAsset(entry.url, entry.caption, assetsFolder, opts);
    mod = mod.replace(entry.url, `assets/${fileName}`);
  }
  return mod;
};

// Download file to folder

const downloadAsset = async (
  url: string,
  title: string | undefined,
  assetsFolder: string,
  opts: CliOptions,
): Promise<{ fileName: string }> => {
  // File name extracted from url
  const urlFileName = clearFileName(path.basename(url)); // some-photo.jpeg
  // Use passed title if it is possible
  const fileTitle = !!title ? assetTitleToFileTitle(title, url) : path.parse(urlFileName).name; // some-photo
  // Chek if file exists
  const exAssetsFolderFiles = listFilesInFolder(assetsFolder);
  const exAssetsFilePath = exAssetsFolderFiles.find(name => name.includes(fileTitle));
  if (exAssetsFilePath) {
    const fileName = path.basename(exAssetsFilePath);
    log.debug('File exists already: ', fileName);
    return { fileName };
  }
  // Check if file exists in cache
  const cacheFileTitle = md5(url);
  const exCacheFiles = listFilesInFolder(opts.cachePath);
  const exCacheFilePath = exCacheFiles.find(name => name.includes(cacheFileTitle));
  if (exCacheFilePath) {
    // Gettitn file extension which was was found at the cache
    const exChacheFileExt = path.extname(exCacheFilePath).replace('.', '');
    // And use it for the new file
    const fileName = exChacheFileExt ? `${fileTitle}.${exChacheFileExt}` : fileTitle;
    const filePath = path.join(assetsFolder, fileName);
    log.debug('File found at the cache: ', fileName);
    copyFileSync(exCacheFilePath, filePath);
    return { fileName };
  }
  // Download file
  log.info('Downloading asset: ', url);
  const downloadRes = await downloadFileToFolder(url, cacheFileTitle, opts.cachePath);
  let newCacheFileExt = downloadRes.fileExt;
  let newCacheFilePath = downloadRes.filePath;

  // Convert tiff to jpg
  if (!!newCacheFileExt && ['tiff', 'tif', 'octet-stream'].includes(newCacheFileExt)) {
    const cacheFileConvPath = path.join(opts.cachePath, `${cacheFileTitle}.jpg`);
    await convertImage(newCacheFilePath, cacheFileConvPath);
    unlinkSync(newCacheFilePath);
    newCacheFileExt = 'jpg';
    newCacheFilePath = cacheFileConvPath;
  }

  const fileName = `${fileTitle}.${newCacheFileExt}`;
  const filePath = path.join(assetsFolder, fileName);
  copyFileSync(newCacheFilePath, filePath);
  return { fileName };
};

// =====================
// Video
// =====================

const modVideoEntries = async (content: string, postFolderPath: string, opts: CliOptions): Promise<string> => {
  let mod = content;
  const entries = getVideoEntries(content);
  for (const entry of entries) {
    const { formats, caption, url } = entry;
    const assetPath = path.join(postFolderPath, url);
    const props: string[] = [];
    if (formats.mov) {
      props.push(`mov="${formats.mov}"`);
    } else {
      const movFilePath = await convertVideoAsset(assetPath, 'mov', opts);
      const mov = path.relative(postFolderPath, movFilePath);
      props.push(`mov="${mov}"`);
    }
    if (formats.mp4) {
      props.push(`mp4="${formats.mp4}"`);
    } else {
      const mp4FilePath = await convertVideoAsset(assetPath, 'mp4', opts);
      const mp4 = path.relative(postFolderPath, mp4FilePath);
      props.push(`mp4="${mp4}"`);
    }
    // Poster
    const posterFilePath = await getVideoPoster(assetPath, opts);
    props.push(`poster="${path.relative(postFolderPath, posterFilePath)}"`);
    // Caption
    if (caption) props.push(`caption="${caption}"`);
    const video = `{{< video ${props.join(' ')} >}}`;
    mod = mod.replace(entry.raw, video);
  }
  return mod;
};

const convertVideoAsset = async (inputFilePath: string, format: string, opts: CliOptions): Promise<string> => {
  const inputFileExt = path.extname(inputFilePath).replace('.', '');
  const inputFileName = path.basename(inputFilePath, `.${inputFileExt}`);
  const inputFileFolderPath = path.dirname(inputFilePath);
  const inputFileHash = await getFileHash(inputFilePath);
  const outputFilePath = path.join(inputFileFolderPath, `${inputFileName}.${format}`);
  if (existsSync(outputFilePath)) {
    log.debug('Converted video asset founded: ', inputFilePath, format);
    return outputFilePath;
  }
  const cacheFilePath = path.join(opts.cachePath, `${inputFileHash}.${format}`);
  if (!existsSync(cacheFilePath)) {
    log.debug('Converting video asset: ', inputFilePath, format);
    await convertVideo(inputFilePath, cacheFilePath);
  } else {
    log.debug('Converted video asset founded at cache: ', inputFilePath, format);
  }
  copyFileSync(cacheFilePath, outputFilePath);
  return outputFilePath;
};

const getVideoPoster = async (inputFilePath: string, opts: CliOptions): Promise<string> => {
  const inputFileExt = path.extname(inputFilePath).replace('.', ''); // mp4
  const inputFileName = path.basename(inputFilePath, `.${inputFileExt}`); // video
  const inputFileFolderPath = path.dirname(inputFilePath); // /path/to/post
  const inputFileHash = await getFileHash(inputFilePath); // 1234567890
  const outputFilePath = path.join(inputFileFolderPath, `${inputFileName}.jpg`); // /path/to/post/video.jpg
  if (existsSync(outputFilePath)) {
    log.debug('Video poster found: ', outputFilePath);
    return outputFilePath;
  }
  const cacheFilePath = path.join(opts.cachePostersPath, `${inputFileHash}.jpg`); // /path/to/cache/1234567890.jpg
  if (!existsSync(cacheFilePath)) {
    log.debug('Creating video poster: ', inputFilePath);
    await createVideoScreenshot(inputFilePath, cacheFilePath);
  } else {
    log.debug('Video poster founded at cache');
  }
  copyFileSync(cacheFilePath, outputFilePath);
  return outputFilePath;
};

// =====================
// CLI
// =====================

program
  .name('craft-content')
  .description(DESCRIPTION)
  .version(VERSION, '-v, --version', 'output the current version')
  .option('-s, --src <src>', 'source folder', 'craft')
  .option('-d, --dist <dist>', 'destination folder', 'content')
  .option('-c, --cache <cache>', 'cache folder', '.cache')
  .option('--debug', 'output extra debugging');

program.parse(process.argv);

interface CliOptions {
  srcPath: string;
  distPath: string;
  cachePath: string;
  cachePostersPath: string;
}

const prepareOptions = (opts: OptionValues): CliOptions => {
  const srcPath = path.join(__dirname, isStr(opts.src) ? opts.src : 'craft');
  const distPath = path.join(__dirname, isStr(opts.dist) ? opts.dist : 'content');
  const cachePath = path.join(__dirname, isStr(opts.cache) ? opts.cache : '.cache');
  const cachePostersPath = path.join(cachePath, 'posters');
  return { srcPath, distPath, cachePath, cachePostersPath };
};

const run = async (inputOpts: OptionValues) => {
  log.info('Start import');
  const opts = prepareOptions(inputOpts);
  // Source
  log.info('Source path:', opts.srcPath);
  if (!isFileExists(opts.srcPath)) throw new Error('Source folder not found');
  // Destination
  log.info('Destination path:', opts.distPath);
  mkdirp(opts.distPath);
  // Cache
  log.info('Cache path:', opts.cachePath);
  mkdirp(opts.cachePath);
  mkdirp(opts.cachePostersPath);

  const filePaths = listFilesInFolder(opts.srcPath, ['md']);
  if (!filePaths.length) throw new Error('No files to import found');
  log.info('Files found:', filePaths.length);
  for (const filePath of filePaths) {
    log.info('Processing file:', filePath);
    const data = readMdFielData(filePath);
    if (data) {
      const newFilePath = await createPostWithMdData(data, opts);
      log.info('File processed:', newFilePath);
    } else {
      log.err('File parsing error:', filePath);
    }
  }
  log.info('Done');
};

run(program.opts()).catch(err => (isErr(err) ? log.err(err.message) : log.err(err)));
