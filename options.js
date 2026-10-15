const input = document.getElementById("url");
const keyInput = document.getElementById("key");
const intervalInput = document.getElementById("interval");
const status = document.getElementById("status");

function show(msg, err) {
  status.textContent = msg;
  status.className = err ? "err" : "";
}

chrome.storage.sync.get(["serverUrl", "apiKey", "intervalSeconds"]).then(async ({ serverUrl, apiKey, intervalSeconds }) => {
  intervalInput.value = intervalSeconds || "";
  keyInput.value = apiKey || "";
  if (serverUrl) return (input.value = serverUrl);
  try {
    input.value = (await (await fetch("config.json")).json()).serverUrl || "";
  } catch {}
});

document.getElementById("save").addEventListener("click", async () => {
  let url;
  try {
    url = new URL(input.value.trim());
    if (!/^https?:$/.test(url.protocol)) throw new Error();
  } catch {
    return show("Enter a valid http(s) URL.", true);
  }
  // localhost:3000 is granted at install; anything else needs a permission prompt.
  const granted = await chrome.permissions.request({ origins: [url.origin + "/*"] });
  if (!granted) return show("Permission to reach that host was denied.", true);
  await chrome.storage.sync.set({ serverUrl: url.href, apiKey: keyInput.value.trim() });
  // Blank interval = fall back to config.json.
  const seconds = Math.floor(Number(intervalInput.value));
  if (seconds >= 1) await chrome.storage.sync.set({ intervalSeconds: seconds });
  else await chrome.storage.sync.remove("intervalSeconds");
  show("Saved: " + url.href);
});

document.getElementById("reset").addEventListener("click", async () => {
  await chrome.storage.sync.remove(["serverUrl", "apiKey", "intervalSeconds"]);
  intervalInput.value = "";
  keyInput.value = "";
  show("Reset. Using config.json.");
  try {
    input.value = (await (await fetch("config.json")).json()).serverUrl || "";
  } catch {}
});
