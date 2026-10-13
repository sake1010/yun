import { describe, expect, it } from 'vitest';
import { pickFromBrowser } from './detect';
import zhTW from './zh-TW.json';
import zhCN from './zh-CN.json';
import en from './en.json';
import ko from './ko.json';
import ja from './ja.json';

function keys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('pickFromBrowser', () => {
  it('依瀏覽器語言選五種之一', () => {
    expect(pickFromBrowser(['zh-TW'])).toBe('zh-TW');
    expect(pickFromBrowser(['zh-HK'])).toBe('zh-TW');
    expect(pickFromBrowser(['zh-Hant'])).toBe('zh-TW');
    expect(pickFromBrowser(['zh-CN'])).toBe('zh-CN');
    expect(pickFromBrowser(['zh-SG'])).toBe('zh-CN');
    expect(pickFromBrowser(['zh-Hans-CN'])).toBe('zh-CN');
    expect(pickFromBrowser(['ko-KR'])).toBe('ko');
    expect(pickFromBrowser(['ja'])).toBe('ja');
    expect(pickFromBrowser(['en-US'])).toBe('en');
  });
  it('不在五種之內就用英文', () => {
    expect(pickFromBrowser(['fr-FR'])).toBe('en');
    expect(pickFromBrowser([])).toBe('en');
  });
  it('依偏好順序,第一個支援的優先', () => {
    expect(pickFromBrowser(['fr', 'ja', 'en'])).toBe('ja');
  });
});

describe('翻譯檔', () => {
  it('五種語言的文字項目完全一致', () => {
    const base = keys(zhTW).sort();
    for (const [name, dict] of Object.entries({ zhCN, en, ko, ja })) {
      expect(keys(dict).sort(), name).toEqual(base);
    }
  });
});
