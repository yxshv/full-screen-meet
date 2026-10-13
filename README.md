# Full Screen Meet

Chrome extension that shows a Google Meet shared screen in true full screen (your whole monitor).

## Install
1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select this folder.

## Use
In a Meet call where someone is presenting, click the **Full screen** button (bottom right) or press **Alt+Shift+F**. Press `Esc` or the shortcut again to exit.
Drag the Chrome window to the monitor you want first; fullscreen fills the monitor the window is on.

## Screenshots to a local server
1. Start the receiver: `node server/server.js` (listens on `localhost:3000`, saves JPEGs to `server/screenshots/`).
2. Capture starts automatically when you full-screen the shared screen (button or Alt+Shift+F) and stops when you exit full screen. A frame is saved every 2 seconds; images only go to `localhost:3000`.

## Custom server URL
The URL screenshots are sent to is resolved in this order:
1. **Options page** (`chrome://extensions` → Full Screen Meet → Details → Extension options). Saving a non-localhost URL prompts for permission to that host.
2. **`config.json`** in the extension folder (`{"serverUrl": "..."}`). Edit it and click reload on the extension. Hosts other than `localhost:3000` need permission granted once via the options page.
3. Default: `http://localhost:3000/screenshot`.

The bundled server listens on `PORT` (env var, default 3000): `PORT=4000 node server/server.js`.
