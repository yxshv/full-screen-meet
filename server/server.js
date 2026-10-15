// Minimal screenshot receiver: POST /screenshot (image/jpeg) -> ./screenshots/<timestamp>.jpg
// Usage: API_KEY=<secret> node server/server.js   (no dependencies, Node 14+)
// Requests must send "Authorization: Bearer <API_KEY>".
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const DIR = path.join(__dirname, "screenshots");
const MAX_BYTES = 20 * 1024 * 1024;
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("API_KEY environment variable is required, e.g. API_KEY=secret node server/server.js");
  process.exit(1);
}

// Constant-time comparison (hashing equalises lengths).
function authorized(header = "") {
  const sha = (v) => crypto.createHash("sha256").update(v).digest();
  return crypto.timingSafeEqual(sha(header), sha(`Bearer ${API_KEY}`));
}

fs.mkdirSync(DIR, { recursive: true });

http
  .createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/screenshot") {
      res.writeHead(404).end();
      return;
    }
    if (!authorized(req.headers.authorization)) {
      res.writeHead(401).end();
      req.destroy();
      return;
    }
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BYTES) {
        res.writeHead(413).end();
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => {
      if (res.writableEnded) return;
      const name = new Date().toISOString().replace(/[:.]/g, "-") + ".jpg";
      fs.writeFile(path.join(DIR, name), Buffer.concat(chunks), (err) => {
        if (err) return res.writeHead(500).end();
        console.log("saved", name);
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ saved: name }));
      });
    });
  })
  .listen(PORT, "127.0.0.1", () => console.log(`Listening on http://localhost:${PORT}, saving to ${DIR}`));
