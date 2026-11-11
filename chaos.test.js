// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createChaos, MAX_SLOW_MS } from "./chaos.js";

const KEY = "correct-horse-battery";

function call(handle, path, { method = "POST", key } = {}) {
  const req = { method, url: path, headers: key ? { "x-chaos-key": key } : {} };
  const res = {
    status: 0,
    body: null,
    writeHead(status) {
      this.status = status;
    },
    end(text) {
      this.body = JSON.parse(text);
    },
  };
  return handle(req, res, path.split("?")[0]).then((handled) => ({ handled, ...res }));
}

const make = (opts = {}) => createChaos({ key: KEY, logger: () => {}, exit: () => {}, ...opts });

describe("chaos endpoints", () => {
  it("ignores other paths", async () => {
    expect((await call(make(), "/api/info")).handled).toBe(false);
  });

  it("reports whether chaos is enabled", async () => {
    expect((await call(make(), "/api/chaos/status", { method: "GET" })).body).toEqual({ enabled: true });
    expect((await call(make({ key: undefined }), "/api/chaos/status", { method: "GET" })).body).toEqual({ enabled: false });
  });

  it("is disabled without a key, or with a key shorter than 8 characters", async () => {
    expect((await call(make({ key: undefined }), "/api/chaos/error", { key: "x" })).status).toBe(404);
    expect((await call(make({ key: "short" }), "/api/chaos/error", { key: "short" })).status).toBe(404);
  });

  it("only accepts POST", async () => {
    expect((await call(make(), "/api/chaos/error", { method: "GET", key: KEY })).status).toBe(405);
  });

  it("rejects a missing or wrong code", async () => {
    expect((await call(make(), "/api/chaos/error")).status).toBe(401);
    expect((await call(make(), "/api/chaos/error", { key: "wrong-code-123" })).status).toBe(401);
  });

  it("locks out after 10 wrong codes per minute, even with the right one", async () => {
    let t = 0;
    const handle = make({ now: () => t });
    for (let i = 0; i < 10; i++) await call(handle, "/api/chaos/verify", { key: "nope" });
    expect((await call(handle, "/api/chaos/verify", { key: KEY })).status).toBe(429);
    t = 61_000;
    expect((await call(handle, "/api/chaos/verify", { key: KEY })).status).toBe(200);
  });

  it("verifies, errors and logs with severity", async () => {
    const logger = vi.fn();
    const handle = make({ logger });
    expect((await call(handle, "/api/chaos/verify", { key: KEY })).status).toBe(200);
    const res = await call(handle, "/api/chaos/error", { key: KEY });
    expect(res.status).toBe(500);
    expect(logger).toHaveBeenCalledWith("ERROR", "chaos: simulated 500 error");
  });

  it("caps slow responses", async () => {
    vi.useFakeTimers();
    try {
      const handle = make();
      const pending = call(handle, "/api/chaos/slow?ms=999999", { key: KEY });
      await vi.advanceTimersByTimeAsync(MAX_SLOW_MS);
      expect((await pending).body).toEqual({ ok: true, ms: MAX_SLOW_MS });

      const fallback = call(handle, "/api/chaos/slow?ms=abc", { key: KEY });
      await vi.advanceTimersByTimeAsync(1000);
      expect((await fallback).body.ms).toBe(1000);
    } finally {
      vi.useRealTimers();
    }
  });

  it("crashes only when allowed", async () => {
    vi.useFakeTimers();
    try {
      const exit = vi.fn();
      expect((await call(make({ exit }), "/api/chaos/crash", { key: KEY })).status).toBe(202);
      vi.advanceTimersByTime(200);
      expect(exit).toHaveBeenCalledOnce();

      const noExit = vi.fn();
      const res = await call(make({ exit: noExit, allowExit: false }), "/api/chaos/crash", { key: KEY });
      expect(res.body.exiting).toBe(false);
      vi.advanceTimersByTime(200);
      expect(noExit).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("rate limits chaos calls to 30 per minute", async () => {
    const handle = make({ now: () => 0 });
    for (let i = 0; i < 30; i++) await call(handle, "/api/chaos/verify", { key: KEY });
    expect((await call(handle, "/api/chaos/verify", { key: KEY })).status).toBe(429);
  });

  it("answers 404 for unknown actions", async () => {
    expect((await call(make(), "/api/chaos/nope", { key: KEY })).status).toBe(404);
  });
});
