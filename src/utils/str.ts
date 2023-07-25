import crypto from 'crypto';

export const clearMarkdownSyntax = (content: string): string => {
  let mod = content;
  // Remove bold and italic
  mod = mod.replace(/\*\*(.+?)\*\*/g, '$1');
  mod = mod.replace(/\*(.+?)\*/g, '$1');
  // Remove links
  mod = mod.replace(/\[(.+?)\]\(.+?\)/g, '$1');
  // Remove images
  mod = mod.replace(/!\[(.+?)\]\(.+?\)/g, '$1');
  // Remove blockquotes
  mod = mod.replace(/^> (.+?)$/gm, '$1');
  // Remove code blocks
  mod = mod.replace(/^```(.+?)```$/gm, '$1');
  // Remove inline code
  mod = mod.replace(/`(.+?)`/g, '$1');
  // Remove extra spaces
  mod = mod.replace(/ {2,}/g, ' ');
  // Remove empty lines
  mod = mod.replace(/(?:[\t ]*(?:\r?\n|\r))+/g, '');
  return mod;
};

export const clearContent = (content: string): string => {
  let mod = content;
  // Remove empty lines at the beginning
  mod = mod.replace(/^(?:[\t ]*(?:\r?\n|\r))+/g, '');
  // Remove empty lines between paragraphs
  mod = mod.replace(/\n\n+/gm, '\n\n');
  // Remove empty lines at the end
  mod = mod.replace(/(?:[\t ]*(?:\r?\n|\r))+$/g, '');
  // Remove extra spaces
  mod = mod.replace(/ {2,}/g, ' ');
  // Add one empty line at the end
  mod = mod + '\n';
  return mod;
};

export const textToSlug = (title: string): string => {
  let mod = cyrToLat(title).toLowerCase();
  mod = mod.replace(/['’]/g, '');
  mod = mod.replace(/[^a-z0-9]/gi, '-');
  mod = mod.replace(/-+/g, '-');
  mod = mod.replace(/^-|-$/g, '');
  return mod;
};

export const cyrToLat = (str: string): string => {
  const a: Record<string, string> = {};
  a['а'] = 'a';
  a['А'] = 'A';
  a['Б'] = 'B';
  a['б'] = 'b';
  a['В'] = 'V';
  a['в'] = 'v';
  a['Г'] = 'G';
  a['г'] = 'g';
  a['Ґ'] = 'G';
  a['ґ'] = 'g';
  a['Д'] = 'D';
  a['д'] = 'd';
  a['Е'] = 'E';
  a['е'] = 'e';
  a['Ё'] = 'YO';
  a['ё'] = 'yo';
  a['є'] = 'ie';
  a['Є'] = 'Ye';
  a['Ж'] = 'ZH';
  a['ж'] = 'zh';
  a['З'] = 'Z';
  a['з'] = 'z';
  a['И'] = 'I';
  a['и'] = 'i';
  a['І'] = 'I';
  a['і'] = 'i';
  a['ї'] = 'i';
  a['Ї'] = 'Yi';
  a['Й'] = 'I';
  a['й'] = 'i';
  a['К'] = 'K';
  a['к'] = 'k';
  a['Л'] = 'L';
  a['л'] = 'l';
  a['М'] = 'M';
  a['м'] = 'm';
  a['Н'] = 'N';
  a['н'] = 'n';
  a['О'] = 'O';
  a['о'] = 'o';
  a['П'] = 'P';
  a['п'] = 'p';
  a['Р'] = 'R';
  a['р'] = 'r';
  a['С'] = 'S';
  a['с'] = 's';
  a['Т'] = 'T';
  a['т'] = 't';
  a['У'] = 'U';
  a['у'] = 'u';
  a['Ф'] = 'F';
  a['ф'] = 'f';
  a['Х'] = 'H';
  a['х'] = 'h';
  a['Ц'] = 'TS';
  a['ц'] = 'ts';
  a['Ч'] = 'CH';
  a['ч'] = 'ch';
  a['Ш'] = 'SH';
  a['ш'] = 'sh';
  a['Щ'] = 'SCH';
  a['щ'] = 'sch';
  a['Ъ'] = `'`;
  a['ъ'] = `'`;
  a['Ы'] = 'I';
  a['ы'] = 'i';
  a['Ь'] = `'`;
  a['ь'] = `'`;
  a['Э'] = 'E';
  a['э'] = 'e';
  a['Ю'] = 'YU';
  a['ю'] = 'yu';
  a['Я'] = 'Ya';
  a['я'] = 'ya';
  return str
    .split('')
    .map(char => a[char] || char)
    .join('');
};

export const firstToUpper = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

export const md5 = (str: string): string => crypto.createHash('md5').update(str).digest('hex');
