# Prompt Words — AI 影片提示詞導演台

Prompt Words 是 React + TypeScript + Vite 的影片提示詞工作台。除了原有的 Seedance／Grok 表單組裝與模板功能，現在可透過多種 LLM 將草稿優化成完整的雙語影片提示詞、負面提示詞與分鏡節拍，並保存到本機 SQLite 資料庫。

## 新功能

- OpenRouter、DeepSeek V4 Pro、Sakana AI / Fugu 與自訂 OpenAI-compatible 供應商
- API Key 可由介面暫時輸入，或改用伺服器環境變數
- AI 導演流程：構想 → 現有草稿 → 視覺風格／運鏡／限制 → 結構化提示詞
- 繁體中文、英文或雙語輸出
- 自動產生 negative prompt 與 shot plan
- 使用 Node 內建 SQLite 儲存、收藏、載入與刪除提示詞
- API Key 不會寫入 localStorage 或資料庫
- 開發模式由 Vite 直接掛載 API；正式模式由 Node 同時提供 API 與 `dist` 靜態網站

## 系統需求

- Node.js 22.12 或以上版本（使用內建 `node:sqlite`）
- npm 10 或以上版本

## 安裝

```bash
npm install
cp .env.example .env
npm run dev
```

開發網站預設位於 `http://localhost:5173`。Vite 會直接掛載 `/api`，不需要額外啟動後端程序。

專案的 `dev` 與 `start` 指令會自動讀取存在的 `.env`；介面中輸入 API Key 時則不需要設定伺服器 Key。

Windows PowerShell 範例：

```powershell
$env:DEEPSEEK_API_KEY="你的金鑰"
npm run dev
```

## AI 供應商

### OpenRouter

- Base URL：`https://openrouter.ai/api/v1`
- 模型可直接填 OpenRouter model slug
- 預設模型可由 `OPENROUTER_MODEL` 調整

### DeepSeek

- Base URL：`https://api.deepseek.com`
- 預設模型：`deepseek-v4-pro`
- 對 V4 Pro 自動開啟高推理設定

### Sakana AI / Fugu

Sakana Fugu 可能依帳戶、Beta 或正式 API 文件提供不同的 Base URL，因此專案不硬編碼未確認端點。請設定：

```bash
SAKANA_BASE_URL=https://你的實際端點/v1
SAKANA_MODEL=你的模型ID
SAKANA_API_KEY=你的金鑰
```

設定完成後，Sakana 選項會自動啟用。

## 建置與正式執行

```bash
npm run build
npm start
```

正式服務預設位於 `http://localhost:8787`，可透過 `PORT` 修改。

## 驗證

```bash
npm run verify
```

`verify` 會依序執行 lint、Node 內建整合測試與正式建置。整合測試涵蓋正式靜態資源服務、路徑穿越防護、JSON 請求限制，以及 SQLite 提示詞的新增、更新、收藏、查詢與刪除。

## 資料庫

預設資料庫檔案：

```text
data/prompt-words.db
```

可用 `PROMPT_WORDS_DB` 修改位置。資料庫只保存提示詞、供應商／模型資訊、構想與生成設定，不保存 API Key。

## API

- `GET /api/health`
- `GET /api/providers`
- `POST /api/generate`
- `GET /api/prompts`
- `POST /api/prompts`
- `PATCH /api/prompts/:id/favorite`
- `DELETE /api/prompts/:id`

## 安全建議

- 公開部署時，優先使用伺服器環境變數，不要讓多人共用瀏覽器輸入高權限 API Key。
- 正式環境應在反向代理層加入登入、速率限制、HTTPS 與請求大小限制。
- Sakana／自訂供應商可在本機介面輸入 Base URL；公開部署時應改用伺服器環境變數與端點允許清單，避免未受信任使用者把服務當成網路代理。
