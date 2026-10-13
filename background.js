// Posts screenshots to the configured server. Done here (not in the content
// script) so the request isn't subject to the Meet page's CORS/mixed-content rules.
//
// URL precedence: Options page (chrome.storage) > config.json > DEFAULT_URL.
const DEFAULT_URL = "http://localhost:3000/screenshot";

async function getServerUrl() {
  try {
    const { serverUrl } = await chrome.storage.sync.get("serverUrl");
    if (serverUrl) return serverUrl;
  } catch {}
  try {
    const cfg = await (await fetch(chrome.runtime.getURL("config.json"))).json();
    if (cfg.serverUrl) return cfg.serverUrl;
  } catch {}
  return DEFAULT_URL;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "screenshot") return;
  getServerUrl()
    .then((url) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: dataUrlToBlob(msg.dataUrl),
      })
    )
    .then((r) => sendResponse({ ok: r.ok }))
    .catch((err) => sendResponse({ ok: false, error: String(err) }));
  return true; // keep the channel open for the async response
});

function dataUrlToBlob(dataUrl) {
  const bin = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "image/jpeg" });
}
