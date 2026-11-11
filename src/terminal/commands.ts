import { chaosCall } from "../chaos/client";
import { clock, formatUptime } from "./logs";
import type { Level, LogLine, SystemInfo } from "./types";

export type CommandContext = {
  key: string | null;
  lock: () => void;
  clear: () => void;
  resume: () => boolean; // false if the tail is already running
};

const line = (level: Level, text: string): LogLine => ({ time: clock(), level, text });

const HELP: [string, string][] = [
  ["help", "show this list"],
  ["status", "runtime details of this instance"],
  ["tail", "resume the live heartbeat"],
  ["clear", "clear the terminal"],
  ["chaos error", "return a 500 (triggers the 5xx alert)"],
  ["chaos slow [ms]", "answer slowly, up to 3000 ms (latency alert)"],
  ["chaos crash", "crash this container (restart + cold start)"],
];

async function status(): Promise<LogLine[]> {
  const res = await fetch("/api/system", { cache: "no-store" });
  if (!res.ok) return [line("error", `GET /api/system ${res.status}`)];
  const s = (await res.json()) as SystemInfo;
  return [
    line("info", `${s.service} v${s.version} · revision ${s.revision}`),
    line("debug", `region ${s.region} · instance ${s.instance} · up ${formatUptime(s.uptimeSec)}`),
    line("debug", `node ${s.node} · ${s.platform} · ${s.cpus} vCPU · rss ${s.memory.rssMb} MB`),
    line("debug", `requests served by this instance: ${s.requests}`),
  ];
}

async function chaos(args: string[], ctx: CommandContext): Promise<LogLine[]> {
  const [action, arg] = args;
  if (!ctx.key) return [line("warn", "chaos mode is locked · click the lock in the top bar")];
  if (!["error", "slow", "crash"].includes(action ?? "")) {
    return [line("warn", "usage: chaos error | chaos slow [ms] | chaos crash")];
  }
  const path = action === "slow" ? `slow?ms=${encodeURIComponent(arg ?? "1000")}` : action;
  const { status, body, ms } = await chaosCall(path, ctx.key);

  if (status === 401) {
    ctx.lock();
    return [line("error", "401 wrong code · chaos mode locked again")];
  }
  if (status === 404) return [line("warn", "chaos mode is not enabled on this server")];
  if (status === 429) return [line("warn", `429 ${String(body.error ?? "rate limited")}`)];

  switch (action) {
    case "error":
      return [
        line("error", `POST /api/chaos/error ${status} · ${ms} ms`),
        line("info", "watch the 5xx tile on the dashboard · alert email in ~5 min"),
      ];
    case "slow":
      return [
        line(ms > 1000 ? "warn" : "ok", `POST /api/chaos/slow ${status} · ${ms} ms (server slept ${String(body.ms)} ms)`),
        line("info", "p95 must stay above 1 s for 10 min to fire the latency alert"),
      ];
    default:
      return [
        line("error", `POST /api/chaos/crash ${status} · container is exiting`),
        line("info", "the next request starts a new instance · watch for a cold start"),
      ];
  }
}

export async function runCommand(input: string, ctx: CommandContext): Promise<LogLine[]> {
  const [cmd, ...args] = input.trim().split(/\s+/);
  switch (cmd) {
    case "":
      return [];
    case "help":
      return HELP.map(([c, d]) => line("info", `${c.padEnd(16)} ${d}`));
    case "clear":
      ctx.clear();
      return [];
    case "tail":
      return ctx.resume() ? [] : [line("info", "tail is already running")];
    case "status":
      return status().catch(() => [line("error", "GET /api/system failed")]);
    case "chaos":
      return chaos(args, ctx).catch(() => [line("error", "chaos request failed (network)")]);
    default:
      return [line("warn", `command not found: ${cmd} · type help`)];
  }
}
