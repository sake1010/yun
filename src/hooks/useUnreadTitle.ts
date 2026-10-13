import { useEffect } from 'react';

/** 有未讀訊息時,分頁標題前面加上數字,例如「(3) 匿名聊天室」。 */
export function useUnreadTitle(title: string, unread: number): void {
  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) ${title}` : title;
  }, [title, unread]);
}
