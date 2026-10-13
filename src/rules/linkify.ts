export type Segment = { type: 'text'; value: string } | { type: 'link'; value: string };

const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;
// 網址結尾常會黏到標點,不算進網址裡
const TRAILING = /[.,!?;:)\]}>。,、!?;:)」』】》]+$/u;

function isSafeHttp(text: string): boolean {
  try {
    const u = new URL(text);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** 把文字拆成「一般文字」與「網址」。只有 http、https 會變成網址。 */
export function linkify(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_PATTERN)) {
    const start = m.index ?? 0;
    let url = m[0];
    const trimmed = url.replace(TRAILING, '');
    if (trimmed.length > 0) url = trimmed;
    if (!isSafeHttp(url)) continue;
    if (start > last) out.push({ type: 'text', value: text.slice(last, start) });
    out.push({ type: 'link', value: url });
    last = start + url.length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}
