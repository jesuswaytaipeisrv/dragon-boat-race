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

最近 QA 也確認：

- 可建立 Firebase 臨時房間。
- 可讀回玩家、分隊、按擊、位置與勝利隊伍資料。
- `increment()` server-side 累加可正常使用。
- 測試房間已於測試後刪除。

## GitHub 部署現況

GitHub repo：

```text
https://github.com/jesuswaytaipeisrv/dragon-boat-race
```

GitHub Pages：

```text
https://jesuswaytaipeisrv.github.io/dragon-boat-race/
```

固定測試房間：

```text
https://jesuswaytaipeisrv.github.io/dragon-boat-race/?view=host&room=DRAGON
https://jesuswaytaipeisrv.github.io/dragon-boat-race/?view=join&room=DRAGON
```

目前 `main` 與 `gh-pages` 都指向最新部署 commit：

```text
c5f16c6 Fix race review issues
```

因為當時環境沒有 GitHub CLI，且 Chrome 沒有可用的 Codex Chrome Extension，所以 Pages 是透過推送 `gh-pages` 分支啟用。2026-06-16 再次以 `git push origin main` 與 `git push origin main:gh-pages` 部署，部署後確認 GitHub Pages 回 `200 OK`，且 HTML 已引用 `app.js?v=20260614-1`。

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

最近完成的自動化測試：

- `git diff --check` 通過。
- `node --check app.js` 通過。
- `firebase-database.rules.json` JSON parse 通過。
- GitHub Pages 首頁引用 `app.js?v=20260614-1`。
- 部署版 `app.js`、`styles.css`、Firebase SDK 與 QR code API 均回 `200`。
- 本機 HTTP server smoke test 通過：首頁、主持頁與玩家加入頁均回 `200`。
- DOM id 對應檢查通過，`app.js` 查找的元素與 template 都存在。
- Firebase 臨時房間完整資料流程測試通過。

目前自動化環境限制：

- 本機沒有 Playwright、Puppeteer 或 jsdom。
- Chrome 沒有可用的 Codex Chrome Extension。
- 因此尚未用自動化瀏覽器實際點完 UI；正式活動前仍建議用 2-3 支手機跑一輪掃 QR、加入、分隊、開始、按擊與重設。

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
  <script type="module" src="./app.js?v=20260614-1"></script>
   ```

7. 推 GitHub 後若 Pages 使用 `gh-pages` 分支，請同步推：

   ```bash
   git push origin main
   git push origin main:gh-pages
   ```

8. 推 GitHub 前建議更新本文件與 `USER_GUIDE.md`，讓活動操作紀錄保持最新。

## 待辦建議

- 增加 GitHub Pages 部署用文件或 GitHub Actions。
- 增加 Firebase Rules 的正式版。
- 加入主持人房間清除功能，避免測試資料累積。
- 增加遊戲時間制，例如 30 秒倒數結束後用距離排名。
- 增加多人壓力測試。
- 若現場人數很多仍 lag，進一步把 Firebase listener 拆成房間狀態與玩家統計，並讓主持畫面局部更新而不是整段重畫。
- 手機端可以加震動回饋 `navigator.vibrate`，但需注意瀏覽器支援度。
- 增加「固定活動房間」設定，例如預設 `room=DRAGON`，讓玩家只需輸入名字。
- 增加可選的音效或終點慶祝畫面。

## 2026-06-14 Codex 修正紀錄

來源：`/Users/garyhuang/dragon-boat-race-code-review.md`。

已確認屬實並完成修正：

- Bug 1：`countdownTimer` 清除後未歸 `null`，已補上。
- Bug 2：`raceTicker` 清除後未歸 `null`，已補上。
- Bug 3：多主持頁面會重複推進賽況，已改成開賽分頁寫入 `hostId`，只有該分頁負責倒數轉換與 race ticker。此處沒有採用報告中的 `playerId`，因為同一瀏覽器多分頁會共用 `localStorage` player id；改用 `sessionStorage` 的 `hostSessionId`。
- Bug 4：玩家畫面重新渲染時舊 `flushTimer` 未清除，已在 `renderPlayer()` 開頭清理。
- Bug 5：比賽中拖動賽道長度會重設比賽，已限制只有 lobby 狀態可改，並在非 lobby 時停用滑桿。
- Bug 6：隨機分隊未處理 Firebase 錯誤，已改為 `async/await` 並記錄錯誤。
- Bug 7：速度窗口邊界使用 `<=`，已改為 `<`。
- Bug 8：Firebase click bucket 只清一格，已改成批次清理多個過期 bucket。
- Bug 9：`joinRoom` 有房間初始化競態，已移除加入流程中的 root room `set()`，只寫入玩家節點。
- Bug 10：本地 store 同步 callback 的潛在 DOM 空值問題，已在 host/player 更新函式加上空值防護。
- Bug 11：同 tick 同時到終點由隊伍陣列順序決定，已改為同時抵達時先比當下速度，再比總 clicks，最後才用固定隊伍順序作穩定 tie-break。
- Bug 13：`boatSvg()` 的 `aria-label` 已套用 `escapeHtml()`。
- Bug 14：倒數期間開始按鈕未 disabled，已補上 countdown 狀態。
- Bug 15：賽道長度滑桿對實際賽況無效，已改為以 `state.raceLength` 作為實際終點距離，畫面位置再換算為百分比。

安全項目處理：

- 已新增 `firebase-database.rules.json`，限制 Realtime Database 可寫欄位與資料形狀。
- 這份 rules 仍屬免登入活動用防護，不能真正驗證主持人身份。若要主持人權限、密碼或管理後台，需要加入 Firebase Auth 或 Cloud Functions。

驗證：

- `node --check app.js` 通過。
- `firebase-database.rules.json` JSON parse 通過。
- `index.html` 的 `app.js` cache bust 版本已更新為 `v=20260614-1`。

## 2026-06-16 部署前驗證紀錄

目的：確認 2026-06-14 Claude code review 後的修正可提交並部署。

本次確認：

- `git diff --check` 通過，未發現 whitespace error。
- `node --check app.js` 通過。
- `firebase-database.rules.json` JSON parse 通過。
- 本機靜態伺服器檢查通過：
  - `http://127.0.0.1:5173/` 回 `200 OK`。
  - `http://127.0.0.1:5173/?view=host&room=DRAGON` 回 `200 OK`。
  - `http://127.0.0.1:5173/?view=join&room=DRAGON` 回 `200 OK`。
- HTML 檢查確認仍引用 `styles.css?v=20260613-2` 與 `app.js?v=20260614-1`。
- DOM selector 靜態檢查通過，`app.js` 查找的 `#id` 均存在於 `index.html`。
- 主要資源檔存在性檢查通過：`app.js`、`styles.css`、`firebase-config.js`。

限制：

- 本次環境的 in-app Browser 回報不可用，因此未做自動化瀏覽器點擊測試。
- 正式活動前仍建議用 2-3 支手機實測 QR code、輸入名字、分隊、倒數、按擊與重設。

部署方式：

- 提交後推送 `main`。
- 因 GitHub Pages 目前使用 `gh-pages` 分支發布，再同步推送 `main:gh-pages`。

## 2026-06-16 文件同步紀錄

目的：依部署後狀態同步專案文件，讓 README、使用說明與開發紀錄都能反映最新版本。

本次更新：

- `README.md` 補上最新部署 commit `c5f16c6`、2026-06-16 部署狀態、GitHub Pages 新版 HTML 與 `app.js?v=20260614-1`。
- `README.md` 與 `USER_GUIDE.md` 將 Realtime Database Rules 的正式建議改為套用 `firebase-database.rules.json`，並保留寬鬆 read/write rules 作為短期測試排除問題用。
- `USER_GUIDE.md` 補上 Claude code review 修正摘要、最新 cache-busting 版本、部署驗證紀錄與 in-app Browser 不可用的測試限制。
- `DEVELOPMENT_LOG.md` 更新舊的最新 commit 與測試紀錄，避免仍指向 `76befec` 或 `app.js?v=20260613-4`。

尚需人工確認：

- Firebase Console 的 Realtime Database Rules 是否已實際套用 `firebase-database.rules.json`。
- 正式活動前仍需以 2-3 支手機實測 QR code、加入、分隊、倒數、按擊與重設。

## 2026-06-16 視覺效果更新

需求：讓龍舟滑行時浪花更大、更誇張；湖面隨機出現魚跳出水面；龍舟接近終點時，船頭領隊表情變得更用力、更有奪冠感。

本次修改：

- `styles.css`：放大 `.wake` 尺寸，浪花由 3 層增加為 5 層，加入泡沫爆開效果，並加快浪花節奏。
- `index.html`：在主持賽道加入 `.fish-pond` 背景層，放置 5 個不同位置與不同動畫延遲的魚跳元素。
- `styles.css`：新增 `fishJump` 動畫，讓魚以不同節奏從湖面跳出並帶出水花。
- `app.js`：依照龍舟位置計算終點進度，當比賽中進度達 82% 以上時替龍舟加上 `.effort` class。
- `app.js` 與 `styles.css`：船頭領隊新增一般表情與奮力表情兩組 SVG 元素，接近終點時切換為皺眉、瞪眼、咬牙、流汗的衝刺表情，龍舟也會有輕微衝刺抖動。
- `index.html`：資源版本更新為 `styles.css?v=20260616-1` 與 `app.js?v=20260616-1`，避免部署後瀏覽器吃舊檔。

驗證：

- `node --check app.js` 通過。
- DOM selector 靜態檢查通過。
- 本機 HTTP server smoke test 通過：
  - `http://127.0.0.1:5173/` 回 `200 OK`。
  - `http://127.0.0.1:5173/?view=host&room=DRAGON` 回 `200 OK`。
  - `http://127.0.0.1:5173/?view=join&room=DRAGON` 回 `200 OK`。
- 本機 HTML 已確認引用 `styles.css?v=20260616-1`、`app.js?v=20260616-1`，並包含 `.fish-pond`。

限制：

- 本次環境的 in-app Browser 先前回報不可用，因此尚未做自動化瀏覽器截圖或實際點擊視覺驗證。
- 正式活動前仍建議用主持頁實際跑一輪比賽，確認浪花、魚跳與終點前領隊表情符合現場大螢幕效果。
