import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import os from "node:os";
import pkg from "./package.json" with { type: "json" };

// In dev, answer /api/info directly so `pnpm dev` works without the Node server.
const devApi = (): Plugin => ({
  name: "dev-api",
  configureServer(server) {
    const started = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
    const bootedAt = Date.now();
    let requests = 0;
    const send = (res: import("node:http").ServerResponse, body: unknown) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
    };
    server.middlewares.use("/api/info", (_req, res) => {
      send(res, { version: pkg.version, revision: "dev", started });
    });
    server.middlewares.use("/api/system", (_req, res) => {
      requests += 1;
      const mem = process.memoryUsage();
      const mb = (b: number) => Math.round(b / 1024 / 1024);
      send(res, {
        version: pkg.version,
        revision: "dev",
        started,
        service: "shipit (vite dev)",
        region: "localhost",
        instance: "dev",
        node: process.version,
        platform: `${process.platform}/${process.arch}`,
        pid: process.pid,
        cpus: os.cpus().length,
        uptimeSec: Math.round((Date.now() - bootedAt) / 1000),
        memory: { rssMb: mb(mem.rss), heapUsedMb: mb(mem.heapUsed), heapTotalMb: mb(mem.heapTotal) },
        requests,
        coldStart: requests === 1,
      });
    });
  },
});

export default defineConfig({
  plugins: [react(), devApi()],
});
