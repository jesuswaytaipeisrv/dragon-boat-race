# Claude Handoff

## Project Shape

- Static HTML/CSS/JavaScript ES module app.
- No npm install or build step is required.
- GitHub Pages publishes from the `gh-pages` branch.
- Production URLs use the fixed `DRAGON` room for event testing:
  - `https://jesuswaytaipeisrv.github.io/dragon-boat-race/?view=host&room=DRAGON`
  - `https://jesuswaytaipeisrv.github.io/dragon-boat-race/?view=join&room=DRAGON`

## Current Firebase Choice

`firebase-config.js` is intentionally kept in the repository because the GitHub Pages static app imports it directly. This is Firebase web app configuration, not a server secret. The real protection boundary is Realtime Database Rules and the event-only data model.

Do not commit service account JSON, private API tokens, `.env` files, logs, or local build output.

## Before Editing

Read these first:

```bash
cat README.md
cat USER_GUIDE.md
cat DEVELOPMENT_LOG.md
```

After changing `app.js` or `styles.css`, update the cache-busting query string in `index.html`.

## Quick Checks

```bash
node --check app.js
python3 -m http.server 5173
```

Then check:

```text
http://127.0.0.1:5173/?view=host&room=DRAGON
http://127.0.0.1:5173/?view=join&room=DRAGON
```

For phone testing, use the Mac LAN IP instead of `127.0.0.1`.
