import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages 把網站放在 https://<帳號>.github.io/<repo 名稱>/ 底下,
// 所以打包時要告訴 Vite 這個子路徑,否則找不到樣式與圖片。
// 部署用的 repo 名稱是 yun;若 repo 改名,設定環境變數 VITE_BASE_PATH 即可。
const base = process.env.VITE_BASE_PATH ?? '/yun/';

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
