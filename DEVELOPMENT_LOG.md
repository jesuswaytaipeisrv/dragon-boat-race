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

目前線上資源版本：

```text
styles.css?v=20260617-6
app.js?v=20260617-6
```

因為當時環境沒有 GitHub CLI，且 Chrome 沒有可用的 Codex Chrome Extension，所以 Pages 是透過推送 `gh-pages` 分支啟用。2026-06-16 再次以 `git push origin main` 與 `git push origin main:gh-pages` 部署。部署後需確認 GitHub Pages 回 `200 OK`，且 HTML 引用最新的 `styles.css` 與 `app.js` cache-busting 版本。

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
- GitHub Pages 首頁引用 `styles.css?v=20260617-6` 與 `app.js?v=20260617-6`。
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
   <link rel="stylesheet" href="./styles.css?v=20260616-4" />
   <script type="module" src="./app.js?v=20260616-4"></script>
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

- `README.md` 補上當時最新部署 commit `c5f16c6`、2026-06-16 部署狀態、GitHub Pages 新版 HTML 與 `app.js?v=20260614-1`。
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
- GitHub Pages 部署後確認：
  - `main` 與 `gh-pages` 均指向 `0b91052 Enhance race visual effects`。
  - 公開主持頁回 `200 OK`。
  - 公開 HTML 已引用 `styles.css?v=20260616-1` 與 `app.js?v=20260616-1`。
  - 部署版 CSS 已包含 `fishJump`、第五層浪花與 `finalPush`。
  - 部署版 JS 已包含 `leaderEffort` 與 `leader-effort`。

限制：

- 本次環境的 in-app Browser 先前回報不可用，因此尚未做自動化瀏覽器截圖或實際點擊視覺驗證。
- 正式活動前仍建議用主持頁實際跑一輪比賽，確認浪花、魚跳與終點前領隊表情符合現場大螢幕效果。

## 2026-06-16 視覺更新後文件同步

目的：補齊視覺更新部署後的文件狀態，避免 README 與使用說明只停留在前次 code review commit。

本次更新：

- `README.md` 補上目前部署 commit `0b91052 Enhance race visual effects`。
- `USER_GUIDE.md` 補上目前部署 commit，並把目前部署描述改為同時包含 code review 修正與視覺效果更新。
- `DEVELOPMENT_LOG.md` 將 GitHub 部署現況更新為 `0b91052`，並補上 GitHub Pages 已回新版 HTML、CSS、JS 的部署後檢查結果。

## 2026-06-16 結果排名與按擊回饋修正

需求：

- 比賽結果要依照名次由上往下排列，第一名隊伍要特別凸顯文字。
- 剛開始玩時按「划！」後數字有延遲，要改善按一陣子才看到數字的感覺。

本次修改：

- `app.js`：新增 `getRaceRanking()`，結果列表優先使用 `state.winner` 作為第一名，其餘隊伍再依距離、總按擊數與固定隊伍順序排序。
- `app.js`：結果列表改為顯示 `1 名`、`2 名`、`3 名`，第一名項目加上 `.winner` class。
- `styles.css`：新增 `.results li.winner` 樣式，用金色背景、左側金色標記與加粗字體凸顯第一名。
- `app.js`：新增 `optimisticClickTotal`。玩家按下「划！」時立即更新本機顯示，不等 Firebase 批次送出與伺服器回寫。
- `app.js`：隊伍按擊數也會加上本機尚未被 Firebase 確認的點擊數，減少剛開始按時隊伍數字不動的延遲感。
- `index.html`：資源版本更新為 `styles.css?v=20260616-2` 與 `app.js?v=20260616-2`。

驗證：

- `node --check app.js` 通過。
- DOM selector 靜態檢查通過。
- 本機 HTTP server smoke test 通過：
  - `http://127.0.0.1:5173/` 回 `200 OK`。
  - `http://127.0.0.1:5173/?view=host&room=DRAGON` 回 `200 OK`。
  - `http://127.0.0.1:5173/?view=join&room=DRAGON` 回 `200 OK`。
- 本機 HTML 已確認引用 `styles.css?v=20260616-2` 與 `app.js?v=20260616-2`。

限制：

- 本次仍未做自動化瀏覽器點擊驗證。正式活動前建議用至少一支手機確認按下「划！」後個人與隊伍數字立即增加，並跑完一場確認結果排序與第一名凸顯。

## 2026-06-16 排名判定與初期按擊延遲再修正

來源：使用者截圖顯示紅隊 `180 公尺 · 174 下` 被列第一名，藍隊 `180 公尺 · 221 下` 被列第二名；使用者也回報剛開始手機按擊次數顯示仍有延遲。

原因判斷：

- 原本 `runRaceTicker()` 在多隊同一 tick 抵達終點時，以「當下瞬間速度」優先決定 `state.winner`，總按擊數只作第二順位。
- 結果列表又會把 `state.winner` 強制放在第一名，因此可能出現距離相同但總按擊較少的隊伍被列第一。
- 手機按擊數已加入本機樂觀顯示，但若使用者手機仍載到舊資源，或等待 Firebase 批次回寫，仍可能感覺剛開始數字慢。

本次修正：

- `app.js`：終點同 tick tie-break 改為總按擊數優先，再比瞬間速度，最後才用固定隊伍順序。
- `app.js`：`getRaceRanking()` 不再無條件把 `state.winner` 放第一；結果排名改為距離優先、總按擊數第二、既有 winner 僅作更後面的 tie-break。
- `app.js`：Firebase click flush 間隔由 `650ms` 降為 `420ms`，讓初期按擊更快同步到伺服器，同時仍保留批次降低寫入壓力。
- `index.html`：資源版本更新為 `styles.css?v=20260616-4` 與 `app.js?v=20260616-4`，強制手機載入新邏輯。

驗證：

- `node --check app.js` 通過。
- DOM selector 靜態檢查通過。
- 本機 HTTP server smoke test 通過：
  - `http://127.0.0.1:5173/` 回 `200 OK`。
  - `http://127.0.0.1:5173/?view=host&room=DRAGON` 回 `200 OK`。
  - `http://127.0.0.1:5173/?view=join&room=DRAGON` 回 `200 OK`。
- 本機 HTML 已確認引用 `styles.css?v=20260616-4` 與 `app.js?v=20260616-4`。

限制：

- 仍需用手機真機確認按擊數字的實際手感，尤其是現場 Wi-Fi 與手機瀏覽器快取狀態。

## 2026-06-16 Claude Code Review 追修

來源：`/Users/garyhuang/Documents/Claude/Projects/dragon-boat-race/CODE_REVIEW_2026-06-16.md`。

已修正：

- P0-1：`createFirebaseStore.setPlayers()` 由整包 `set()` 改為 `update()`；本地 store 也改為 merge players，避免分隊或重設時覆蓋同時間新加入的玩家。
- P0-2：倒數 interval 在 `state.status !== "countdown"` 或 `countdownEndsAt` 為空時會立即清除，不再讓 `null` 被 coercion 成 `0` 後誤觸發開賽。
- P0-3：速度加成上限由硬上限 `3` 改為 `SPEED_BOOST_CAP = 8`，並改用 `pace` 直接反映每人按擊頻率，讓快慢隊伍差距更明顯。
- P2-1：玩家手機畫面新增倒數顯示，倒數期間會看到 `3/2/1/GO`。
- P2-2：隨機分隊由 `sort(() => Math.random() - 0.5)` 改為 Fisher-Yates shuffle。
- P2-3：倒數結束到開賽改由 `syncHostTimers()` 統一處理，`startRace()` 只寫入倒數狀態，降低雙 interval 路徑風險。
- P1-1：新增 `.gitignore`，排除 `.DS_Store`、log、暫存檔、node_modules、coverage、dist、`.env*` 與 service account JSON。因 GitHub Pages 直接 import `firebase-config.js`，目前保留該 Firebase web config 並在 `CLAUDE.md` 說明它不是 server secret。
- 新增 `CLAUDE.md`，記錄專案結構、Firebase config 取捨、接手順序與快速檢查指令。

暫不修正：

- P1-2：Realtime Database rules 防作弊需要 Firebase Auth 或其他主持人權限機制，屬架構級改動；目前維持免登入活動流程，先列為正式公平競賽前需另行評估。
- P2-4：host ticker transaction 化會增加資料模型與同步複雜度，目前仍用單 host owner 推進與 `await` 控制節奏。
- P2-5：停手玩家的舊 recent buckets 不影響速度計算，仍會在玩家下一次點擊或重設時清理。
- P2-6：賽道長度滑桿拖曳被回呼打斷屬低機率 lobby 操作問題，先觀察。

版本：

- `index.html` 已更新為 `styles.css?v=20260616-4` 與 `app.js?v=20260616-4`。

驗證：

- `git diff --check` 通過。
- `node --check app.js` 通過。
- `firebase-database.rules.json` JSON parse 通過。
- DOM selector 靜態檢查通過。
- Claude review 重點靜態檢查通過：Firebase `setPlayers()` 使用 `update()`、local store merge players、倒數 null guard、`SPEED_BOOST_CAP = 8`、Fisher-Yates helper 均存在。
- `.gitignore` 已確認會排除 `.env`、service account JSON、log 與 `.DS_Store`。
- 本機 HTTP server smoke test 通過：
  - `http://127.0.0.1:5173/` 回 `200 OK`。
  - `http://127.0.0.1:5173/?view=host&room=DRAGON` 回 `200 OK`。
  - `http://127.0.0.1:5173/?view=player&room=DRAGON` 回 `200 OK`。
- 本機 HTML 已確認引用 `styles.css?v=20260616-4`、`app.js?v=20260616-4`，並包含 `#playerCountdown`。

## 2026-06-17 Claude Review 文件補強

目的：依使用者要求，確認 Claude 要求 Codex 修改的項目已完整記入專案文件，而不只留在對話紀錄。

本次文件更新：

- `README.md`：在目前狀態補上 2026-06-16 Claude review 追修摘要，並加入最新追修 commit `9102038 Address Claude review issues`。
- `USER_GUIDE.md`：在部署狀態補上 Claude review 追修摘要，並註明暫不處理項目已記錄於 `DEVELOPMENT_LOG.md`。
- `DEVELOPMENT_LOG.md`：保留逐項紀錄：
  - 已修：P0-1、P0-2、P0-3、P1-1、P2-1、P2-2、P2-3。
  - 暫不修：P1-2、P2-4、P2-5、P2-6。
  - 驗證：`git diff --check`、`node --check app.js`、Rules JSON parse、DOM selector、Claude review 重點靜態檢查、`.gitignore` 檢查、本機 HTTP smoke test。

目前結論：

- Claude 要求 Codex 修改且本輪採納的項目，已寫入 `README.md`、`USER_GUIDE.md`、`DEVELOPMENT_LOG.md` 與 `CLAUDE.md`。
- 需要 Firebase Auth 或主持人權限機制的防作弊項目未直接實作，因為會改變免登入活動架構；保留為正式公平競賽前的架構決策。

## 2026-06-17 固定房間 finished 狀態修正

來源：使用者回報龍舟專案「好像壞了」。檢查固定 `DRAGON` 房間 Firebase 資料時，發現房間為 `status: "finished"`，但 `raceLength: 180`、紅藍位置都只有 `92`；同時資料中的 `winner` 是紅隊，但藍隊總按擊較高，造成標題與結果排名可能不一致。

原因判斷：

- 目前程式使用賽道長度作為終點距離；舊資料可能保留早期以 `FINISH_X_PERCENT = 92` 作為終點座標的結果。
- 2026-06-16 的排名修正已讓結果列表依距離與總按擊排序，但 finished 標題仍直接使用舊的 `winner` 欄位。

本次修改：

- Commit message：`Fix stale finished room results`。
- `app.js`：新增 `normalizePositions()`，在讀到舊版 finished 資料且最大位置為 92% 視覺終點時，轉換為目前賽道長度座標，避免顯示「未到終點卻 finished」。
- `app.js`：finished 標題改用 `getRaceRanking()` 的第一名，與結果列表一致，不再盲信舊 `winner` 欄位。
- `index.html`：資源版本更新為 `styles.css?v=20260617-1` 與 `app.js?v=20260617-1`，避免手機與 GitHub Pages 快取舊邏輯。
- `README.md`、`USER_GUIDE.md`、`DEVELOPMENT_LOG.md`：同步目前狀態與操作檢查版本。

驗證：

- `node --check app.js` 通過。
- `git diff --check` 通過。
- Firebase rules JSON parse 通過。
- 本機 HTTP server smoke test 通過：
  - `http://127.0.0.1:5173/` 回 `200 OK`。
  - `http://127.0.0.1:5173/?view=host&room=DRAGON` 回 `200 OK`。
  - `http://127.0.0.1:5173/?view=join&room=DRAGON` 回 `200 OK`。
  - `http://127.0.0.1:5173/app.js?v=20260617-1` 回 `200 OK`。
- 函式級案例驗證通過：舊資料 `red=92`、`blue=92`、`raceLength=180` 會正規化為紅藍都到 `180`，且標題與排行榜第一名同為藍隊。

限制：

- 本環境的內建瀏覽器不可用，且沒有 Playwright、Puppeteer 或 jsdom，因此仍未做自動化瀏覽器點擊驗證。
- 正式活動前仍建議用 2-3 支手機跑一輪掃 QR、加入、分隊、開始、按擊、結束與重設。

## 2026-06-17 Claude BUGS_TODO A/B/C 修正

來源：`/Users/garyhuang/Documents/Claude/Projects/dragon-boat-race/BUGS_TODO_2026-06-17.md`。

本次修正：

- Bug A：新增 `hostHeartbeatAt`、`HOST_HEARTBEAT_MS`、`HOST_TAKEOVER_TIMEOUT_MS`、`claimHostIfStale()` 與 `syncHostTakeoverTimer()`。開賽主持頁會在倒數與比賽推進時更新 heartbeat；若主持頁關閉或當機，新主持頁會在舊 heartbeat 逾時後接手 `hostId`，再由 watch 回呼確認 owner 後繼續倒數或 race ticker。
- Bug B：Firebase 新房間初始化由 `set(roomRef, createEmptyState(roomCode))` 改為子欄位 `update()`；若 room 不存在，使用 `createInitialRoomPatch()` 建立基本欄位；若玩家先加入導致 room 已存在但缺基本欄位，使用 `createMissingRoomPatch()` 補齊，不覆蓋既有 active room 狀態。
- Bug B：`firebase-database.rules.json` 新增 `hostHeartbeatAt` 欄位 `.write` 規則，允許數字或 null。
- Bug C：新增 `logStoreError()`，並替加入房間、賽道長度更新、按擊送出、開始比賽、倒數轉換、race ticker、重設比賽、房間初始化與 room listener 補上 catch/log，避免 Firebase 寫入失敗無聲。
- `index.html`：資源版本更新為 `styles.css?v=20260617-2` 與 `app.js?v=20260617-2`。
- `README.md`、`USER_GUIDE.md`、`DEVELOPMENT_LOG.md`：同步目前狀態、操作提示與驗證紀錄。

驗證：

- `node --check app.js` 通過。
- `python3 -m json.tool firebase-database.rules.json` 通過。
- `git diff --check` 通過。
- 本機 HTTP server smoke test 通過：
  - `http://127.0.0.1:5173/` 回 `200 OK`。
  - `http://127.0.0.1:5173/?view=host&room=DRAGON` 回 `200 OK`。
  - `http://127.0.0.1:5173/?view=join&room=DRAGON` 回 `200 OK`。
  - `http://127.0.0.1:5173/app.js?v=20260617-2` 回 `200 OK`。
- Firebase REST 臨時房間 `CODEX_BUG_CHECK` 寫入、讀回與刪除通過，包含 `hostHeartbeatAt` 欄位。
- Claude bug A/B/C 靜態驗收通過：
  - `hostHeartbeatAt` 存在。
  - `HOST_TAKEOVER_TIMEOUT_MS` 與 `claimHostIfStale()` 存在。
  - `hostTakeoverTimer` 與 `syncHostTakeoverTimer()` 存在，避免新主持頁開啟時 heartbeat 尚未逾時但之後沒有 state 更新而無法接手。
  - root room `set(roomRef, createEmptyState(roomCode))` 已移除。
  - `createInitialRoomPatch()`、`createMissingRoomPatch()` 與子欄位 `update(roomRef, patch)` 已存在。
  - rules 已包含 `hostHeartbeatAt`。
  - `catch` 數量增加到 12，`console.error` 統一透過 `logStoreError()` 與既有分隊錯誤紀錄。

限制：

- 本環境內建瀏覽器不可用，且沒有 Playwright、Puppeteer 或 jsdom，因此尚未自動化驗收「關閉主持頁後新主持頁接手」的真瀏覽器流程。
- 正式活動前仍建議用兩個主持分頁與 1-2 支手機實測：開始倒數後關掉原主持頁，重開同房間主持頁，確認數秒後倒數或比賽推進會恢復。

## 2026-06-17 開始比賽即時回饋修正

來源：使用者回報按「開始比賽」完全沒反應。

檢查結果：

- 公開 GitHub Pages no-cache 版本已載入 `app.js?v=20260617-2`，且包含 Claude bug A/B/C 修正。
- 固定 `DRAGON` 房間目前有 2 位玩家且 `status: "finished"`，按鈕理論上不應 disabled。
- Firebase REST 以臨時房間 `CODEX_START_CHECK` 模擬 `startRace()` 的 update 成功，代表目前 rules 允許 `status: "countdown"`、`countdownEndsAt`、`positions`、`hostId`、`hostHeartbeatAt` 等開始比賽欄位寫入。
- 函式級測試確認目前 `DRAGON` 型態資料下，`startRace()` 會送出 countdown update。

本次修改：

- `app.js`：`startRace()` 按下後立即在主持畫面顯示「正在開始比賽...」，並暫時停用開始按鈕，避免 Firebase 回寫前看起來完全沒有反應。
- `app.js`：若沒有玩家，主持畫面會提示「請先等待玩家加入」。
- `app.js`：若 Firebase 寫入失敗，主持畫面會顯示「開始失敗，請檢查網路或 Firebase Rules」，並重新啟用開始按鈕。
- `index.html`：資源版本更新為 `styles.css?v=20260617-3` 與 `app.js?v=20260617-3`。
- `README.md`、`USER_GUIDE.md`、`DEVELOPMENT_LOG.md`：同步目前狀態與操作提示。

驗證：

- `node --check app.js` 通過。
- `python3 -m json.tool firebase-database.rules.json` 通過。
- `git diff --check` 通過。
- Firebase REST 臨時房間 `CODEX_START_CHECK` 建立、開始比賽 update 與刪除通過。
- 函式級測試確認 `startRace()` 在 finished 且已有玩家狀態會送出 countdown update。

限制：

- 本環境仍無法做真瀏覽器點擊驗收；若使用者畫面仍無反應，請先 hard reload 或用 `?cache=20260617-3` 確認載到新版，並觀察主持畫面是否出現「正在開始比賽...」或失敗提示。

## 2026-06-17 清空舊玩家功能

來源：使用者回報固定房間開啟後已有兩個舊使用者，主持頁無法刪除，導致無法重新測試。

本次修改：

- `index.html`：主持動作區新增「清空玩家」按鈕。
- `app.js`：新增 `clearPlayers()`，會要求確認後清空 `players`，並將房間重設為 lobby、清空 positions、winner、倒數與 host heartbeat。
- `app.js`：Firebase store 新增 `clearPlayers()`，使用 `set(rooms/{room}/players, null)` 刪除玩家節點；local store 則改回空 players 物件。
- `index.html`：資源版本更新為 `styles.css?v=20260617-6` 與 `app.js?v=20260617-6`。
- `README.md`、`USER_GUIDE.md`、`DEVELOPMENT_LOG.md`：同步目前狀態與操作說明。

驗證：

- `node --check app.js` 通過。
- `python3 -m json.tool firebase-database.rules.json` 通過。
- `git diff --check` 通過。
- 靜態檢查確認 `#clearPlayers`、`clearPlayers()`、Firebase/local store `clearPlayers()` 與 `app.js?v=20260617-6` 均存在。
- Firebase REST 臨時房間 `CODEX_CLEAR_CHECK` 驗證通過：建立舊玩家、刪除 `players`、重設 room 為 lobby、讀回確認 players 已消失，並刪除測試房間。

後續處理：

- 部署完成後會清理固定 `DRAGON` 房間中的舊 players，讓使用者可直接重新加入測試。

## 2026-06-17 玩家端倒數卡住修正

來源：使用者截圖顯示玩家手機停在紅隊畫面，狀態為「準備」、倒數顯示 `1`，按「划！」沒有反應。

原因判斷：

- 玩家頁原本只在 Firebase room state 更新時重畫倒數與按鈕狀態。
- 倒數期間如果沒有新的 Firebase state push，手機端可能停在最後一次收到的 `1`，`canPaddle()` 仍因 `state.status === "countdown"` 而保持 disabled。

本次修改：

- `app.js`：新增 `playerUiTimer`，玩家頁每 250ms 更新倒數文字、狀態與按鈕 disabled 狀態。
- `app.js`：新增 `effectivePlayerStatus()` 與 `hasCountdownEnded()`；當本機時間已超過 `countdownEndsAt` 時，玩家端視為 racing，允許按「划！」。
- `index.html`：資源版本更新為 `styles.css?v=20260617-6` 與 `app.js?v=20260617-6`。
- `README.md`、`USER_GUIDE.md`、`DEVELOPMENT_LOG.md`：同步目前狀態與排查說明。

驗證：

- `node --check app.js` 通過。
- 函式級測試確認 countdown 未到期時 `canPaddle()` 為 false，倒數到期後 `canPaddle()` 會變 true。

限制：

- 本環境仍無法做真手機瀏覽器點擊驗收；使用者測試時請以 `?cache=20260617-6` 避開舊快取。

## 2026-06-17 玩家加入需第二次修正

來源：使用者回報玩家輸入姓名後，常常要按第二次加入才成功。

原因判斷：

- 玩家加入成功後會立即跳到玩家頁。
- 玩家頁第一個 Firebase snapshot 有機會還沒包含剛寫入的 player；舊邏輯一看到 `state.players[playerId]` 不存在就立刻導回加入頁。
- 使用 cache query 測試時，`makePlayerUrl()` 也沒有保留 `cache` 參數，跳頁後可能載到舊版資源。

本次修改：

- `app.js`：加入成功後用 `sessionStorage` 記錄 5 秒 recent join grace period。
- `app.js`：玩家頁若暫時找不到自己的 player，但仍在 recent join grace period 內，顯示「正在加入 / 同步中」並等待下一次 Firebase 更新，不立即導回加入頁。
- `app.js`：`makePlayerUrl()` 與玩家不存在時回 join 的 URL 都會保留 `cache` query 參數，避免跳頁後載入舊 JS。
- `index.html`：資源版本更新為 `styles.css?v=20260617-6` 與 `app.js?v=20260617-6`。
- `README.md`、`USER_GUIDE.md`、`DEVELOPMENT_LOG.md`：同步目前狀態與排查說明。

驗證：

- `node --check app.js` 通過。
- 函式級檢查確認 `markRecentJoin()`、`isRecentJoinPending()`、`makePlayerUrl()` cache 保留與 `makeJoinPageUrl()` 均存在。

限制：

- 本環境仍無法做真手機瀏覽器加入流程點擊驗收；使用者測試時請以 `?cache=20260617-6` 避開舊快取。
