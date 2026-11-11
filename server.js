import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const { version } = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url)));
const port = process.env.PORT || 8080;
const info = {
  version,
  revision: process.env.K_REVISION || "local",
  started: new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
};

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end("ok");
    }
    if (url.pathname === "/api/info") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(info));
    }
    let file = path.join(root, path.normalize(url.pathname));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(root, "index.html"); // SPA fallback
    }
    const cache = file.includes(`${path.sep}assets${path.sep}`)
      ? "public, max-age=31536000, immutable"
      : "no-cache";
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": cache,
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Listening on ${port}`));
