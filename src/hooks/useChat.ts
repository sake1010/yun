import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChatError,
  type ChatEvents,
  type ChatService,
  type ConnectionStatus,
  type Identity,
  type Message,
} from '../service/contract';
import { FILE_MAX_BYTES, RATE_COOLDOWN_MS, TYPING_SEND_INTERVAL_MS, TYPING_SHOW_MS } from '../rules/limits';

/** 聊天畫面上的一列:一則訊息,或一行進出提示 */
export type ChatItem =
  | { key: string; at: number; type: 'message'; message: Message }
  | { key: string; at: number; type: 'notice'; kind: 'joined' | 'left'; nickname: string };

export type Phase = 'booting' | 'nickname' | 'chat' | 'failed';

/** 輸入區上方那一列要顯示的提示 */
export type StatusCode = 'rate-limited' | 'too-large' | 'too-long' | 'failed' | 'offline' | 'recall-failed';

export type ClaimOutcome = 'ok' | 'taken' | 'invalid' | 'error';

export interface ChatApi {
  phase: Phase;
  me: Identity | null;
  items: ChatItem[];
  historyLoaded: boolean;
  online: string[];
  typingNames: string[];
  connection: ConnectionStatus;
  unread: number;
  scrollSignal: number;
  status: StatusCode | null;
  retryBoot(): void;
  claimNickname(name: string): Promise<ClaimOutcome>;
  sendText(text: string): Promise<boolean>;
  sendFile(file: File): Promise<boolean>;
  recall(id: string): Promise<void>;
  notifyTyping(): void;
  setAtBottom(atBottom: boolean): void;
  jumpToBottom(): void;
  flash(code: StatusCode, ms?: number): void;
}

function sortItems(items: ChatItem[]): ChatItem[] {
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => a.item.at - b.item.at || a.i - b.i)
    .map((x) => x.item);
}

function messageItem(message: Message): ChatItem {
  return { key: `m:${message.id}`, at: Date.parse(message.createdAt), type: 'message', message };
}

/**
 * 聊天室的所有狀態與動作。
 * 只透過 ChatService 這個約定與服務溝通,不知道背後是假資料還是 Supabase。
 */
export function useChat(service: ChatService): ChatApi {
  const [phase, setPhase] = useState<Phase>('booting');
  const [me, setMe] = useState<Identity | null>(null);
  const [items, setItemsState] = useState<ChatItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [online, setOnline] = useState<string[]>([]);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [connection, setConnection] = useState<ConnectionStatus>('connected');
  const [unread, setUnread] = useState(0);
  const [scrollSignal, setScrollSignal] = useState(0);
  const [status, setStatus] = useState<StatusCode | null>(null);
  const [bootTry, setBootTry] = useState(0);

  const itemsRef = useRef<ChatItem[]>([]);
  const meRef = useRef<Identity | null>(null);
  const typingRef = useRef(new Map<string, number>());
  const lastTypingSent = useRef(0);
  const atBottomRef = useRef(true);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeSeq = useRef(0);
  const connectionRef = useRef<ConnectionStatus>('connected');

  const setItems = useCallback((next: ChatItem[]) => {
    itemsRef.current = next;
    setItemsState(next);
  }, []);

  // ---------- 啟動:還原身分 ----------
  useEffect(() => {
    let cancelled = false;
    setPhase('booting');
    service
      .start()
      .then((identity) => {
        if (cancelled) return;
        meRef.current = identity;
        setMe(identity);
        setPhase(identity.nickname ? 'chat' : 'nickname');
      })
      .catch(() => {
        if (!cancelled) setPhase('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [service, bootTry]);

  // ---------- 提示列 ----------
  const flash = useCallback((code: StatusCode, ms = 4000) => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setStatus(code);
    flashTimer.current = setTimeout(() => setStatus(null), ms);
  }, []);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  // ---------- 歷史訊息合併 ----------
  /** 把服務傳來的訊息併進畫面。已收回的不會被「還原」。countNew:新出現的他人訊息算未讀。 */
  const mergeMessages = useCallback(
    (list: Message[], countNew: boolean) => {
      const current = itemsRef.current;
      const known = new Map<string, ChatItem>();
      for (const it of current) if (it.type === 'message') known.set(it.message.id, it);

      let added = 0;
      const next: ChatItem[] = current.filter((it) => it.type === 'notice');
      const seen = new Set<string>();
      for (const incoming of list) {
        seen.add(incoming.id);
        const old = known.get(incoming.id);
        if (old && old.type === 'message' && old.message.recalledAt && !incoming.recalledAt) {
          next.push(old);
          continue;
        }
        if (!old && incoming.userId !== meRef.current?.userId) added += 1;
        next.push(messageItem(incoming));
      }
      // 畫面上有、但這次歷史裡沒有的訊息(例如超過 100 則被擠掉,或只存在記憶體的檔案)留著
      for (const [id, it] of known) if (!seen.has(id)) next.push(it);

      setItems(sortItems(next));
      if (countNew && added > 0) setUnread((n) => n + added);
    },
    [setItems],
  );

  const loadHistory = useCallback(
    async (countNew: boolean) => {
      try {
        const list = await service.loadHistory();
        mergeMessages(list, countNew);
      } catch {
        // 讀取失敗就先顯示現有內容,下次重連會再試一次
      } finally {
        setHistoryLoaded(true);
        if (!countNew) setScrollSignal((n) => n + 1);
      }
    },
    [service, mergeMessages],
  );

  // ---------- 進入聊天室:連上即時頻道 ----------
  const inChat = phase === 'chat';
  useEffect(() => {
    if (!inChat) return;
    let active = true;

    const events: ChatEvents = {
      onMessageAdded(message) {
        if (!active) return;
        if (itemsRef.current.some((it) => it.type === 'message' && it.message.id === message.id)) return;
        setItems(sortItems([...itemsRef.current, messageItem(message)]));
        typingRef.current.delete(message.nickname);
        if (message.userId === meRef.current?.userId) setScrollSignal((n) => n + 1);
        else setUnread((n) => n + 1);
      },
      onMessageRecalled(message) {
        if (!active) return;
        const exists = itemsRef.current.some((it) => it.type === 'message' && it.message.id === message.id);
        const next = exists
          ? itemsRef.current.map((it) => (it.type === 'message' && it.message.id === message.id ? messageItem(message) : it))
          : sortItems([...itemsRef.current, messageItem(message)]);
        setItems(next);
      },
      onUserJoined(nickname) {
        if (!active) return;
        noticeSeq.current += 1;
        setItems([...itemsRef.current, { key: `n:${noticeSeq.current}`, at: Date.now(), type: 'notice', kind: 'joined', nickname }]);
      },
      onUserLeft(nickname) {
        if (!active) return;
        noticeSeq.current += 1;
        setItems([...itemsRef.current, { key: `n:${noticeSeq.current}`, at: Date.now(), type: 'notice', kind: 'left', nickname }]);
      },
      onPresenceChanged(nicknames) {
        if (active) setOnline(nicknames);
      },
      onTyping(nickname) {
        if (!active) return;
        typingRef.current.set(nickname, Date.now() + TYPING_SHOW_MS);
        setTypingNames(Array.from(typingRef.current.keys()));
      },
      onConnectionChanged(next) {
        if (!active) return;
        const previous = connectionRef.current;
        connectionRef.current = next;
        setConnection(next);
        // 重連成功:重新取歷史訊息並合併,補回斷線期間漏掉的新訊息與收回
        if (next === 'connected' && previous !== 'connected') void loadHistory(true);
      },
    };

    const unsubscribe = service.subscribe(events);
    void loadHistory(false);

    return () => {
      active = false;
      unsubscribe();
      typingRef.current.clear();
      setTypingNames([]);
    };
  }, [inChat, service, loadHistory, setItems]);

  // 「正在輸入」過期後移除
  useEffect(() => {
    if (!inChat) return;
    const timer = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [name, expires] of typingRef.current) {
        if (expires <= now) {
          typingRef.current.delete(name);
          changed = true;
        }
      }
      if (changed) setTypingNames(Array.from(typingRef.current.keys()));
    }, 500);
    return () => clearInterval(timer);
  }, [inChat]);

  // ---------- 動作 ----------
  const claimNickname = useCallback(
    async (name: string): Promise<ClaimOutcome> => {
      try {
        const result = await service.claimNickname(name);
        if (result !== 'ok') return result;
        const identity = await service.start();
        meRef.current = identity;
        setMe(identity);
        setPhase('chat');
        return 'ok';
      } catch {
        return 'error';
      }
    },
    [service],
  );

  const handleSendError = useCallback(
    (e: unknown) => {
      const code = e instanceof ChatError ? e.code : 'unknown';
      if (code === 'rate-limited') flash('rate-limited', RATE_COOLDOWN_MS);
      else if (code === 'too-large') flash('too-large');
      else if (code === 'too-long') flash('too-long');
      else if (code === 'offline') flash('offline');
      else flash('failed');
    },
    [flash],
  );

  const sendText = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await service.sendText(text);
        return true;
      } catch (e) {
        handleSendError(e);
        return false;
      }
    },
    [service, handleSendError],
  );

  const sendFile = useCallback(
    async (file: File): Promise<boolean> => {
      if (file.size > FILE_MAX_BYTES) {
        flash('too-large');
        return false;
      }
      try {
        await service.sendFile(file);
        return true;
      } catch (e) {
        handleSendError(e);
        return false;
      }
    },
    [service, flash, handleSendError],
  );

  const recall = useCallback(
    async (id: string) => {
      try {
        await service.recall(id);
      } catch {
        flash('recall-failed');
      }
    },
    [service, flash],
  );

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current < TYPING_SEND_INTERVAL_MS) return;
    lastTypingSent.current = now;
    service.setTyping();
  }, [service]);

  const setAtBottom = useCallback((atBottom: boolean) => {
    atBottomRef.current = atBottom;
    if (atBottom && document.visibilityState === 'visible') setUnread(0);
  }, []);

  // 切回這個分頁時,若已經在最底部,就算看過了
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && atBottomRef.current) setUnread(0);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const jumpToBottom = useCallback(() => {
    setScrollSignal((n) => n + 1);
    setUnread(0);
  }, []);

  const retryBoot = useCallback(() => setBootTry((n) => n + 1), []);

  return useMemo(
    () => ({
      phase,
      me,
      items,
      historyLoaded,
      online,
      typingNames,
      connection,
      unread,
      scrollSignal,
      status,
      retryBoot,
      claimNickname,
      sendText,
      sendFile,
      recall,
      notifyTyping,
      setAtBottom,
      jumpToBottom,
      flash,
    }),
    [
      phase, me, items, historyLoaded, online, typingNames, connection, unread, scrollSignal, status,
      retryBoot, claimNickname, sendText, sendFile, recall, notifyTyping, setAtBottom, jumpToBottom, flash,
    ],
  );
}
