import type { ChatService } from './contract';
import { LEAVE_GRACE_MS } from '../rules/limits';
import { MockChatService } from './mock/MockChatService';

/**
 * 決定畫面要用哪一個聊天服務。
 * 階段一:一律用假服務。
 * 階段二:有填入 Supabase 設定時,這裡改成回傳 Supabase 的服務,其餘程式碼不用動。
 */
export function createChatService(): ChatService {
  const params = new URLSearchParams(window.location.search);

  // 示範模式:網址加上 ?demo=1,會出現假的聊天對象與示範控制面板
  const demo = params.get('demo') === '1';

  // 測試用:?grace=3 把「離開提示」的等待時間縮短為 3 秒(預設 30 秒)
  const graceSeconds = Number(params.get('grace'));
  const graceMs = Number.isFinite(graceSeconds) && graceSeconds > 0 ? graceSeconds * 1000 : LEAVE_GRACE_MS;

  return new MockChatService({ demo, graceMs });
}
