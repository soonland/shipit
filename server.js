import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createChaos } from "./chaos.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const { version } = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url)));
const port = process.env.PORT || 8080;
const bootedAt = Date.now();
const info = {
  version,
  revision: process.env.K_REVISION || "local",
  started: new Date(bootedAt).toISOString().replace("T", " ").slice(0, 19) + " UTC",
  // Set only on PR preview revisions (see .github/workflows/preview.yml).
  preview: Number(process.env.PREVIEW_PR) || null,
};

const chaos = createChaos();
let requests = 0;
let systemCalls = 0;

// On Cloud Run, the metadata server tells us where this instance runs.
// Locally there is no metadata server, so skip it.
const metadataCache = new Map();
async function metadata(key) {
  if (!process.env.K_SERVICE) return null;
  if (metadataCache.has(key)) return metadataCache.get(key);
  const value = await fetch(`http://metadata.google.internal/computeMetadata/v1/${key}`, {
    headers: { "Metadata-Flavor": "Google" },
    signal: AbortSignal.timeout(500),
  })
    .then((r) => (r.ok ? r.text() : null))
    .catch(() => null);
  metadataCache.set(key, value);
  return value;
}

const mb = (bytes) => Math.round(bytes / 1024 / 1024);

async function system() {
  const [region, instance] = await Promise.all([
    metadata("instance/region"),
    metadata("instance/id"),
  ]);
  const mem = process.memoryUsage();
  systemCalls += 1;
  return {
    ...info,
    service: process.env.K_SERVICE || "shipit (local)",
    region: region ? region.split("/").pop() : "local",
    instance: instance ? instance.slice(0, 12) : os.hostname(),
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    pid: process.pid,
    cpus: os.cpus().length,
    uptimeSec: Math.round((Date.now() - bootedAt) / 1000),
    memory: { rssMb: mb(mem.rss), heapUsedMb: mb(mem.heapUsed), heapTotalMb: mb(mem.heapTotal) },
    requests,
    coldStart: systemCalls === 1,
  };
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const json = (res, body) => {
  res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};

http
  .createServer(async (req, res) => {
    requests += 1;
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end("ok");
    }
    if (await chaos(req, res, url.pathname)) return;
    if (url.pathname === "/api/info") return json(res, info);
    if (url.pathname === "/api/system") return json(res, await system());

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
