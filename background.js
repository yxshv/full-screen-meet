// Posts screenshots to the configured server. Done here (not in the content
// script) so the request isn't subject to the Meet page's CORS/mixed-content rules.
//
// URL and API key precedence: Options page (chrome.storage) > config.json > default.
// The key is sent as "Authorization: Bearer <key>" when set.
const DEFAULT_URL = "http://127.0.0.1:3000/screenshot";
const DEFAULT_INTERVAL_SECONDS = 10;

async function getSettings() {
  let stored = {};
  let cfg = {};
  try {
    stored = await chrome.storage.sync.get(["serverUrl", "apiKey", "intervalSeconds"]);
  } catch {}
  try {
    cfg = await (await fetch(chrome.runtime.getURL("config.json"))).json();
  } catch {}
  return {
    url: stored.serverUrl || cfg.serverUrl || DEFAULT_URL,
    apiKey: stored.apiKey || cfg.apiKey || "",
    intervalSeconds: Math.max(1, Number(stored.intervalSeconds || cfg.intervalSeconds) || DEFAULT_INTERVAL_SECONDS),
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "getInterval") {
    getSettings().then((s) => sendResponse(s.intervalSeconds));
    return true;
  }
  if (msg?.type !== "screenshot") return;
  getSettings()
    .then(({ url, apiKey }) => {
      const headers = { "Content-Type": "image/jpeg" };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      return fetch(url, { method: "POST", headers, body: dataUrlToBlob(msg.dataUrl) });
    })
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
