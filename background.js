// Posts screenshots to the local server. Done here (not in the content
// script) so the request isn't subject to the Meet page's CORS/mixed-content rules.
const SERVER_URL = "http://localhost:3000/screenshot";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "screenshot") return;
  fetch(SERVER_URL, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: dataUrlToBlob(msg.dataUrl),
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
