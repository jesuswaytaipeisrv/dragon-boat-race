# 龍舟衝刺

手機多人龍舟遊戲。主持人開房間，玩家用手機加入，系統隨機分成紅、藍、綠三隊。玩家一直按手機畫面的「划！」按鈕，隊伍速度會依照最近幾秒的按擊量推動龍舟由右往左前進。

## 目前狀態

- 已可本機執行，並可部署到 GitHub Pages。
- 已接上 Firebase Realtime Database。
- 主持頁可顯示房間碼、QR code、三條賽道與龍舟。
- 玩家頁可用手機加入、顯示隊伍顏色並連按「划！」。
- 龍舟包含船頭卡通人物、船身划船小人與移動浪花效果。
- 專案不需要 npm install 或 build。

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
5. 部署到 GitHub Pages。

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

## 建議 Realtime Database Rules

活動測試用可先放寬，但正式活動建議至少限制資料大小與欄位。最簡版：

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

最簡單的做法是建立一個新的 GitHub repo，並把 `dragon-boat-race` 裡面的檔案放在 repo 根目錄。

1. 把檔案 commit 到 GitHub。
2. 到 repo 的 Settings > Pages。
3. Source 選 `Deploy from a branch`。
4. Branch 選 `main`，資料夾選 `/root`。
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
