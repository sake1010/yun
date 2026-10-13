import {
  ChatError,
  type ChatEvents,
  type ChatService,
  type ClaimResult,
  type ConnectionStatus,
  type DemoControls,
  type Identity,
  type Message,
} from '../contract';
import { PresenceGrace } from '../presence';
import { fileKind } from '../../rules/fileKind';
import { nicknameKey, validateNickname } from '../../rules/validateNickname';
import {
  FILE_MAX_BYTES,
  HISTORY_COUNT,
  RATE_MAX_MESSAGES,
  RATE_WINDOW_MS,
  TEXT_MAX,
} from '../../rules/limits';
import { BOT_NAMES, nextBotLine, seedMessages } from './demo';

/**
 * 階段一的假聊天服務。
 * - 代號、文字訊息存在這個瀏覽器的 localStorage,重新整理還在。
 * - 圖片與檔案只存在記憶體,重新整理就消失。
 * - 同一個瀏覽器的多個分頁,用 BroadcastChannel 互相傳話,看起來像多人聊天。
 * - 示範模式會加上幾位「假的聊天對象」。
 */

const KEY_USER = 'chat.mock.userId';
const KEY_NICKS = 'chat.mock.nicknames';
const KEY_MESSAGES = 'chat.mock.messages';
const STORE_CAP = 200;
const HEARTBEAT_MS = 3_000;
const REMOTE_EXPIRE_MS = 8_000;

export interface MockOptions {
  /** 是否啟用示範模式(假的聊天對象與示範控制面板) */
  demo: boolean;
  /** 離開提示的緩衝時間 */
  graceMs: number;
}

type Wire =
  | { t: 'msg'; message: Message; blob?: Blob }
  | { t: 'recall'; message: Message }
  | { t: 'presence'; tabId: string; nickname: string }
  | { t: 'bye'; tabId: string }
  | { t: 'hello'; tabId: string }
  | { t: 'typing'; nickname: string };

type Registry = Record<string, { userId: string; name: string }>;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 空間不足或被瀏覽器封鎖時就算了,示範模式不需要保證存檔
  }
}

function randomId(): string {
  return crypto.randomUUID();
}

export class MockChatService implements ChatService {
  readonly demo?: DemoControls;

  private userId = '';
  private nickname: string | null = null;
  private readonly tabId = randomId();
  private readonly channel: BroadcastChannel | null;

  private messages: Message[] = [];
  private readonly files = new Map<string, Blob>();
  private readonly fileUrls = new Map<string, string>();
  private sendTimes: number[] = [];

  private events: ChatEvents | null = null;
  private status: ConnectionStatus = 'connected';
  private remote = new Map<string, { nickname: string; seen: number }>();
  private grace: PresenceGrace | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private lastTypingAt = 0;

  private failClaim = false;
  private failSend = false;
  private botsOn = false;
  private onlineBots = new Set<string>();
  private botTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(private readonly options: MockOptions) {
    this.channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('yun-chat-mock');
    if (this.channel) this.channel.onmessage = (e: MessageEvent<Wire>) => this.onWire(e.data);

    if (options.demo) {
      const self = this;
      this.demo = {
        get botsActive() {
          return self.botsOn;
        },
        setBotsActive: (active) => self.setBots(active),
        simulateDisconnect: () => self.simulateDisconnect(),
        simulateReconnect: () => self.simulateReconnect(),
        failNextClaim: () => {
          self.failClaim = true;
        },
        failNextSend: () => {
          self.failSend = true;
        },
      };
    }
  }

  // ---------- 指令 ----------

  async start(): Promise<Identity> {
    let userId = '';
    try {
      userId = localStorage.getItem(KEY_USER) ?? '';
    } catch {
      userId = '';
    }
    if (!userId) {
      userId = randomId();
      try {
        localStorage.setItem(KEY_USER, userId);
      } catch {
        // 忽略
      }
    }
    this.userId = userId;

    const registry = readJson<Registry>(KEY_NICKS, {});
    const mine = Object.values(registry).find((r) => r.userId === userId);
    this.nickname = mine?.name ?? null;

    if (this.options.demo && readJson<Message[]>(KEY_MESSAGES, []).length === 0) {
      writeJson(KEY_MESSAGES, seedMessages());
    }
    return { userId, nickname: this.nickname };
  }

  async claimNickname(name: string): Promise<ClaimResult> {
    if (this.failClaim) {
      this.failClaim = false;
      return 'taken';
    }
    const check = validateNickname(name);
    if (!check.ok) return 'invalid';
    const key = nicknameKey(check.value);

    if (this.options.demo && BOT_NAMES.some((b) => nicknameKey(b) === key)) return 'taken';

    const registry = readJson<Registry>(KEY_NICKS, {});
    const owner = registry[key];
    if (owner && owner.userId !== this.userId) return 'taken';

    registry[key] = { userId: this.userId, name: check.value };
    writeJson(KEY_NICKS, registry);
    this.nickname = check.value;
    return 'ok';
  }

  async loadHistory(): Promise<Message[]> {
    this.assertOnline();
    // 文字訊息從 localStorage 讀(可能有別的分頁寫入),檔案訊息只在記憶體
    const stored = readJson<Message[]>(KEY_MESSAGES, []);
    const byId = new Map<string, Message>();
    for (const m of stored) byId.set(m.id, m);
    for (const m of this.messages) {
      const prev = byId.get(m.id);
      if (!prev || prev.recalledAt === null) byId.set(m.id, m);
    }
    this.messages = [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return this.messages.slice(-HISTORY_COUNT);
  }

  async sendText(text: string): Promise<void> {
    this.assertOnline();
    if (text.length > TEXT_MAX) throw new ChatError('too-long');
    this.checkRate();
    this.publish(this.buildMessage({ kind: 'text', body: text, file: null }));
  }

  async sendFile(file: File): Promise<void> {
    this.assertOnline();
    if (file.size > FILE_MAX_BYTES) throw new ChatError('too-large');
    this.checkRate();
    const path = `mock/${randomId()}`;
    const mime = file.type || 'application/octet-stream';
    this.files.set(path, file);
    const message = this.buildMessage({
      kind: fileKind(mime),
      body: null,
      file: { name: file.name, size: file.size, mime, path },
    });
    this.publish(message, file);
  }

  async getFileUrl(path: string): Promise<string> {
    const cached = this.fileUrls.get(path);
    if (cached) return cached;
    const blob = this.files.get(path);
    if (!blob) throw new ChatError('unknown', 'file not available');
    const url = URL.createObjectURL(blob);
    this.fileUrls.set(path, url);
    return url;
  }

  async recall(messageId: string): Promise<void> {
    this.assertOnline();
    const target = this.messages.find((m) => m.id === messageId);
    if (!target) throw new ChatError('unknown');
    if (target.userId !== this.userId) throw new ChatError('not-owner');
    if (target.recalledAt) return;
    const recalled = this.recallLocally(target);
    this.persist(recalled);
    this.events?.onMessageRecalled(recalled);
    this.post({ t: 'recall', message: recalled });
  }

  setTyping(): void {
    if (this.status !== 'connected' || !this.nickname) return;
    const now = Date.now();
    if (now - this.lastTypingAt < 1_000) return;
    this.lastTypingAt = now;
    this.post({ t: 'typing', nickname: this.nickname });
  }

  subscribe(events: ChatEvents): () => void {
    this.events = events;
    this.status = 'connected';
    this.grace = new PresenceGrace(
      this.options.graceMs,
      (name) => {
        if (name !== this.nickname) events.onUserJoined(name);
      },
      (name) => {
        if (name !== this.nickname) events.onUserLeft(name);
      },
    );

    this.announce();
    this.post({ t: 'hello', tabId: this.tabId });
    this.heartbeat = setInterval(() => {
      const now = Date.now();
      for (const [id, r] of this.remote) if (now - r.seen > REMOTE_EXPIRE_MS) this.remote.delete(id);
      if (this.status === 'connected') this.announce();
      this.refreshPresence();
    }, HEARTBEAT_MS);

    const onHide = () => this.post({ t: 'bye', tabId: this.tabId });
    window.addEventListener('pagehide', onHide);

    events.onConnectionChanged('connected');
    this.refreshPresence();
    if (this.options.demo) this.setBots(true);

    return () => {
      window.removeEventListener('pagehide', onHide);
      this.post({ t: 'bye', tabId: this.tabId });
      if (this.heartbeat) clearInterval(this.heartbeat);
      this.heartbeat = null;
      this.stopBotTimers();
      this.onlineBots.clear();
      this.botsOn = false;
      this.grace?.dispose();
      this.grace = null;
      this.events = null;
    };
  }

  // ---------- 內部:訊息 ----------

  private assertOnline(): void {
    if (this.status !== 'connected') throw new ChatError('offline');
  }

  private checkRate(): void {
    if (this.failSend) {
      this.failSend = false;
      throw new ChatError('rate-limited');
    }
    const now = Date.now();
    this.sendTimes = this.sendTimes.filter((t) => now - t < RATE_WINDOW_MS);
    if (this.sendTimes.length >= RATE_MAX_MESSAGES) throw new ChatError('rate-limited');
    this.sendTimes.push(now);
  }

  private buildMessage(parts: Pick<Message, 'kind' | 'body' | 'file'>): Message {
    if (!this.nickname) throw new ChatError('unknown', 'no nickname');
    return {
      id: randomId(),
      userId: this.userId,
      nickname: this.nickname,
      createdAt: new Date().toISOString(),
      recalledAt: null,
      ...parts,
    };
  }

  /** 自己送出的訊息:存起來、通知自己的畫面、傳給別的分頁 */
  private publish(message: Message, blob?: Blob): void {
    this.upsert(message);
    this.persist(message);
    this.events?.onMessageAdded(message);
    this.post({ t: 'msg', message, blob });
  }

  private upsert(message: Message): void {
    const i = this.messages.findIndex((m) => m.id === message.id);
    if (i >= 0) this.messages[i] = message;
    else this.messages.push(message);
    if (this.messages.length > STORE_CAP) this.messages.splice(0, this.messages.length - STORE_CAP);
  }

  /** 檔案內容無法存進 localStorage,所以有檔案的訊息不存(收回後的除外) */
  private persist(message: Message): void {
    if (message.file) return;
    const stored = readJson<Message[]>(KEY_MESSAGES, []);
    const i = stored.findIndex((m) => m.id === message.id);
    if (i >= 0) stored[i] = message;
    else stored.push(message);
    stored.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    writeJson(KEY_MESSAGES, stored.slice(-STORE_CAP));
  }

  private recallLocally(target: Message): Message {
    const recalled: Message = { ...target, body: null, file: null, recalledAt: new Date().toISOString() };
    this.upsert(recalled);
    if (target.file) {
      const url = this.fileUrls.get(target.file.path);
      if (url) URL.revokeObjectURL(url);
      this.fileUrls.delete(target.file.path);
      this.files.delete(target.file.path);
    }
    return recalled;
  }

  // ---------- 內部:別的分頁傳來的訊息 ----------

  private post(wire: Wire): void {
    this.channel?.postMessage(wire);
  }

  private onWire(wire: Wire): void {
    switch (wire.t) {
      case 'msg': {
        if (wire.message.file && wire.blob) this.files.set(wire.message.file.path, wire.blob);
        this.upsert(wire.message);
        if (this.status === 'connected') this.events?.onMessageAdded(wire.message);
        break;
      }
      case 'recall': {
        const target = this.messages.find((m) => m.id === wire.message.id);
        if (target?.file) this.files.delete(target.file.path);
        this.upsert(wire.message);
        if (this.status === 'connected') this.events?.onMessageRecalled(wire.message);
        break;
      }
      case 'presence':
        if (wire.tabId !== this.tabId) {
          this.remote.set(wire.tabId, { nickname: wire.nickname, seen: Date.now() });
          this.refreshPresence();
        }
        break;
      case 'bye':
        this.remote.delete(wire.tabId);
        this.refreshPresence();
        break;
      case 'hello':
        if (this.events && this.status === 'connected') this.announce();
        break;
      case 'typing':
        if (this.status === 'connected' && wire.nickname !== this.nickname) this.events?.onTyping(wire.nickname);
        break;
    }
  }

  // ---------- 內部:線上名單 ----------

  private announce(): void {
    if (this.nickname) this.post({ t: 'presence', tabId: this.tabId, nickname: this.nickname });
  }

  private refreshPresence(): void {
    if (!this.events || !this.grace || this.status !== 'connected') return;
    const names = new Set<string>();
    if (this.nickname) names.add(this.nickname);
    for (const r of this.remote.values()) names.add(r.nickname);
    for (const b of this.onlineBots) names.add(b);
    this.grace.sync(names);
    this.events.onPresenceChanged([...names]);
  }

  // ---------- 內部:示範控制 ----------

  private simulateDisconnect(): void {
    if (this.status !== 'connected' || !this.events) return;
    this.post({ t: 'bye', tabId: this.tabId });
    this.status = 'reconnecting';
    this.events.onConnectionChanged('reconnecting');
  }

  private simulateReconnect(): void {
    if (this.status === 'connected' || !this.events) return;
    this.status = 'connected';
    this.announce();
    this.post({ t: 'hello', tabId: this.tabId });
    this.events.onConnectionChanged('connected');
    this.refreshPresence();
  }

  // ---------- 內部:假的聊天對象 ----------

  private setBots(active: boolean): void {
    if (active === this.botsOn) return;
    this.botsOn = active;
    this.stopBotTimers();
    this.onlineBots.clear();
    if (active) {
      this.onlineBots.add(BOT_NAMES[0]);
      this.onlineBots.add(BOT_NAMES[1]);
      this.scheduleTalk();
      this.scheduleRoam();
    }
    this.refreshPresence();
  }

  private later(fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      this.botTimers.delete(t);
      fn();
    }, ms);
    this.botTimers.add(t);
  }

  private stopBotTimers(): void {
    for (const t of this.botTimers) clearTimeout(t);
    this.botTimers.clear();
  }

  private scheduleTalk(): void {
    this.later(() => {
      const online = [...this.onlineBots];
      if (online.length > 0 && this.botsOn) {
        const name = online[Math.floor(Math.random() * online.length)];
        if (this.status === 'connected') this.events?.onTyping(name);
        this.later(() => this.botSay(name), 1_800);
      }
      if (this.botsOn) this.scheduleTalk();
    }, 7_000 + Math.random() * 9_000);
  }

  private botSay(name: string): void {
    if (!this.botsOn) return;
    const message: Message = {
      id: randomId(),
      userId: `bot:${name}`,
      nickname: name,
      kind: 'text',
      body: nextBotLine(),
      file: null,
      createdAt: new Date().toISOString(),
      recalledAt: null,
    };
    this.upsert(message);
    this.persist(message);
    if (this.status === 'connected') this.events?.onMessageAdded(message);

    // 偶爾自己收回,示範「已收回」
    if (Math.random() < 0.12) {
      this.later(() => {
        const recalled = this.recallLocally(message);
        this.persist(recalled);
        if (this.status === 'connected') this.events?.onMessageRecalled(recalled);
      }, 6_000);
    }
  }

  private scheduleRoam(): void {
    this.later(() => {
      if (!this.botsOn) return;
      const roamer = BOT_NAMES[2 + Math.floor(Math.random() * 2)];
      if (this.onlineBots.has(roamer)) this.onlineBots.delete(roamer);
      else this.onlineBots.add(roamer);
      this.refreshPresence();
      this.scheduleRoam();
    }, 45_000 + Math.random() * 45_000);
  }
}
