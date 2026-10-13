import { beforeEach, describe, expect, it } from 'vitest';
import type { ChatEvents, Message } from '../contract';
import { MockChatService } from './MockChatService';

// 測試環境(node)沒有瀏覽器的儲存空間,用最簡單的替身
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  clear() {
    this.map.clear();
  }
}

const storage = new MemoryStorage();
Object.assign(globalThis, {
  localStorage: storage,
  window: { addEventListener() {}, removeEventListener() {} },
});

function listener() {
  const added: Message[] = [];
  const recalled: Message[] = [];
  const events: ChatEvents = {
    onMessageAdded: (m) => added.push(m),
    onMessageRecalled: (m) => recalled.push(m),
    onUserJoined() {},
    onUserLeft() {},
    onPresenceChanged() {},
    onTyping() {},
    onConnectionChanged() {},
  };
  return { added, recalled, events };
}

const options = { demo: false, graceMs: 30_000 };

async function makeService(nick = '小明') {
  const s = new MockChatService(options);
  await s.start();
  expect(await s.claimNickname(nick)).toBe('ok');
  return s;
}

beforeEach(() => storage.clear());

describe('MockChatService', () => {
  it('第一次沒有代號,登記後下次啟動還在', async () => {
    const s = new MockChatService(options);
    expect((await s.start()).nickname).toBeNull();
    expect(await s.claimNickname('  小明 ')).toBe('ok');
    const again = new MockChatService(options);
    expect((await again.start()).nickname).toBe('小明');
  });

  it('格式不合回報 invalid', async () => {
    const s = new MockChatService(options);
    await s.start();
    expect(await s.claimNickname('')).toBe('invalid');
    expect(await s.claimNickname('一二三四五六七八九十甲乙丙')).toBe('invalid');
  });

  it('別的瀏覽器(身分)不能用已被登記的代號,不分大小寫', async () => {
    await makeService('Amy');
    storage.setItem('chat.mock.userId', 'someone-else');
    const other = new MockChatService(options);
    await other.start();
    expect(await other.claimNickname('amy')).toBe('taken');
  });

  it('送出文字後,自己的畫面會收到事件,歷史訊息拿得到', async () => {
    const s = await makeService();
    const { added, events } = listener();
    s.subscribe(events);
    await s.sendText('大家好');
    expect(added).toHaveLength(1);
    expect(added[0].body).toBe('大家好');
    const history = await s.loadHistory();
    expect(history.map((m) => m.body)).toEqual(['大家好']);
  });

  it('收回後內容被清空,重新讀取歷史也不會還原', async () => {
    const s = await makeService();
    const { added, recalled, events } = listener();
    s.subscribe(events);
    await s.sendText('秘密');
    await s.recall(added[0].id);
    expect(recalled[0].body).toBeNull();
    expect(recalled[0].recalledAt).not.toBeNull();
    const history = await s.loadHistory();
    expect(history[0].body).toBeNull();
    expect(history[0].recalledAt).not.toBeNull();
  });

  it('不能收回別人的訊息', async () => {
    const demoService = new MockChatService({ demo: true, graceMs: 30_000 });
    await demoService.start();
    await demoService.claimNickname('小明');
    const { events } = listener();
    demoService.subscribe(events);
    // 示範模式第一次啟動會放入假的聊天對象留下的歷史訊息
    const history = await demoService.loadHistory();
    const fromBot = history.find((m) => m.userId.startsWith('bot:'));
    expect(fromBot).toBeDefined();
    await expect(demoService.recall(fromBot!.id)).rejects.toMatchObject({ code: 'not-owner' });
    await expect(demoService.recall('not-exist')).rejects.toMatchObject({ code: 'unknown' });
  });

  it('10 秒內超過 5 則回報 rate-limited', async () => {
    const s = await makeService();
    const { events } = listener();
    s.subscribe(events);
    for (let i = 0; i < 5; i++) await s.sendText(`m${i}`);
    await expect(s.sendText('太多了')).rejects.toMatchObject({ code: 'rate-limited' });
  });

  it('太長的文字、太大的檔案會被擋', async () => {
    const s = await makeService();
    const { events } = listener();
    s.subscribe(events);
    await expect(s.sendText('a'.repeat(4001))).rejects.toMatchObject({ code: 'too-long' });
    const big = { name: 'big.bin', size: 6 * 1024 * 1024, type: 'application/octet-stream' } as File;
    await expect(s.sendFile(big)).rejects.toMatchObject({ code: 'too-large' });
  });
});
