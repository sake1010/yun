// 「聊天服務層」的約定(docs/architecture.md 第 5 節)。
// 畫面只認得這份約定,不知道背後是假資料(mock)還是 Supabase。
// 階段一由 mock/MockChatService 實作,階段二換成 Supabase 的實作,畫面不用改。

export type MessageKind = 'text' | 'image' | 'file';

export interface FileInfo {
  name: string;
  size: number;
  mime: string;
  /** 檔案在儲存空間的位置。要顯示或下載時,用 getFileUrl 換成可用的網址。 */
  path: string;
}

export interface Message {
  id: string;
  /** 發送者的匿名身分編號,用來判斷是不是自己的訊息 */
  userId: string;
  nickname: string;
  kind: MessageKind;
  /** 文字內容。已收回時為 null */
  body: string | null;
  /** 檔案資訊。非檔案訊息或已收回時為 null */
  file: FileInfo | null;
  /** ISO 時間,由服務端決定 */
  createdAt: string;
  /** 沒被收回為 null;有值代表已收回,此時 body 與 file 都是 null */
  recalledAt: string | null;
}

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export type ChatErrorCode =
  | 'nickname-taken'
  | 'nickname-invalid'
  | 'rate-limited'
  | 'too-large'
  | 'too-long'
  | 'not-owner'
  | 'offline'
  | 'unknown';

export class ChatError extends Error {
  readonly code: ChatErrorCode;
  constructor(code: ChatErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ChatError';
    this.code = code;
  }
}

export type ClaimResult = 'ok' | 'taken' | 'invalid';

export interface Identity {
  userId: string;
  /** 這個瀏覽器已登記的代號。還沒登記為 null */
  nickname: string | null;
}

/** 服務會通知畫面的事件 */
export interface ChatEvents {
  /** 有人送出新訊息(包含自己的) */
  onMessageAdded(message: Message): void;
  /** 有人收回訊息。傳來的是內容已被清空的那則訊息 */
  onMessageRecalled(message: Message): void;
  /** 有人進入聊天室(自己除外;第一次同步時已在線的人不算) */
  onUserJoined(nickname: string): void;
  /** 有人離開,且已確定超過緩衝時間沒回來 */
  onUserLeft(nickname: string): void;
  /** 線上名單有任何變動(同一個代號只會出現一次) */
  onPresenceChanged(nicknames: string[]): void;
  /** 有人正在打字(自己除外) */
  onTyping(nickname: string): void;
  onConnectionChanged(status: ConnectionStatus): void;
}

/** 只在示範模式(階段一)才有的控制項。階段二的服務不提供這個。 */
export interface DemoControls {
  /** 假的聊天對象是否正在活動 */
  readonly botsActive: boolean;
  setBotsActive(active: boolean): void;
  simulateDisconnect(): void;
  simulateReconnect(): void;
  /** 下一次登記代號時回報「已被使用」 */
  failNextClaim(): void;
  /** 下一次送出訊息時回報「送太快」 */
  failNextSend(): void;
}

export interface ChatService {
  /** 還原這個瀏覽器的身分,並看有沒有已登記的代號 */
  start(): Promise<Identity>;
  /** 申請使用某個代號。成功後這個代號永久屬於這個瀏覽器 */
  claimNickname(name: string): Promise<ClaimResult>;
  /** 取最近 100 則訊息(由舊到新) */
  loadHistory(): Promise<Message[]>;
  sendText(text: string): Promise<void>;
  sendFile(file: File): Promise<void>;
  /** 把檔案的儲存位置換成可以顯示、下載的網址 */
  getFileUrl(path: string): Promise<string>;
  recall(messageId: string): Promise<void>;
  /** 通知大家我正在打字。呼叫太頻繁時由服務自己忽略 */
  setTyping(): void;
  /**
   * 連上即時頻道並登記「我在線上」,之後開始收到事件。
   * 回傳的函式用來離開(取消登記並停止收事件)。
   */
  subscribe(events: ChatEvents): () => void;
  readonly demo?: DemoControls;
}
