# 龍舟衝刺開發紀錄

## 專案目標

建立一個可在手機瀏覽器玩的多人龍舟競賽。主持人開房間，參加者用手機加入，系統隨機分成三隊。玩家連續按手機畫面的「划！」按鈕，隊伍依照最近幾秒的按擊速度推動龍舟由右往左前進。

## 技術選型

- 前端：純 HTML、CSS、JavaScript ES module。
- 部署：GitHub Pages 靜態網站。
- 即時同步：Firebase Realtime Database。
- 本機 demo：未設定 Firebase databaseURL 時，自動退回 localStorage + BroadcastChannel。
- 不使用 npm build：降低部署與接手門檻，直接把檔案放到 GitHub Pages 即可。

## 主要檔案

- `index.html`：單頁應用入口，包含主持、加入、玩家畫面的 template。
- `styles.css`：全站樣式、主持賽道、手機玩家控制器、龍舟舞台。
- `app.js`：遊戲狀態、Firebase/localStorage store、分隊、倒數、速度與龍舟渲染。
- `firebase-config.js`：Firebase Web App 設定。
- `firebase-config.example.js`：Firebase 設定範例。
- `README.md`：簡版專案說明。
- `USER_GUIDE.md`：操作與部署說明。
- `DEVELOPMENT_LOG.md`：本檔，記錄目前開發狀態與交接資訊。

## 已完成功能

- 主持人畫面：
  - 顯示房間碼。
  - 顯示玩家加入網址。
  - 顯示 QR code。
  - 隨機分成紅、藍、綠三隊。
  - 開始比賽倒數。
  - 重設比賽。
  - 三條賽道顯示龍舟、總按擊、速度、隊員數。

- 玩家手機畫面：
  - 輸入名字加入指定房間。
  - 顯示自己隊伍。
  - 以隊伍顏色作為全螢幕背景。
  - 超大「划！」按鈕。
  - 顯示個人按擊與全隊按擊。

- 遊戲視覺：
  - 龍舟由右往左前進。
  - 每艘船使用隊伍色。
  - 船頭有可愛卡通人物。
  - 船身上有小人幫忙划船。
  - 小人衣服與隊伍顏色連動。
  - 船開始移動後會顯示浪花尾跡。
  - 浪花用 CSS 動畫呈現，不需要額外圖檔。

- 同步與資料：
  - Firebase Realtime Database store。
  - localStorage demo store。
  - Firebase 設定不完整時不讓主畫面空白，而是退回本機 demo。

## 重要修正紀錄

1. Firebase 設定檔格式修正

   Firebase Console 產生的範例會包含：

   ```js
   import { initializeApp } from "firebase/app";
   ```

   這個專案是瀏覽器靜態 ES module，不走 npm 打包，所以 `firebase-config.js` 只應匯出設定：

   ```js
   export const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     databaseURL: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

2. Firebase Ready 判斷修正

   原本只檢查 `apiKey`，導致已貼 Web App 設定但還沒有 `databaseURL` 時，程式嘗試啟動 Firebase 並失敗。現在 `isFirebaseReady` 會同時檢查 `databaseURL`。

3. 龍舟速度邏輯修正

   原本每隊都有一點基礎速度，導致沒人按的隊伍也會前進。現在只有最近速度 `pace > 0` 的隊伍才會前進。

4. 瀏覽器快取修正

   `index.html` 的 app script 加上版本參數：

   ```html
   <script type="module" src="./app.js?v=20260613-3"></script>
   ```

   修改 `app.js` 後，如果瀏覽器仍吃舊檔，可更新版本參數。

5. 浪花效果新增

   每條賽道在龍舟後方新增 `.wake` 元素，位置與龍舟同樣使用 `--x` 變數跟著船移動。只有在比賽中且船已移動或最近有速度時，才加上 `.wake.active` 顯示浪花。

   相關檔案：

   - `app.js`：在每條 lane 裡渲染 `.wake`。
   - `styles.css`：定義 `.wake`、`.wake span` 與 `@keyframes wakePulse`。
   - `index.html`：`styles.css` 加上版本參數，避免瀏覽器快取舊 CSS。

6. 多人遊玩 lag 初步優化

   實際手機多人連按時，主要壓力來自玩家端高頻率寫入 Firebase。原本每 240ms 送出一次，且每次使用兩個 transaction 更新總按擊與最近按擊桶。現在改成：

   - 玩家端每 650ms 批次送出一次，手機按鈕仍保留即時本機回饋。
   - 最近按擊統計桶由 500ms 改為 1000ms，降低資料節點變動頻率。
   - Firebase 寫入由兩次 transaction 改為一次 multi-location `increment()` update。
   - 主持端龍舟位置更新由 400ms 調整為 500ms，降低全房間同步更新量。
   - `index.html` 的 `app.js` 版本參數更新，避免手機瀏覽器吃舊版。

## Firebase 現況

目前 `firebase-config.js` 已填入 Firebase 專案設定，包含：

- `projectId`: `dragon-boat-race`
- `databaseURL`: `https://dragon-boat-race-default-rtdb.asia-southeast1.firebasedatabase.app`

曾用 REST API 測試寫入：

```bash
curl -s -X PUT 'https://dragon-boat-race-default-rtdb.asia-southeast1.firebasedatabase.app/rooms/CODEX_TEST.json' \
  -H 'Content-Type: application/json' \
  -d '{"status":"lobby","players":{"codex":{"name":"CodexTest","team":"red","clicks":1}}}'
```

測試結果成功，代表 Realtime Database URL 與 Rules 當時允許寫入。

## 建議 Database Rules

目前活動測試可以先用寬鬆規則：

```json
{
  "rules": {
    "rooms": {
      "$room": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

正式長期公開前，建議補上欄位驗證與資料大小限制。

## 本機測試紀錄

本機啟動：

```bash
python3 -m http.server 5173
```

主持頁：

```text
http://127.0.0.1:5173/?view=host&room=MXOU
```

玩家頁：

```text
http://127.0.0.1:5173/?view=join&room=MXOU
```

手機連本機測試時，不可用 `127.0.0.1`，要用同 Wi-Fi 下 Mac 的區網 IP。例如之前測到：

```text
http://192.168.1.109:5173/?view=join&room=MXOU
```

正式部署到 GitHub Pages 後，就不需要本機 IP。

最近使用過的測試房間：

- `MXOU`
- `LIVEO9`

目前使用者瀏覽器曾停在：

```text
http://127.0.0.1:5173/?view=host&room=LIVEO9&wake=1
```

這只是本機測試網址。正式活動請使用 GitHub Pages 網址。

## Codex CLI 接手建議

1. 先進入專案資料夾：

   ```bash
   cd /Users/garyhuang/Documents/Codex/2026-06-13/github/dragon-boat-race
   ```

2. 檢查語法：

   ```bash
   node --check app.js
   ```

3. 啟動本機靜態伺服器：

   ```bash
   python3 -m http.server 5173
   ```

4. 開主持頁與玩家頁，跑一輪加入、分隊、開始、按擊。

5. 若要推 GitHub，建議先確認是否要把 `firebase-config.js` 直接 commit。
   Firebase Web API key 不是傳統伺服器密鑰，但公開部署仍建議配合 Database Rules 控制權限。

6. 若修改 `app.js` 或 `styles.css`，請同步更新 `index.html` 的版本參數，避免 GitHub Pages 或瀏覽器快取舊資源：

   ```html
   <link rel="stylesheet" href="./styles.css?v=20260613-2" />
   <script type="module" src="./app.js?v=20260613-3"></script>
   ```

7. 推 GitHub 前建議更新本文件與 `USER_GUIDE.md`，讓活動操作紀錄保持最新。

## 待辦建議

- 增加 GitHub Pages 部署用文件或 GitHub Actions。
- 增加 Firebase Rules 的正式版。
- 加入主持人房間清除功能，避免測試資料累積。
- 增加遊戲時間制，例如 30 秒倒數結束後用距離排名。
- 增加多人壓力測試。
- 手機端可以加震動回饋 `navigator.vibrate`，但需注意瀏覽器支援度。
- 增加「固定活動房間」設定，例如預設 `room=DRAGON`，讓玩家只需輸入名字。
- 增加可選的音效或終點慶祝畫面。
