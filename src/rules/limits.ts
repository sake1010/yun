// 全站共用的數字上限。階段二時,資料庫端也會用同樣的數字再檢查一次。
export const NICKNAME_MAX = 12;
export const TEXT_MAX = 4000;
export const FILE_MAX_MB = 5;
export const FILE_MAX_BYTES = FILE_MAX_MB * 1024 * 1024;
export const HISTORY_COUNT = 100;

// 防洗版:同一個人 RATE_WINDOW_MS 內最多 RATE_MAX_MESSAGES 則
export const RATE_MAX_MESSAGES = 5;
export const RATE_WINDOW_MS = 10_000;
export const RATE_COOLDOWN_MS = 5_000;

// 離開提示的緩衝:斷線後這麼久還沒回來,才算離開
export const LEAVE_GRACE_MS = 30_000;

// 「正在輸入」:傳送端最多每 TYPING_SEND_INTERVAL_MS 送一次,接收端顯示 TYPING_SHOW_MS
export const TYPING_SEND_INTERVAL_MS = 2_000;
export const TYPING_SHOW_MS = 3_000;
export const TYPING_NAMES_MAX = 3;
