(() => {
  const MIN_AREA = 200 * 150; // ignore tiny tiles (participant thumbnails)

  // The shared screen is normally the largest playing video on the stage.
  function findPresentationVideo() {
    let best = null;
    let bestArea = MIN_AREA;
    for (const v of document.querySelectorAll("video")) {
      if (v.readyState < 2 || v.videoWidth === 0) continue;
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
    if (video) video.requestFullscreen({ navigationUI: "hide" }).catch(console.warn);
  }

  const btn = document.createElement("button");
  btn.id = "fsm-button";
  btn.title = "Full screen shared screen (Alt+Shift+F)";
  btn.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>Full screen';
  btn.addEventListener("click", toggleFullscreen);
  document.documentElement.appendChild(btn);

  // Only show the button while a large video (likely a presentation) exists.
  setInterval(() => {
    const show = !document.fullscreenElement && !!findPresentationVideo();
    btn.classList.toggle("fsm-visible", show);
  }, 1000);

  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && e.code === "KeyF") {
      e.preventDefault();
      toggleFullscreen();
    }
  });
})();
