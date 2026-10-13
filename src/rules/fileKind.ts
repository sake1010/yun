import type { MessageKind } from '../service/contract';

/** 圖片直接顯示;SVG 可能夾帶程式,一律當一般檔案。 */
export function fileKind(mime: string): Exclude<MessageKind, 'text'> {
  const m = mime.toLowerCase();
  if (m.startsWith('image/') && !m.includes('svg')) return 'image';
  return 'file';
}
