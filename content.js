(() => {
  const MIN_AREA = 120 * 90; // ignore tiny tiles (participant thumbnails)

  // The shared screen is normally the largest playing video on the stage.
  function findPresentationVideo() {
    let best = null;
    let bestArea = MIN_AREA;
    for (const v of document.querySelectorAll("video")) {
      if (v.videoWidth === 0 || v.videoHeight === 0) continue; // no decoded frame yet
      const r = v.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > bestArea) {
        best = v;
        bestArea = area;
      }
    }
    return best;
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    const video = findPresentationVideo();
    if (!video) return flash("No shared screen found");
    video.requestFullscreen({ navigationUI: "hide" }).catch(console.warn);
  }

  function flash(text) {
    const label = btn.lastChild;
    const original = label.textContent;
    label.textContent = text;
    setTimeout(() => (label.textContent = original), 2000);
  }

  // --- Periodic screenshots of the shared screen -> local server ---
  let captureTimer = null;
  let starting = false;

  function captureFrame() {
    const fs = document.fullscreenElement;
    const video = fs instanceof HTMLVideoElement ? fs : findPresentationVideo();
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    chrome.runtime.sendMessage({ type: "screenshot", dataUrl: canvas.toDataURL("image/jpeg", 0.85) });
  }

  // Capture automatically while a video is in full screen.
  document.addEventListener("fullscreenchange", () => {
    const active = document.fullscreenElement instanceof HTMLVideoElement;
    if (active && !captureTimer) {
      starting = true;
      chrome.runtime.sendMessage({ type: "getInterval" }, (seconds) => {
        // Bail out if full screen was exited while waiting for the config.
        if (!starting || !(document.fullscreenElement instanceof HTMLVideoElement)) return;
        starting = false;
        captureFrame();
        captureTimer = setInterval(captureFrame, (seconds || 10) * 1000);
      });
    } else if (!active) {
      starting = false;
    }
    if (!active && captureTimer) {
      clearInterval(captureTimer);
      captureTimer = null;
    }
  });

  const btn = document.createElement("button");
  btn.id = "fsm-button";
  btn.title = "Full screen shared screen (Alt+Shift+F)";
  btn.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg><span>Full screen</span>';
  btn.addEventListener("click", toggleFullscreen);
  document.documentElement.appendChild(btn);

  // Show the button on meeting pages (e.g. /abc-defg-hij) whenever we're not in full screen.
  // Video detection is deliberately not a condition: Meet markup varies, and when you present
  // yourself there is no video of your own screen to show.
  const MEETING_PATH = /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}(\/|$)/;
  setInterval(() => {
    const show = !document.fullscreenElement && MEETING_PATH.test(location.pathname);
    btn.classList.toggle("fsm-visible", show);
  }, 1000);

  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && e.code === "KeyF") {
      e.preventDefault();
      toggleFullscreen();
    }
  });
})();
