import type { Message } from '../contract';

/** 示範模式裡「假的聊天對象」。前兩位一直在線,後兩位會進進出出。 */
export const BOT_NAMES = ['小華', 'Amy', '阿傑', '小美'] as const;

const LINES = [
  '大家好！',
  '今天天氣真好',
  '有人看過這部新電影嗎？',
  '我剛剛在路上看到一隻很胖的貓',
  '哈哈哈哈哈',
  '週末有人想出去走走嗎',
  'Does anyone know a good ramen place nearby?',
  '這個活動資訊在這裡 https://example.com/weekend',
  '午餐吃什麼好呢…',
  '我先去忙一下，晚點回來聊',
  '推薦大家聽這首歌 🎵',
  '真的假的！？',
  '剛下班，終於可以休息了',
  'いい天気ですね',
  '好喔，慢慢吃',
];

let cursor = Math.floor(Math.random() * LINES.length);

export function nextBotLine(): string {
  cursor = (cursor + 1) % LINES.length;
  return LINES[cursor];
}

/** 第一次進來時預先放進聊天室的歷史訊息(其中一則已被收回)。 */
export function seedMessages(): Message[] {
  const now = Date.now();
  const make = (minutesAgo: number, bot: (typeof BOT_NAMES)[number], body: string | null, recalled = false): Message => ({
    id: crypto.randomUUID(),
    userId: `bot:${bot}`,
    nickname: bot,
    kind: 'text',
    body: recalled ? null : body,
    file: null,
    createdAt: new Date(now - minutesAgo * 60_000).toISOString(),
    recalledAt: recalled ? new Date(now - (minutesAgo - 1) * 60_000).toISOString() : null,
  });
  return [
    make(42, '小華', '大家午安～'),
    make(40, 'Amy', '午安！今天好熱'),
    make(37, '阿傑', '這個活動資訊在這裡 https://example.com/weekend'),
    make(35, 'Amy', '傳錯了…', true),
    make(30, '小華', '我剛剛在路上看到一隻很胖的貓'),
    make(24, '小美', '哈哈哈哈哈'),
    make(18, '阿傑', '我先去吃飯，晚點回來'),
  ];
}
