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
2. During a presentation click **Capture** (or Alt+Shift+C). A frame of the shared screen is saved every 2 seconds; the red dot shows capture is active. Click again to stop.

Capture is off until you turn it on, and images only go to `localhost:3000`.
