Seven-Team Hockey League — Single Page

Files created:
- index.html — main single-page site
- styles.css — styling
- script.js — sample data + rendering logic

To view locally:
1. It's recommended to serve the folder over HTTP so the browser can fetch `league-data.json`.
2. From the project directory run a simple server, for example:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser. (If you prefer opening `index.html` directly, the page will still load but JSON fetching may be blocked by some browsers.)

Want changes?
- I can add CSV/JSON import, live editing UI, or export features.