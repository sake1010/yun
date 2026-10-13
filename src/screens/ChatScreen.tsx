import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChatApi } from '../hooks/useChat';
import { Composer } from '../components/Composer';
import { ImageViewer, RecallDialog } from '../components/Dialogs';
import { LanguageMenu } from '../components/LanguageMenu';
import { MessageList } from '../components/MessageList';
import type { ImageTarget } from '../components/MessageItem';
import { OnlinePanel, OnlineSidebar, OnlineSummary, orderOnline } from '../components/Online';
import { SpinnerIcon } from '../components/Icons';

export function ChatScreen({ chat }: { chat: ChatApi }) {
  const { t } = useTranslation();
  const [panelOpen, setPanelOpen] = useState(false);
  const [recallId, setRecallId] = useState<string | null>(null);
  const [image, setImage] = useState<ImageTarget | null>(null);

  const meName = chat.me?.nickname ?? null;
  const names = orderOnline(chat.online, meName);

  const closePanel = useCallback(() => setPanelOpen(false), []);
  const askRecall = useCallback((id: string) => setRecallId(id), []);
  const openImage = useCallback((target: ImageTarget) => setImage(target), []);

  return (
    <div className="chat">
      <section className="chat__main">
        <header className="topbar">
          <OnlineSummary names={names} me={meName} expanded={panelOpen} onToggle={() => setPanelOpen((v) => !v)} />
          <h1 className="topbar__title">{t('app.title')}</h1>
          <LanguageMenu />
        </header>

        {chat.connection !== 'connected' && (
          <div className="conn-banner" role="alert">
            <SpinnerIcon size={20} strokeWidth={2.2} className="spin" />
            {t('chat.connectionLost')}
          </div>
        )}

        <MessageList
          items={chat.items}
          meId={chat.me?.userId}
          loading={!chat.historyLoaded}
          unread={chat.unread}
          scrollSignal={chat.scrollSignal}
          onAtBottomChange={chat.setAtBottom}
          onJumpToBottom={chat.jumpToBottom}
          onRecall={askRecall}
          onOpenImage={openImage}
        />

        <Composer
          connection={chat.connection}
          status={chat.status}
          typingNames={chat.typingNames}
          onSendText={chat.sendText}
          onSendFile={chat.sendFile}
          onTyping={chat.notifyTyping}
        />
      </section>

      <OnlineSidebar names={names} me={meName} />
      {panelOpen && <OnlinePanel names={names} me={meName} onClose={closePanel} />}

      <RecallDialog
        open={recallId !== null}
        onCancel={() => setRecallId(null)}
        onConfirm={() => {
          if (recallId) void chat.recall(recallId);
          setRecallId(null);
        }}
      />
      <ImageViewer target={image} onClose={() => setImage(null)} />
    </div>
  );
}
