import { readFileSync } from 'fs';
import { isUndef } from './types';
import path from 'path';
import { clearContent, clearMarkdownSyntax, textToSlug } from './str';

/**
 * Parse markdown file
 */

export interface MarkdownFileMeta {
  slug: string;
  date?: Date;
  title?: string;
  lang?: string;
  original?: string;
  draft?: boolean;
  cover?: MarkdownFileCover;
  series?: string[];
  categories?: string[];
  tags?: string[];
  content: string;
  social?: string;
  showToc?: boolean;
  tocOpen?: boolean;
}

export interface MarkdownFileCover {
  image: string;
  caption?: string;
}

export const parseMarkdownFile = (filePath: string): MarkdownFileMeta | undefined => {
  let content = readFileSync(filePath, 'utf8');
  if (!content) return undefined;
  const fileTitle = path.parse(filePath).name;
  // Title
  let title: string | undefined;
  // H1 title
  const h1TitleMatch = /^# (.+?)\n/g.exec(content);
  if (h1TitleMatch) {
    title = clearMarkdownSyntax(h1TitleMatch[1]);
    content = content.replace(h1TitleMatch[0], '');
  }
  // Frontmatter title
  const frontmatterTitleMatch = /> Title: (.+?)\n/g.exec(content);
  if (frontmatterTitleMatch) {
    title = clearMarkdownSyntax(frontmatterTitleMatch[1]);
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
  let cover: MarkdownFileCover | undefined;
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
const contentToCover = (content: string): { data: MarkdownFileCover; content: string } | undefined => {
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

/**
 * Front matter
 */

/**
 * Returns front matter data as string
 *
 * @example
 * ---
 * title: "День первый | 🇹🇿 Поход на вершину Килиманджаро"
 * date: 2021-07-15T13:21:00+03:00
 * draft: false
 * # cover:
 * #     image: "images/weight-loss-results.jpg"
 * #     alt: "Зкидання ваги"
 * #     caption: "Трохи пропотів"
 * categories:
 *   - Travel
 *   - Kilimanjaro
 * ---
 */
export const generateFrontMatter = (data: MarkdownFileMeta): string => {
  const lines: string[] = ['---'];
  if (data.title) {
    lines.push(`title: "${data.title}"`);
  }
  if (data.date) {
    lines.push(`date: ${data.date.toISOString()}`);
  }
  if (data.categories) {
    lines.push(`categories:`);
    for (const category of data.categories) {
      lines.push(`  - ${category.toLocaleLowerCase()}`);
    }
  }
  if (data.tags) {
    lines.push(`tags:`);
    for (const tag of data.tags) {
      lines.push(`  - ${tag.toLocaleLowerCase()}`);
    }
  }
  if (data.series) {
    lines.push(`series:`);
    for (const itm of data.series) {
      lines.push(`  - "${itm}"`);
    }
  }
  if (data.cover) {
    lines.push('cover:');
    lines.push(`  image: "${data.cover.image}"`);
    if (data.cover.caption) {
      lines.push(`  caption: "${data.cover.caption}"`);
    }
    lines.push(`  relative: true`);
  }
  if (!isUndef(data.showToc)) {
    lines.push(`ShowToc: ${data.showToc}`);
  }
  if (!isUndef(data.tocOpen)) {
    lines.push(`TocOpen: ${data.tocOpen}`);
  }
  if (data.draft) {
    lines.push(`draft: true`);
  } else {
    lines.push(`draft: false`);
  }
  lines.push('---');
  return lines.join('\n');
};

/**
 * YouTube
 */

export const modYoutubeEmbeds = (content: string): string => {
  const reg = /\n\[(.*?)\]\((?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})\)\n/g;
  const matches = content.matchAll(reg);
  let mod = content;
  for (const match of matches) {
    const title = match[1];
    const id = match[2];
    const newEmbed = `\n{{< youtube id="${id}" title="${title}" >}}\n`;
    mod = mod.replace(match[0], newEmbed);
  }
  return mod;
};

/**
 * Assets
 */

export interface AssetEntry {
  raw: string;
  url: string;
  caption?: string;
}

/**
 * Images
 */

/**
 * Get media caption like **Caption** below the media code and add it
 * to the media code as title attribute
 */
export const modMediaCaptions = (content: string): string => {
  let mod = content;
  const mediaWithCaptionReg = /(!*)\[[^\]]*\]\((.*?)\s*("(?:.*[^"])")?\s*\)\n+\*\*(.+?)\*\*/g;
  const matches = mod.matchAll(mediaWithCaptionReg);
  for (const match of matches) {
    const isImg = match[0].startsWith('!'); // image or video
    const src = match[2];
    const caption = match[4].replace(/"/g, '');
    const newCode = isImg ? `![${caption}](${src} "${caption}")` : `[${caption}](${src} "${caption}")`;
    mod = mod.replace(match[0], newCode);
  }
  return mod;
};

export type ImageEntry = AssetEntry;

export const getImageEntries = (md: string): ImageEntry[] => {
  const reg = /!\[([^\]]*)\]\((.*?)\s*("(?:.*[^"])")?\s*\)/g;
  const matches = md.matchAll(reg);
  const items: ImageEntry[] = [];
  for (const match of matches) {
    const alt = match[1];
    const url = match[2];
    const title = match[3];
    const caption = title || alt;
    const raw = match[0];
    items.push({ raw, url, caption });
  }
  return items;
};

export const modGalleryBlocks = (content: string): string => {
  const galleryBodyReg = /----([\s\S]+?)----/g;
  const matches = content.matchAll(galleryBodyReg);
  for (const match of matches) {
    const raw = match[0];
    const body = match[1];
    const images = getImageEntries(body);
    const shortcode = getGalleryShortcode(images);
    content = content.replace(raw, shortcode);
  }
  return content;
};

const getGalleryShortcode = (images: ImageEntry[]): string => {
  const lines: string[] = [];
  lines.push(`{{< gallery >}}`);
  for (const image of images) {
    lines.push(`  {{< gallery_item src="${image.url}" caption="${image.caption}" >}}`);
  }
  lines.push(`{{< /gallery >}}`);
  return lines.join('\n');
};

/**
 * PDF
 */

export type PdfEntry = AssetEntry;

export const getPdfEntries = (md: string): PdfEntry[] => {
  const reg = /\[([^\]]*)\]\((.*?.pdf)\s*("(?:.*[^"])")?\s*\)/g;
  const matches = md.matchAll(reg);
  const items: PdfEntry[] = [];
  for (const match of matches) {
    const raw = match[0];
    const alt = match[1];
    const url = match[2];
    const title = match[3] ? match[3].replace(/(^"|"$)/gm, '') : undefined;
    const caption = title || alt;
    items.push({ raw, url, caption });
  }
  return items;
};

/**
 * Video
 */

export interface VideoEntry extends AssetEntry {
  formats: {
    mov?: string;
    mp4?: string;
  };
}

export const getVideoEntries = (md: string): VideoEntry[] => {
  const reg = /\[([^\]]*)\]\((.*?.(mov|mp4))\s*("(?:.*[^"])")?\s*\)/gi;
  const matches = md.matchAll(reg);
  const items: VideoEntry[] = [];
  for (const match of matches) {
    const raw = match[0];
    const alt = match[1];
    const url = match[2];
    const ext = match[3].toLowerCase();
    const mov = ext === 'mov' ? url : undefined;
    const mp4 = ext === 'mp4' ? url : undefined;
    const title = match[4] ? match[4].replace(/(^"|"$)/gm, '') : undefined;
    const caption = title || alt;
    items.push({ raw, caption, url, formats: { mov, mp4 } });
  }
  return items;
};
