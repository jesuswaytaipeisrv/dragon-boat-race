# 龍舟衝刺

手機多人龍舟遊戲。主持人開房間，玩家用手機加入，系統隨機分成紅、藍、綠三隊。玩家一直按手機畫面的「划！」按鈕，隊伍速度會依照最近幾秒的按擊量推動龍舟由右往左前進。

## 目前狀態

- 已可本機執行，並已部署到 GitHub Pages。
- 已接上 Firebase Realtime Database。
- 已加入多主持分頁保護，倒數與賽況推進只由開賽分頁執行。
- 已完成 2026-06-14 Claude code review 修正，並於 2026-06-16 部署到 `main` 與 `gh-pages`。
- 主持頁可顯示房間碼、QR code、三條賽道與龍舟。
- 玩家頁可用手機加入、顯示隊伍顏色並連按「划！」。
- 龍舟包含船頭卡通人物、船身划船小人、誇張浪花、湖面魚跳與終點前領隊奮力表情。
- 已做多人連按 lag 初步優化，降低 Firebase 寫入頻率。
- 已完成自動化 smoke test、Firebase 讀寫流程測試與部署資源檢查。
- 專案不需要 npm install 或 build。

## 線上網址

GitHub repo：

```text
https://github.com/jesuswaytaipeisrv/dragon-boat-race
```

GitHub Pages：

```text
https://jesuswaytaipeisrv.github.io/dragon-boat-race/
```

前次 code review 修正 commit：

```text
c5f16c6 Fix race review issues
```

固定測試房間：

```text
https://jesuswaytaipeisrv.github.io/dragon-boat-race/?view=host&room=DRAGON
https://jesuswaytaipeisrv.github.io/dragon-boat-race/?view=join&room=DRAGON
```

## 文件

- `README.md`：快速總覽。
- `USER_GUIDE.md`：操作、測試、部署與活動使用說明。
- `DEVELOPMENT_LOG.md`：開發紀錄、目前狀態與 Codex CLI 接手資訊。

## 本機預覽

這是一個純靜態網頁。因為瀏覽器會載入 ES module，建議用任一個靜態伺服器預覽：

```bash
python3 -m http.server 5173
```

然後開啟：

```text
http://localhost:5173
```

還沒填 Firebase 設定時，程式會使用 localStorage 示範模式，適合在同一台電腦快速看流程。正式多人手機活動請填 Firebase 設定。

手機測試時不要使用 `127.0.0.1`，請使用電腦的區網 IP，例如：

```text
http://192.168.1.109:5173/?view=join&room=MXOU
```

## Firebase 設定

1. 到 Firebase Console 建立專案。
2. 新增 Web App。
3. 建立 Realtime Database，測試階段可先用 test mode。
4. 把 Firebase Web App config 填進 `firebase-config.js`。
5. 將 `firebase-database.rules.json` 的內容套用到 Realtime Database Rules。
6. 部署到 GitHub Pages。

`firebase-config.js` 會長得像這樣：

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...firebaseapp.com",
  databaseURL: "https://...-default-rtdb.firebaseio.com",
  projectId: "...",
  storageBucket: "...appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

目前專案維持免登入活動流程，因此 `firebase-database.rules.json` 主要限制資料結構與可寫路徑，避免整個 database 被任意寫入。它不能真正驗證誰是主持人；若未來需要主持人密碼、登入或後台管理，建議加入 Firebase Auth 或 Cloud Functions。

## 建議 Realtime Database Rules

專案已提供 `firebase-database.rules.json`，正式活動前建議到 Firebase Console 的 Realtime Database Rules 套用該檔內容。這份 rules 會限制可寫欄位、玩家名稱長度、隊伍值、賽道位置與房間資料形狀。

短期本機或臨時測試若需要排除 rules 問題，才使用下列寬鬆版本：

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

## GitHub Pages

目前 repo 已部署。此專案現在使用 `gh-pages` 分支發布 GitHub Pages，`main` 與 `gh-pages` 目前同步在同一個 commit。

2026-06-16 視覺更新後，請確認 GitHub Pages HTML 引用 `styles.css?v=20260616-1` 與 `app.js?v=20260616-1`。

若重新部署，最簡單的做法是建立一個新的 GitHub repo，並把 `dragon-boat-race` 裡面的檔案放在 repo 根目錄。

1. 把檔案 commit 到 GitHub。
2. 到 repo 的 Settings > Pages。
3. Source 選 `Deploy from a branch`。
4. Branch 選 `main` 或 `gh-pages`，資料夾選 `/root`。
5. 儲存後等 GitHub Pages 產生網址。

如果你想保留子資料夾結構，可以改用 GitHub Actions 部署該資料夾。

## Codex CLI 接手

建議先讀：

```bash
cat DEVELOPMENT_LOG.md
cat USER_GUIDE.md
```

快速檢查：

```bash
node --check app.js
python3 -m http.server 5173
```

再開：

```text
http://127.0.0.1:5173/?view=host
```

部署後也可快速檢查：

```bash
curl -I https://jesuswaytaipeisrv.github.io/dragon-boat-race/
curl -I "https://jesuswaytaipeisrv.github.io/dragon-boat-race/?view=host&room=DRAGON"
curl -I "https://jesuswaytaipeisrv.github.io/dragon-boat-race/?view=join&room=DRAGON"
```
