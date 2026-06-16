# 龍舟衝刺使用說明書

## 一句話說明

主持人開一個房間，玩家用手機掃 QR code 加入。主持人隨機分隊並開始比賽後，玩家一直按「划！」，隊伍按越快，龍舟越快往終點前進。

## 角色

- 主持人：用電腦或平板開主持頁，負責分隊、開始、重設比賽。
- 玩家：用手機開加入頁，輸入名字後按大按鈕划船。
- Firebase：負責把玩家按擊同步到主持畫面。

## 本機測試

在專案資料夾執行：

```bash
python3 -m http.server 5173
```

主持頁：

```text
http://127.0.0.1:5173/?view=host
```

指定房間主持頁：

```text
http://127.0.0.1:5173/?view=host&room=MXOU
```

玩家加入頁：

```text
http://127.0.0.1:5173/?view=join&room=MXOU
```

注意：同一台電腦測試可以用 `127.0.0.1`。手機測試不能用 `127.0.0.1`，必須用電腦的區網 IP。

## 手機連本機測試

1. 確認手機和電腦在同一個 Wi-Fi。
2. 查電腦 IP：

   ```bash
   ipconfig getifaddr en0
   ```

3. 假設 IP 是 `192.168.1.109`，主持頁開：

   ```text
   http://192.168.1.109:5173/?view=host
   ```

4. 玩家手機掃 QR code，或手動開：

   ```text
   http://192.168.1.109:5173/?view=join&room=房間碼
   ```

5. 如果手機打不開，檢查 Mac 防火牆是否擋住 Python 伺服器。

## 正式活動建議流程

正式活動不要依賴開發電腦的 `127.0.0.1` 或區網 IP。請把專案部署到 GitHub Pages。

目前已部署網址：

```text
https://jesuswaytaipeisrv.github.io/dragon-boat-race/
```

固定房間 `DRAGON` 可直接使用：

```text
https://jesuswaytaipeisrv.github.io/dragon-boat-race/?view=host&room=DRAGON
https://jesuswaytaipeisrv.github.io/dragon-boat-race/?view=join&room=DRAGON
```

活動當天：

1. 主持人用現場電腦開 GitHub Pages 網址：

   ```text
   https://你的帳號.github.io/你的repo名稱/?view=host
   ```

2. 主持畫面會顯示房間碼和 QR code。
3. 玩家用手機掃 QR code。
4. 玩家輸入名字後加入。
5. 主持人按「隨機分隊」。
6. 主持人按「開始比賽」。
7. 玩家手機開始按「划！」。
8. 主持畫面顯示三隊龍舟前進。

如果希望活動當天所有人都進入固定房間，可以直接指定房間碼，例如：

```text
https://你的帳號.github.io/你的repo名稱/?view=host&room=DRAGON
```

玩家網址：

```text
https://你的帳號.github.io/你的repo名稱/?view=join&room=DRAGON
```

玩家只需要輸入名字，不需要理解房間碼。

## GitHub Pages 部署

目前已部署到：

```text
https://github.com/jesuswaytaipeisrv/dragon-boat-race
https://jesuswaytaipeisrv.github.io/dragon-boat-race/
```

目前使用 `gh-pages` 分支發布 GitHub Pages，`main` 與 `gh-pages` 都在最新 commit。

目前線上資源版本：

```text
styles.css?v=20260616-2
app.js?v=20260616-2
```

前次 code review 修正 commit：

```text
c5f16c6 Fix race review issues
```

目前部署包含 2026-06-14 Claude code review 後的修正，以及 2026-06-16 視覺與互動更新：放大浪花、湖面魚跳、接近終點時船頭領隊奮力衝刺表情、比賽結果第一名凸顯，以及玩家按「划！」後立即更新個人與隊伍按擊數字。HTML 目前引用 `styles.css?v=20260616-2` 與 `app.js?v=20260616-2`。

若要從零重新部署，最簡單做法是讓 `dragon-boat-race` 內的檔案成為 GitHub repo 根目錄。

```bash
cd /Users/garyhuang/Documents/Codex/2026-06-13/github/dragon-boat-race
git init
git add .
git commit -m "Initial dragon boat race game"
git branch -M main
git remote add origin https://github.com/你的帳號/你的repo名稱.git
git push -u origin main
```

到 GitHub repo：

1. `Settings`
2. `Pages`
3. `Build and deployment`
4. Source 選 `Deploy from a branch`
5. Branch 選 `main` 或 `gh-pages`
6. Folder 選 `/root`
7. 儲存

幾分鐘後會得到公開網址。

部署後請先用公開網址跑一輪，不要只測本機網址。

主持頁範例：

```text
https://你的帳號.github.io/你的repo名稱/?view=host&room=TEST
```

玩家頁範例：

```text
https://你的帳號.github.io/你的repo名稱/?view=join&room=TEST
```

本專案目前部署後快速檢查：

```bash
curl -I https://jesuswaytaipeisrv.github.io/dragon-boat-race/
curl -I "https://jesuswaytaipeisrv.github.io/dragon-boat-race/?view=host&room=DRAGON"
curl -I "https://jesuswaytaipeisrv.github.io/dragon-boat-race/?view=join&room=DRAGON"
```

## Firebase 設定

此專案需要 Firebase Realtime Database。`firebase-config.js` 必須長這樣：

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...firebaseapp.com",
  databaseURL: "https://...firebasedatabase.app",
  projectId: "...",
  storageBucket: "...firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};
```

不要把 Firebase Console 的完整 npm 範例貼進來。不要包含：

```js
import { initializeApp } from "firebase/app";
const app = initializeApp(firebaseConfig);
```

本專案的 `app.js` 會用瀏覽器版 Firebase SDK 自行初始化。

## Realtime Database Rules

正式活動前，建議在 Firebase Console 的 Realtime Database Rules 套用專案內的 `firebase-database.rules.json`。該檔已限制可寫欄位、玩家資料形狀、隊伍值、賽道位置與名稱長度，比全開 read/write 更適合公開活動網址。

這份 rules 仍屬免登入活動用防護，不能真正驗證主持人身份。若未來需要主持人密碼、登入或後台管理，建議加入 Firebase Auth 或 Cloud Functions。

短期本機測試若要排除 rules 造成的問題，可暫時使用：

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

這只適合短期測試。網址長期公開時不要維持全開寫入。

## 實際遊戲操作

主持人：

1. 開主持頁。
2. 等玩家加入。
3. 按「隨機分隊」。
4. 按「開始比賽」。
5. 比賽結束或要重來時按「重設比賽」。

玩家：

1. 掃 QR code 或開加入網址。
2. 輸入名字。
3. 等主持人分隊。
4. 比賽開始後一直按「划！」。

## 效能與 lag

目前已做一版多人連按 lag 初步優化：

- 玩家手機按鈕會立即有本機回饋。
- 玩家按擊會批次送到 Firebase，降低多人同時連按時的寫入壓力。
- 主持畫面龍舟位置更新節奏略降，避免所有裝置收到過高頻率的房間同步。

若現場仍覺得 lag，建議先確認：

- 現場 Wi-Fi 與行動網路是否穩定。
- 玩家是否都使用 GitHub Pages 網址，不要混用本機網址或舊部署。
- 手機瀏覽器是否載到新版，可在網址後加 `?cache=20260616-2` 或重新掃 QR code。
- 參加人數很多時，後續可再做主持畫面局部更新與 Firebase listener 拆分。

## 測試紀錄

最近完成的自動化檢查：

- `node --check app.js` 通過。
- `git diff --check` 通過。
- `firebase-database.rules.json` JSON parse 通過。
- 本機首頁、主持頁與加入頁 URL 回 `200`。
- GitHub Pages 首頁、主持頁與加入頁 URL 回 `200`。
- 部署版 HTML 已更新到 `styles.css?v=20260616-2` 與 `app.js?v=20260616-2`。
- 部署版 `styles.css?v=20260616-2` 與 `app.js?v=20260616-2` 可載入。
- Firebase 臨時房間流程測試通過：建立房間、玩家資料、分隊、按擊統計、結束比賽與刪除測試房間。
- Firebase `increment()` 實際寫入測試通過。

限制：2026-06-16 這次環境的 in-app Browser 回報不可用，因此未做自動化瀏覽器點擊測試。仍建議正式活動前用 2-3 支手機實際跑一次掃 QR、加入、開始、按擊與重設流程。

## 畫面特色

- 三隊顏色：紅隊、藍隊、綠隊。
- 龍舟由右往左前進。
- 船頭有卡通人物。
- 船身有小人划船。
- 船移動時會出現更大的誇張浪花尾跡。
- 湖面會有不同位置與節奏的魚跳出水面。
- 龍舟接近終點時，船頭領隊會切換成奮力衝刺表情。
- 比賽結果依名次由上往下排列，第一名隊伍會用金色背景與較粗文字凸顯。
- 玩家按「划！」後，個人與隊伍按擊數字會先用本機樂觀計數立即更新，再等 Firebase 同步確認。
- 玩家手機畫面會用隊伍色做全螢幕背景。

## 常見問題

### 畫面只出現上方標題，下面空白

通常是 `firebase-config.js` 格式錯誤。確認檔案有：

```js
export const firebaseConfig = { ... };
```

並且沒有 npm 版 import。

### 手機不能開本機網址

不要用：

```text
http://127.0.0.1:5173
```

手機要用電腦的區網 IP：

```text
http://192.168.x.x:5173
```

正式活動則用 GitHub Pages 公開網址。

### 玩家加入了但主持頁沒看到

請檢查：

- `databaseURL` 是否填好。
- Realtime Database Rules 是否允許 read/write。
- 玩家和主持人是否使用同一個房間碼。
- 網址是否來自同一個部署版本。

### 修改 app.js 後畫面沒有更新

瀏覽器可能吃快取。可修改 `index.html` 裡的版本參數。

JavaScript：

```html
<script type="module" src="./app.js?v=20260616-2"></script>
```

CSS：

```html
<link rel="stylesheet" href="./styles.css?v=20260616-2" />
```

或在瀏覽器做 hard reload。

### 浪花沒有出現

浪花只會在比賽中、且龍舟已經開始移動或最近有按擊速度時出現。剛開始等待玩家或剛倒數結束尚未按按鈕時，不會顯示浪花。

### Codex CLI 接手要先做什麼

進入專案：

```bash
cd /Users/garyhuang/Documents/Codex/2026-06-13/github/dragon-boat-race
```

讀文件：

```bash
cat DEVELOPMENT_LOG.md
cat USER_GUIDE.md
```

檢查語法：

```bash
node --check app.js
```

啟動本機：

```bash
python3 -m http.server 5173
```

## 活動前檢查清單

- GitHub Pages 網址可以打開。
- 主持頁可以顯示 QR code。
- 至少兩支手機可加入同一房間。
- 隨機分隊正常。
- 開始倒數正常。
- 玩家按擊後主持畫面會更新。
- 龍舟會前進。
- 龍舟移動時會看到浪花。
- 現場網路穩定。
- 投影或大螢幕可清楚顯示主持頁。
