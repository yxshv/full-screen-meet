# Full Screen Meet

Chrome extension that shows a Google Meet shared screen in true full screen (your whole monitor).

## Install
1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select this folder.

## Use
In a Meet call where someone is presenting, click the **Full screen** button (bottom right) or press **Alt+Shift+F**. Press `Esc` or the shortcut again to exit.
Drag the Chrome window to the monitor you want first; fullscreen fills the monitor the window is on.

## Screenshots to a local server
1. Start the receiver: `API_KEY=your-secret node server/server.js` (listens on `127.0.0.1:3000`; override with `HOST` and `PORT`, saves JPEGs to `server/screenshots/`).
2. Capture starts automatically when you full-screen the shared screen (button or Alt+Shift+F) and stops when you exit full screen. A frame is saved every 10 seconds by default (see below); images only go to the configured server.

## Custom server URL
The URL screenshots are sent to is resolved in this order:
1. **Options page** (`chrome://extensions` → Full Screen Meet → Details → Extension options). Saving a non-localhost URL prompts for permission to that host.
2. **`config.json`** in the extension folder (`{"serverUrl": "..."}`). Edit it and click reload on the extension. Hosts other than `127.0.0.1:3000` / `localhost:3000` need permission granted once via the options page.
3. Default: `http://127.0.0.1:3000/screenshot`.

The bundled server listens on `PORT` (env var, default 3000): `PORT=4000 node server/server.js`.

## API key
The server requires `API_KEY` in its environment and refuses to start without it. Every upload must carry `Authorization: Bearer <API_KEY>`, otherwise the server answers `401`.
Set the same key in the extension via `"apiKey"` in `config.json` or the Options page (which takes precedence). Don't commit a real key: keep `config.json`'s `apiKey` empty in git and use the Options page, or avoid committing local edits. Use `https://` when the server isn't on localhost, since the key travels in a header.

## Screenshot interval
`"intervalSeconds"` in `config.json` (default `10`, minimum `1`) sets how often a frame is sent; the Options page value overrides it. It is read each time you enter full screen, so re-enter full screen after changing it.
