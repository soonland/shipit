import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json" with { type: "json" };

// In dev, answer /api/info directly so `pnpm dev` works without the Node server.
const devApi = (): Plugin => ({
  name: "dev-api",
  configureServer(server) {
    const started = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
    server.middlewares.use("/api/info", (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ version: pkg.version, revision: "dev", started }));
    });
  },
});

export default defineConfig({
  plugins: [react(), devApi()],
});
