import { OptionValues, program } from 'commander';
import { writeFileSync } from 'fs';
import path from 'path';

import {
  AssetEntry,
  checkAssetsCacheFodler,
  convertVideoAsset,
  downloadFileToAssetFolder,
  generateFrontMatter,
  getImageEntries,
  getPdfEntries,
  getVideoEntries,
  getVideoPoster,
  isErr,
  isFileExists,
  isStr,
  listFilesInFolder,
  log,
  MarkdownFileMeta,
  mkdirp,
  modGalleryBlocks,
  modYoutubeEmbeds as modYoutubeEntries,
  parseMarkdownFile,
} from './utils';

const createPostWithMdData = async (data: MarkdownFileMeta, opts: CliOptions): Promise<string> => {
  const postFolderPath = path.join(opts.distPath, data.slug);
  const filePath = path.join(postFolderPath, data.lang ? `index.${data.lang}.md` : 'index.md');
  // Create folder
  mkdirp(postFolderPath);
  mkdirp(path.join(postFolderPath, 'assets'));
  // Dowload cover
  if (data.cover) {
    const assetsFolderPath = path.join(postFolderPath, 'assets');
    const { fileName } = await downloadFileToAssetFolder({
      url: data.cover.image,
      title: data.cover.caption,
      assetsFolderPath,
      cacheFolderPath: opts.cachePath,
    });
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
  const frontMatter = generateFrontMatter(data);
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
    const { fileName } = await downloadFileToAssetFolder({
      url: entry.url,
      title: entry.caption,
      assetsFolderPath: assetsFolder,
      cacheFolderPath: opts.cachePath,
    });
    mod = mod.replace(entry.url, `assets/${fileName}`);
  }
  return mod;
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
      const movFilePath = await convertVideoAsset(assetPath, 'mov', opts.cachePath);
      const mov = path.relative(postFolderPath, movFilePath);
      props.push(`mov="${mov}"`);
    }
    if (formats.mp4) {
      props.push(`mp4="${formats.mp4}"`);
    } else {
      const mp4FilePath = await convertVideoAsset(assetPath, 'mp4', opts.cachePath);
      const mp4 = path.relative(postFolderPath, mp4FilePath);
      props.push(`mp4="${mp4}"`);
    }
    // Poster
    const posterFilePath = await getVideoPoster(assetPath, opts.cachePath);
    props.push(`poster="${path.relative(postFolderPath, posterFilePath)}"`);
    // Caption
    if (caption) props.push(`caption="${caption}"`);
    const video = `{{< video ${props.join(' ')} >}}`;
    mod = mod.replace(entry.raw, video);
  }
  return mod;
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
}

const prepareOptions = (opts: OptionValues): CliOptions => {
  const curDir = process.cwd();
  const srcPath = path.join(curDir, isStr(opts.src) ? opts.src : 'craft');
  const distPath = path.join(curDir, isStr(opts.dist) ? opts.dist : 'content');
  const cachePath = path.join(curDir, isStr(opts.cache) ? opts.cache : '.cache');
  return { srcPath, distPath, cachePath };
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
  checkAssetsCacheFodler(opts.cachePath);

  const filePaths = listFilesInFolder(opts.srcPath, ['md']);
  if (!filePaths.length) throw new Error('No files to import found');
  log.info('Files found:', filePaths.length);
  for (const filePath of filePaths) {
    log.info('Processing file:', filePath);
    const data = parseMarkdownFile(filePath);
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
