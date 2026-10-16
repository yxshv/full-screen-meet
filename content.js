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
    placeButton();
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

  // Only the fullscreen element's subtree is rendered while something is fullscreen, so when
  // Meet's own full screen is on, the button has to live inside Meet's fullscreen element.
  function placeButton() {
    const fs = document.fullscreenElement;
    const parent = fs && !(fs instanceof HTMLVideoElement) ? fs : document.documentElement;
    if (btn.parentNode !== parent) parent.appendChild(btn);
  }
  placeButton();

  // Show the button on meeting pages (e.g. /abc-defg-hij) whenever we're not in full screen.
  // Video detection is deliberately not a condition: Meet markup varies, and when you present
  // yourself there is no video of your own screen to show.
  const MEETING_PATH = /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}(\/|$)/;
  setInterval(() => {
    const show = !videoIsFullscreen() && MEETING_PATH.test(location.pathname);
    btn.classList.toggle("fsm-visible", show);
  }, 1000);

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
