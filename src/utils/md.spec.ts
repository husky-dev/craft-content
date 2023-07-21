/* eslint-disable max-len */
import { describe, expect, test } from '@jest/globals';
import { VideoEntry, getVideoEntries, modMediaCaptions, modYoutubeEmbeds } from './md';

const youtubeEmbededContent = `

[Мег Джей: Чому 30 - це не нові 20? (TED Talks)](https://www.youtube.com/watch?v=CPAjeQFygjQ)

`;

const youtubeEmbededExpected = `

{{< youtube id="CPAjeQFygjQ" title="Мег Джей: Чому 30 - це не нові 20? (TED Talks)" >}}

`;

describe('modYoutubeEmbeds()', () => {
  test('it should replace a youtube link with an embed', () => {
    expect(modYoutubeEmbeds(youtubeEmbededContent)).toBe(youtubeEmbededExpected);
  });

  test('it should not replace a youtube link with an embed', () => {
    expect(modYoutubeEmbeds('# Hello World')).toBe('# Hello World');
  });
});

const imgCaptionContent01 = `

![u_files_store_48_14539.jpeg](https://res.craft.do/u_files_store_48_14539.jpeg)

**Кгига “21 урок для 21-го століття” - Юваль Ної Харарі**

`;

const imgCaptionExpected01 = `

![Кгига “21 урок для 21-го століття” - Юваль Ної Харарі](https://res.craft.do/u_files_store_48_14539.jpeg "Кгига “21 урок для 21-го століття” - Юваль Ної Харарі")

`;

describe('modImageCaptions()', () => {
  test('it should replace a captioned image with a captioned image', () => {
    expect(modMediaCaptions(imgCaptionContent01)).toBe(imgCaptionExpected01);
  });

  test('it should not replace a captioned image with a captioned image', () => {
    expect(modMediaCaptions('# Hello World')).toBe('# Hello World');
  });
});

const videoContent01 = `[IMG_1549.mov](https://res.craft.do/IMG_1549.mov)`;

const videoExpected01: VideoEntry[] = [
  {
    raw: '[IMG_1549.mov](https://res.craft.do/IMG_1549.mov)',
    url: 'https://res.craft.do/IMG_1549.mov',
    caption: 'IMG_1549.mov',
    formats: {
      mov: 'https://res.craft.do/IMG_1549.mov',
    },
  },
];

const videoContent02 = `[IMG_1549.mov](https://res.craft.do/IMG_1549.mov "Hello world")`;

const videoExpected02: VideoEntry[] = [
  {
    raw: `[IMG_1549.mov](https://res.craft.do/IMG_1549.mov "Hello world")`,
    url: 'https://res.craft.do/IMG_1549.mov',
    caption: 'Hello world',
    formats: {
      mov: 'https://res.craft.do/IMG_1549.mov',
    },
  },
];

const videoContent03 = `[IMG_1549.mp4](https://res.craft.do/IMG_1549.mp4)`;

const videoExpected03: VideoEntry[] = [
  {
    raw: '[IMG_1549.mp4](https://res.craft.do/IMG_1549.mp4)',
    url: 'https://res.craft.do/IMG_1549.mp4',
    caption: 'IMG_1549.mp4',
    formats: {
      mp4: 'https://res.craft.do/IMG_1549.mp4',
    },
  },
];

describe('extractVideoEntries()', () => {
  test('it should extract video entries', () => {
    expect(getVideoEntries(videoContent01)).toEqual(videoExpected01);
    expect(getVideoEntries(videoContent02)).toEqual(videoExpected02);
    expect(getVideoEntries(videoContent03)).toEqual(videoExpected03);
  });

  test('it should not extract video entries', () => {
    expect(getVideoEntries('# Hello World')).toEqual([]);
  });
});
