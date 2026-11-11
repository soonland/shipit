// Chaos endpoints: break things on purpose to test monitoring and alerts.
//
// Off unless CHAOS_KEY is set (8+ characters). Every action needs the key in the
// `x-chaos-key` header, is rate limited, and is logged as structured JSON so it
// shows up in Cloud Logging with the right severity.
import crypto from "node:crypto";

export const MAX_SLOW_MS = 3000;
const MAX_FAILED_ATTEMPTS = 10; // per minute, per instance
const MAX_CALLS = 30; // per minute, per instance

const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest();

export function log(severity, message, extra = {}) {
  console.log(JSON.stringify({ severity, message, component: "chaos", ...extra }));
}

export function createChaos({
  key = process.env.CHAOS_KEY,
  allowExit = true,
  logger = log,
  now = Date.now,
  exit = () => process.exit(1),
} = {}) {
  const enabled = typeof key === "string" && key.length >= 8;
  const keyHash = enabled ? sha256(key) : null;
  const windows = { failed: [], calls: [] };

  const recent = (name) => {
    const t = now();
    windows[name] = windows[name].filter((x) => t - x < 60_000);
    return windows[name];
  };
  const authorized = (req) => {
    const given = req.headers["x-chaos-key"];
    return typeof given === "string" && crypto.timingSafeEqual(sha256(given), keyHash);
  };
  const send = (res, status, body) => {
    res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(body));
  };

  /** Handles /api/chaos/* and returns true, or returns false for any other path. */
  return async function handle(req, res, pathname) {
    if (!pathname.startsWith("/api/chaos")) return false;

    if (pathname === "/api/chaos/status") {
      send(res, 200, { enabled });
      return true;
    }
    if (req.method !== "POST") {
      send(res, 405, { error: "use POST" });
      return true;
    }
    if (!enabled) {
      send(res, 404, { error: "chaos disabled on this server" });
      return true;
    }
    if (recent("failed").length >= MAX_FAILED_ATTEMPTS) {
      send(res, 429, { error: "too many wrong codes, wait a minute" });
      return true;
    }
    if (!authorized(req)) {
      windows.failed.push(now());
      logger("WARNING", "chaos: wrong code");
      send(res, 401, { error: "wrong code" });
      return true;
    }
    if (recent("calls").length >= MAX_CALLS) {
      send(res, 429, { error: `slow down: ${MAX_CALLS} chaos calls per minute` });
      return true;
    }
    windows.calls.push(now());

    const params = new URL(req.url, "http://x").searchParams;
    switch (pathname) {
      case "/api/chaos/verify":
        send(res, 200, { ok: true });
        return true;
      case "/api/chaos/error":
        logger("ERROR", "chaos: simulated 500 error");
        send(res, 500, { error: "simulated failure (chaos)" });
        return true;
      case "/api/chaos/slow": {
        const asked = Number(params.get("ms"));
        const ms = Math.min(Math.max(Number.isFinite(asked) && asked > 0 ? asked : 1000, 0), MAX_SLOW_MS);
        logger("WARNING", `chaos: slow response (${ms} ms)`, { delayMs: ms });
        await new Promise((r) => setTimeout(r, ms));
        send(res, 200, { ok: true, ms });
        return true;
      }
      case "/api/chaos/crash":
        logger("CRITICAL", "chaos: crashing the container on purpose");
        send(res, 202, { ok: true, exiting: allowExit });
        if (allowExit) setTimeout(exit, 100);
        return true;
      default:
        send(res, 404, { error: "unknown chaos command" });
        return true;
    }
  };
}
