import { NICKNAME_MAX } from './limits';

export type NicknameCheck =
  | { ok: true; value: string }
  | { ok: false; reason: 'empty' | 'too-long' | 'bad-char' };

// 肉眼看不見、或會讓兩個代號「看起來一樣」的字元(起點, 終點)。
// 控制字元(含換行)另外用 Unicode 類別 Cc 判斷。
// 刻意不擋 U+200D(零寬連字),因為組合式表情符號(例如家庭、職業)需要它。
const INVISIBLE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x00ad, 0x00ad], // 軟連字號
  [0x034f, 0x034f],
  [0x061c, 0x061c],
  [0x115f, 0x1160], // 諺文填充字元
  [0x17b4, 0x17b5],
  [0x180e, 0x180e],
  [0x200b, 0x200c], // 零寬空格、零寬非連字
  [0x200e, 0x200f], // 方向標記
  [0x2028, 0x2029], // 行、段分隔
  [0x202a, 0x202e], // 方向控制
  [0x2060, 0x206f], // 不可見的運算符與控制
  [0x2800, 0x2800], // 空白點字
  [0x3164, 0x3164], // 諺文填充字元
  [0xfeff, 0xfeff], // 零寬不換行空格
  [0xffa0, 0xffa0],
];

const CONTROL = /\p{Cc}/u;

function hasBadChar(text: string): boolean {
  if (CONTROL.test(text)) return true;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (INVISIBLE_RANGES.some(([from, to]) => cp >= from && cp <= to)) return true;
  }
  return false;
}

/** 檢查代號格式。通過時回傳去掉前後空白後的代號。 */
export function validateNickname(input: string): NicknameCheck {
  const value = input.trim();
  if (value.length === 0) return { ok: false, reason: 'empty' };
  if (hasBadChar(value)) return { ok: false, reason: 'bad-char' };
  if (Array.from(value).length > NICKNAME_MAX) return { ok: false, reason: 'too-long' };
  return { ok: true, value };
}

/** 代號比對用的鍵:不分英文大小寫。 */
export function nicknameKey(name: string): string {
  return name.trim().normalize('NFC').toLowerCase();
}

/** 輸入框旁的字數(以字元計,不是 UTF-16 長度)。 */
export function nicknameLength(input: string): number {
  return Array.from(input.trim()).length;
}
