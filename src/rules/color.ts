export const NAME_COLOR_COUNT = 6;

/** 依代號算出固定的顏色編號(1 到 6)。同一個代號永遠同色。 */
export function nameColorIndex(nickname: string): number {
  const key = nickname.trim().normalize('NFC').toLowerCase();
  // FNV-1a 雜湊
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash % NAME_COLOR_COUNT) + 1;
}
