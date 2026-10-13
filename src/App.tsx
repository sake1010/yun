import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DemoBar } from './components/Demo';
import { useChat } from './hooks/useChat';
import { useUnreadTitle } from './hooks/useUnreadTitle';
import { ChatScreen } from './screens/ChatScreen';
import { NicknameScreen } from './screens/NicknameScreen';
import { ServiceProvider } from './service/context';
import { createChatService } from './service';
import { useService } from './service/context';

export default function App() {
  // 整個網頁只建立一次聊天服務。階段二換成 Supabase 時,只需要改 createChatService。
  const service = useMemo(() => createChatService(), []);
  return (
    <ServiceProvider service={service}>
      <Shell />
    </ServiceProvider>
  );
}

function Shell() {
  const { t } = useTranslation();
  const service = useService();
  const chat = useChat(service);
  useUnreadTitle(t('app.title'), chat.unread);

  const showChat = chat.phase === 'chat';
  const showNickname = chat.phase === 'nickname' || chat.phase === 'failed';

  return (
    <div className="app">
      {service.demo && <DemoBar demo={service.demo} chat={chat} />}
      {chat.phase === 'booting' && <div className="booting" aria-busy="true" />}
      {showNickname && <NicknameScreen chat={chat} />}
      {showChat && <ChatScreen chat={chat} />}
    </div>
  );
}
