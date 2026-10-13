// Minimal screenshot receiver: POST /screenshot (image/jpeg) -> ./screenshots/<timestamp>.jpg
// Usage: node server/server.js   (no dependencies, Node 14+)
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const DIR = path.join(__dirname, "screenshots");
const MAX_BYTES = 20 * 1024 * 1024;
fs.mkdirSync(DIR, { recursive: true });

http
  .createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/screenshot") {
      res.writeHead(404).end();
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
