import { describe, expect, it } from 'vitest';
import { nameColorIndex } from './color';
import { fileKind } from './fileKind';
import { linkify } from './linkify';
import { nicknameKey, nicknameLength, validateNickname } from './validateNickname';

describe('validateNickname', () => {
  it('去掉前後空白後通過', () => {
    expect(validateNickname('  小明  ')).toEqual({ ok: true, value: '小明' });
  });
  it('空白或全空白不通過', () => {
    expect(validateNickname('')).toEqual({ ok: false, reason: 'empty' });
    expect(validateNickname('   ')).toEqual({ ok: false, reason: 'empty' });
  });
  it('12 字通過、13 字不通過(以字元計,表情符號算一個字)', () => {
    expect(validateNickname('一二三四五六七八九十甲乙').ok).toBe(true);
    expect(validateNickname('一二三四五六七八九十甲乙丙')).toEqual({ ok: false, reason: 'too-long' });
    expect(validateNickname('😀'.repeat(12)).ok).toBe(true);
    expect(nicknameLength('😀😀')).toBe(2);
  });
  it('換行、零寬字元、控制字元不通過', () => {
    expect(validateNickname('a\nb')).toEqual({ ok: false, reason: 'bad-char' });
    const zeroWidthSpace = String.fromCodePoint(0x200b);
    const bell = String.fromCodePoint(0x07);
    const hangulFiller = String.fromCodePoint(0x3164);
    expect(validateNickname(`a${zeroWidthSpace}b`)).toEqual({ ok: false, reason: 'bad-char' });
    expect(validateNickname(`a${bell}b`)).toEqual({ ok: false, reason: 'bad-char' });
    expect(validateNickname(hangulFiller)).toEqual({ ok: false, reason: 'bad-char' });
    // 組合式表情符號用到零寬連字,必須放行
    expect(validateNickname(`👨${String.fromCodePoint(0x200d)}👩`).ok).toBe(true);
  });
  it('英文大小寫視為相同', () => {
    expect(nicknameKey('Amy')).toBe(nicknameKey('amy'));
    expect(nicknameKey(' AMY ')).toBe('amy');
  });
});

describe('nameColorIndex', () => {
  it('同一個代號永遠同色,且落在 1 到 6', () => {
    for (const name of ['小明', 'Amy', 'amy', '😀', 'x']) {
      const c = nameColorIndex(name);
      expect(c).toBeGreaterThanOrEqual(1);
      expect(c).toBeLessThanOrEqual(6);
      expect(nameColorIndex(name)).toBe(c);
    }
    expect(nameColorIndex('Amy')).toBe(nameColorIndex('amy'));
  });
});

describe('linkify', () => {
  it('http 與 https 變成連結,其餘保持文字', () => {
    expect(linkify('看這個 https://example.com/a?b=1 好嗎')).toEqual([
      { type: 'text', value: '看這個 ' },
      { type: 'link', value: 'https://example.com/a?b=1' },
      { type: 'text', value: ' 好嗎' },
    ]);
  });
  it('網址結尾的標點不算進網址', () => {
    expect(linkify('去 https://example.com。')).toEqual([
      { type: 'text', value: '去 ' },
      { type: 'link', value: 'https://example.com' },
      { type: 'text', value: '。' },
    ]);
  });
  it('javascript:、data: 不會變成連結', () => {
    expect(linkify('javascript:alert(1) data:text/html,hi')).toEqual([
      { type: 'text', value: 'javascript:alert(1) data:text/html,hi' },
    ]);
  });
  it('HTML 標籤只是文字', () => {
    const segs = linkify('<img src=x onerror=alert(1)>');
    expect(segs.every((s) => s.type === 'text')).toBe(true);
  });
});

describe('fileKind', () => {
  it('圖片是 image,SVG 與其他是 file', () => {
    expect(fileKind('image/png')).toBe('image');
    expect(fileKind('image/jpeg')).toBe('image');
    expect(fileKind('image/svg+xml')).toBe('file');
    expect(fileKind('application/pdf')).toBe('file');
  });
});
