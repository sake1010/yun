# 匿名聊天室

一個不用登入的匿名聊天室。網頁放在 GitHub Pages,即時傳訊(階段二)用 Supabase。

- 需求:[docs/requirements.md](docs/requirements.md)
- 架構:[docs/architecture.md](docs/architecture.md)
- 畫面設計:[docs/design.md](docs/design.md)

## 目前狀態:階段一

只有前端,資料是假的(存在瀏覽器裡),還沒有接 Supabase。同一個瀏覽器開兩個分頁,會互相看到對方的訊息與上線。

## 指令

```
npm install        # 第一次使用
npm run dev        # 開發用預覽,網址 http://localhost:5173/yun/
npm run build      # 打包到 dist/(同時檢查型別)
npm run preview    # 預覽打包後的版本,網址 http://localhost:4173/yun/
npm test           # 執行自動測試
```

## 示範與測試用的網址參數

| 參數 | 作用 |
| --- | --- |
| `?demo=1` | 出現假的聊天對象與「示範面板」(可模擬斷線、送太快等) |
| `?grace=3` | 把「離開提示」的等待時間從 30 秒縮短成 3 秒,方便測試 |

例如 `http://localhost:4173/yun/?demo=1&grace=3`

## 資料夾

```
src/
  screens/      代號輸入頁、聊天室
  components/   畫面裡的小零件
  hooks/        聊天室的狀態與動作(useChat)
  service/      聊天服務層:contract(約定)、mock(階段一的假服務)、presence(進出提示邏輯)
  i18n/         五種語言的文字
  rules/        代號格式、網址轉連結、代號顏色等共用規則
docs/           需求、架構、設計
.github/workflows/deploy.yml   推到 main 就自動發佈到 GitHub Pages
```

## 金鑰

不要把 `.env.local` 等金鑰檔案 commit 進 git(`.gitignore` 已排除)。只有 `.env.example` 會進 repo。詳見 docs/architecture.md 第 8 節。
