import { describe, expect, it } from "vitest";
import { bootLines, clock, formatUptime, heartbeatLine, offlineLine } from "./logs";
import { system } from "../test/fixtures";

describe("formatUptime", () => {
  it.each([
    [5, "5s"],
    [75, "1m15s"],
    [3600 + 5 * 60, "1h05m"],
  ])("%i seconds → %s", (sec, out) => {
    expect(formatUptime(sec)).toBe(out);
  });
});

describe("clock", () => {
  it("formats HH:MM:SS", () => {
    expect(clock(new Date(2026, 0, 1, 9, 5, 3))).toBe("09:05:03");
  });
});

describe("bootLines", () => {
  it("prints deploy, runtime and debug details", () => {
    const text = bootLines(system(), 42).map((l) => l.text).join("\n");
    expect(text).toContain("gcloud run deploy shipit --source .");
    expect(text).toContain("100% → shipit-00007-xyz");
    expect(text).toContain("node v24.0.0 · linux/x64 · 1 vCPU · pid 1");
    expect(text).toContain("region northamerica-northeast1 · instance 00abc123def4");
    expect(text).toContain("heap 8/12 MB");
    expect(text).toContain("GET /api/system 200 · 42 ms");
  });

  it("flags a cold start as a warning", () => {
    const cold = bootLines(system({ coldStart: true }), 1).find((l) => l.text.startsWith("cold start"));
    expect(cold?.level).toBe("warn");
  });

  it("reports a warm instance otherwise", () => {
    const lines = bootLines(system({ coldStart: false }), 1);
    expect(lines.some((l) => l.text.startsWith("warm instance"))).toBe(true);
  });

  it("uses the first word of a local service name", () => {
    expect(bootLines(system({ service: "shipit (local)" }), 1)[0].text).toBe(
      "gcloud run deploy shipit --source .",
    );
  });
});

describe("heartbeatLine", () => {
  it("is a debug line when the server is fast", () => {
    const l = heartbeatLine(system(), 20);
    expect(l.level).toBe("debug");
    expect(l.text).toBe("heartbeat · up 1m15s · rss 48 MB · reqs 3 · rtt 20 ms");
  });

  it("is a warning when the round trip is slow", () => {
    expect(heartbeatLine(system(), 900).level).toBe("warn");
  });
});

describe("offlineLine", () => {
  it("is a warning", () => {
    expect(offlineLine().level).toBe("warn");
  });
});
