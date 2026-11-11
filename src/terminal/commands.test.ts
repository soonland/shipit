import { describe, expect, it, vi } from "vitest";
import { runCommand, type CommandContext } from "./commands";
import { jsonResponse, routeFetch, system } from "../test/fixtures";

const ctx = (over: Partial<CommandContext> = {}): CommandContext => ({
  key: "my-secret-code",
  lock: vi.fn(),
  clear: vi.fn(),
  resume: vi.fn(() => true),
  ...over,
});

const texts = (lines: { text: string }[]) => lines.map((l) => l.text).join("\n");

describe("runCommand", () => {
  it("lists the commands with help", async () => {
    const out = texts(await runCommand("help", ctx()));
    expect(out).toContain("chaos slow [ms]");
    expect(out).toContain("status");
  });

  it("ignores empty input and reports unknown commands", async () => {
    expect(await runCommand("   ", ctx())).toEqual([]);
    expect(texts(await runCommand("rm -rf /", ctx()))).toBe("command not found: rm · type help");
  });

  it("clears and resumes", async () => {
    const c = ctx({ resume: vi.fn(() => false) });
    await runCommand("clear", c);
    expect(c.clear).toHaveBeenCalled();
    expect(texts(await runCommand("tail", c))).toBe("tail is already running");
    expect(await runCommand("tail", ctx())).toEqual([]);
  });

  it("prints status from /api/system", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(routeFetch({ "/api/system": () => jsonResponse(system()) }));
    const out = texts(await runCommand("status", ctx()));
    expect(out).toContain("region northamerica-northeast1");
    expect(out).toContain("requests served by this instance: 3");
  });

  it("reports a failing status call", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 503 }));
    expect(texts(await runCommand("status", ctx()))).toBe("GET /api/system 503");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("down"));
    expect(texts(await runCommand("status", ctx()))).toBe("GET /api/system failed");
  });

  it("refuses chaos while locked", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(texts(await runCommand("chaos error", ctx({ key: null })))).toContain("locked");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows usage for an unknown chaos action", async () => {
    expect(texts(await runCommand("chaos dance", ctx()))).toContain("usage:");
  });

  it("sends chaos error with the key", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ error: "x" }, 500));
    const out = await runCommand("chaos error", ctx());
    expect(out[0]).toMatchObject({ level: "error" });
    expect(texts(out)).toContain("POST /api/chaos/error 500");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/chaos/error",
      expect.objectContaining({ method: "POST", headers: { "x-chaos-key": "my-secret-code" } }),
    );
  });

  it("passes the delay for chaos slow", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ ok: true, ms: 1500 }));
    expect(texts(await runCommand("chaos slow 1500", ctx()))).toContain("server slept 1500 ms");
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/chaos/slow?ms=1500");
    await runCommand("chaos slow", ctx());
    expect(fetchSpy.mock.calls[1][0]).toBe("/api/chaos/slow?ms=1000");
  });

  it("explains a crash", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ ok: true }, 202));
    expect(texts(await runCommand("chaos crash", ctx()))).toContain("container is exiting");
  });

  it("locks again on 401 and explains 404 / 429 / network errors", async () => {
    const c = ctx();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, 401));
    expect(texts(await runCommand("chaos error", c))).toContain("401 wrong code");
    expect(c.lock).toHaveBeenCalled();

    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, 404));
    expect(texts(await runCommand("chaos error", ctx()))).toContain("not enabled");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ error: "slow down" }, 429));
    expect(texts(await runCommand("chaos error", ctx()))).toBe("429 slow down");

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("down"));
    expect(texts(await runCommand("chaos error", ctx()))).toContain("network");
  });
});
