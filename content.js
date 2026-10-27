(() => {
  const MIN_AREA = 120 * 90; // ignore tiny tiles (participant thumbnails)

  // The shared screen is normally the largest playing video on the stage.
  // Only the on-screen part counts, so scrolled-away or off-canvas tiles don't win.
  function findPresentationVideo() {
    let best = null;
    let bestArea = MIN_AREA;
    for (const v of document.querySelectorAll("video")) {
      if (v.videoWidth === 0 || v.videoHeight === 0) continue; // no decoded frame yet
      // Skip videos that are laid out but invisible (opacity 0 / visibility hidden / display none).
      if (v.checkVisibility && !v.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const r = v.getBoundingClientRect();
      const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
      const h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
      const area = Math.max(w, 0) * Math.max(h, 0);
      if (area > bestArea) {
        best = v;
        bestArea = area;
      }
    }
    return best;
  }

  // Our full screen = a <video> is the fullscreen element. Meet's own "Full screen" option
  // makes its page root fullscreen instead; that must not count, or the button disappears
  // and the shortcut only exits Meet's full screen.
  const videoIsFullscreen = () => document.fullscreenElement instanceof HTMLVideoElement;

  function toggleFullscreen() {
    if (videoIsFullscreen()) {
      document.exitFullscreen();
      return;
    }
    const video = findPresentationVideo();
    if (!video) return flash("No shared screen found");
    video.requestFullscreen({ navigationUI: "hide" }).catch(console.warn);
  }

  const LABEL = "Full screen";
  let flashTimer = null;
  function flash(text) {
    // Always restore the fixed label: reading the current text would get stuck on the
    // message if clicked again within 2s.
    btn.lastChild.textContent = text;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (btn.lastChild.textContent = LABEL), 2000);
  }

  // --- Periodic screenshots of the shared screen -> local server ---
  let captureTimer = null;
  let starting = false;

  function captureFrame() {
    const fs = document.fullscreenElement;
    const video = fs instanceof HTMLVideoElement ? fs : findPresentationVideo();
    if (!video || !video.videoWidth || !video.videoHeight) return; // nothing decoded: skip empty uploads
    // After the extension is reloaded/updated, this old script can no longer reach it: stop
    // capturing instead of throwing every interval. (Refresh the tab to get the new version.)
    if (!chrome.runtime?.id) return stopCapture();
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    try {
      chrome.runtime.sendMessage({ type: "screenshot", dataUrl: canvas.toDataURL("image/jpeg", 0.85) });
    } catch {
      stopCapture();
    }
  }

  function stopCapture() {
    starting = false;
    clearInterval(captureTimer);
    captureTimer = null;
  }

  // Capture automatically while a video is in full screen.
  document.addEventListener("fullscreenchange", () => {
    updateButton();
    const active = videoIsFullscreen();
    if (active && !captureTimer) {
      if (!chrome.runtime?.id) return; // extension reloaded; refresh the tab
      starting = true;
      chrome.runtime.sendMessage({ type: "getInterval" }, (seconds) => {
        // Bail out if full screen was exited while waiting for the config.
        if (!starting || !videoIsFullscreen()) return;
        starting = false;
        captureTimer = setInterval(captureFrame, (seconds || 10) * 1000);
        captureFrame(); // first shot right away (may stop capture if the extension is gone)
      });
    } else if (!active) {
      stopCapture();
    }
  });

  const btn = document.createElement("button");
  btn.id = "fsm-button";
  btn.title = "Full screen shared screen (Alt+Shift+F)";
  btn.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg><span>' + LABEL + "</span>";
  btn.addEventListener("click", toggleFullscreen);

  // The button lives in the browser's top layer (as a manual popover) so nothing Meet draws can
  // cover it: not z-index stacking, not Meet's own dialogs/popovers, not Meet's full screen.
  // Within the top layer the most recently opened element is on top, so the button is re-opened
  // whenever something else enters the top layer. Without popover support (Chrome < 114) it is
  // still re-parented as below, just without the top-layer guarantee.
  const usePopover = typeof btn.showPopover === "function";
  if (usePopover) btn.popover = "manual";

  function topmostModal() {
    let modals = [];
    try {
      modals = document.querySelectorAll("dialog:modal");
    } catch {}
    return modals[modals.length - 1] || null;
  }

  function placeButton() {
    // An open modal dialog makes everything outside it inert (unclickable), so the button has to
    // sit inside it. Re-attaching also covers the page removing the button (e.g. a re-render).
    const fs = document.fullscreenElement;
    // Likewise, while Meet's own full screen is on, Chrome only shows content inside the
    // fullscreen element, so the button moves inside it.
    const parent = topmostModal() || (fs && !(fs instanceof HTMLVideoElement) ? fs : document.documentElement);
    if (btn.parentNode !== parent) parent.appendChild(btn); // moving it closes the popover
  }

  function topLayerSignature() {
    let others = [];
    try {
      others = [...document.querySelectorAll(":modal, :popover-open")].filter((el) => el !== btn);
    } catch {}
    if (document.fullscreenElement) others.push(document.fullscreenElement);
    return others.length + ":" + others.map((el) => el.tagName + "#" + el.id).join(",");
  }

  // Show the button on meeting pages whenever a video isn't full screen. Meeting URLs carry the
  // code as a path segment: /abc-defg-hij, or /_meet/abc-defg-hij for some join links / the app.
  // Video detection is deliberately not a condition: Meet markup varies, and when you present
  // yourself there is no video of your own screen to show.
  const MEETING_PATH = /(^|\/)[a-z]{3}-[a-z]{4}-[a-z]{3}(\/|$)/;
  let lastSignature = "";
  function updateButton() {
    placeButton();
    const show = !videoIsFullscreen() && MEETING_PATH.test(location.pathname);
    btn.classList.toggle("fsm-visible", show);
    if (!usePopover) return;
    const open = btn.matches(":popover-open");
    if (!show) {
      if (open) btn.hidePopover();
      return;
    }
    const sig = topLayerSignature();
    if (open && sig !== lastSignature) {
      // Something new entered the top layer above us: close now and reopen on a later task.
      // Reopening in the same task doesn't move the element back to the top in Chrome.
      lastSignature = sig;
      btn.hidePopover();
      setTimeout(updateButton, 50);
      return;
    }
    lastSignature = sig;
    if (!open) btn.showPopover();
  }
  updateButton();
  setInterval(updateButton, 1000);
  // One line in the Meet tab's DevTools console, to confirm the script is running.
  console.info(`[Full Screen Meet] v${chrome.runtime.getManifest().version} loaded on ${location.pathname}`);

  // Capture phase on window: runs before Meet's own key handlers, which may stop propagation.
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.altKey && e.shiftKey && e.code === "KeyF" && !e.repeat) {
        e.preventDefault();
        e.stopPropagation();
        toggleFullscreen();
      }
    },
    true
  );
})();
