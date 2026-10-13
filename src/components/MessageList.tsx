import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChatItem } from '../hooks/useChat';
import { ArrowDownIcon, ChatBubbleIcon, SpinnerIcon } from './Icons';
import { MessageItem, type ImageTarget } from './MessageItem';

/** 距離最底部不到這麼多像素,就算「在最底部」 */
const BOTTOM_TOLERANCE = 24;

interface Props {
  items: ChatItem[];
  meId: string | undefined;
  loading: boolean;
  unread: number;
  scrollSignal: number;
  onAtBottomChange: (atBottom: boolean) => void;
  onJumpToBottom: () => void;
  onRecall: (id: string) => void;
  onOpenImage: (target: ImageTarget) => void;
}

export function MessageList({
  items,
  meId,
  loading,
  unread,
  scrollSignal,
  onAtBottomChange,
  onJumpToBottom,
  onRecall,
  onOpenImage,
}: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  const isAtBottom = () => {
    const el = ref.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_TOLERANCE;
  };

  // 內容變多後重新量一次:新訊息進來時畫面不會自動捲動,所以這時就不在最底部了
  useLayoutEffect(() => {
    onAtBottomChange(isAtBottom());
  }, [items, loading, onAtBottomChange]);

  // 需要捲到最底:剛載入完歷史訊息、自己送出訊息、按下新訊息按鈕
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    onAtBottomChange(true);
  }, [scrollSignal, onAtBottomChange]);

  const hasMessages = items.some((it) => it.type === 'message');

  return (
    <div className="messages-wrap">
      <div
        className="messages"
        ref={ref}
        onScroll={() => onAtBottomChange(isAtBottom())}
        role="log"
        aria-label={t('app.title')}
        aria-busy={loading}
      >
        {loading ? (
          <div className="skeletons" aria-hidden="true">
            <div className="skeletons__status">
              <SpinnerIcon size={18} strokeWidth={2.2} className="spin" />
              <span>{t('chat.loading')}</span>
            </div>
            <div className="skeleton skeleton--a" />
            <div className="skeleton skeleton--b" />
            <div className="skeleton skeleton--c" />
            <div className="skeleton skeleton--d" />
          </div>
        ) : (
          <>
            {!hasMessages && (
              <div className="empty">
                <div className="empty__icon">
                  <ChatBubbleIcon size={36} strokeWidth={1.8} />
                </div>
                <h2 className="empty__title">{t('chat.emptyTitle')}</h2>
                <p className="empty__sub">{t('chat.emptySub')}</p>
              </div>
            )}
            {items.map((item) => (
              <MessageItem key={item.key} item={item} meId={meId} onRecall={onRecall} onOpenImage={onOpenImage} />
            ))}
          </>
        )}
      </div>

      {unread > 0 && (
        <button type="button" className="new-messages" onClick={onJumpToBottom}>
          <ArrowDownIcon size={18} strokeWidth={2.5} />
          {t('chat.newMessages', { count: unread })}
        </button>
      )}
    </div>
  );
}
