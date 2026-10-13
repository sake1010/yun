export const SUPPORTED = ['zh-TW', 'zh-CN', 'en', 'ko', 'ja'] as const;
export type LanguageCode = (typeof SUPPORTED)[number];

/** 瀏覽器語言 -> 我們支援的五種之一。不是這五種就用英文。 */
export function pickFromBrowser(languages: readonly string[]): LanguageCode {
  for (const raw of languages) {
    const tag = raw.toLowerCase();
    if (tag.startsWith('zh')) {
      if (/^zh([-_]hans|[-_]cn|[-_]sg)/.test(tag)) return 'zh-CN';
      return 'zh-TW';
    }
    if (tag.startsWith('ko')) return 'ko';
    if (tag.startsWith('ja')) return 'ja';
    if (tag.startsWith('en')) return 'en';
  }
  return 'en';
}
