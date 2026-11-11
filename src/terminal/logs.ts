import type { Level, LogLine, SystemInfo } from "./types";

export const clock = (d: Date = new Date()): string => d.toTimeString().slice(0, 8);

export function formatUptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}h${String(m).padStart(2, "0")}m`;
  if (m) return `${m}m${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

const line = (level: Level, text: string, time = clock()): LogLine => ({ time, level, text });

/** The boot sequence printed once the first /api/system answer arrives. */
export function bootLines(sys: SystemInfo, rttMs: number): LogLine[] {
  return [
    line("cmd", `gcloud run deploy ${sys.service.split(" ")[0]} --source .`),
    line("ok", "Building using Dockerfile ........ done"),
    line("ok", `Creating revision ${sys.revision} ........ done`),
    line("ok", `Routing traffic ........ 100% → ${sys.revision}`),
    line("info", `container started at ${sys.started}`),
    line("debug", `node ${sys.node} · ${sys.platform} · ${sys.cpus} vCPU · pid ${sys.pid}`),
    line("debug", `region ${sys.region} · instance ${sys.instance}`),
    line("debug", `memory rss ${sys.memory.rssMb} MB · heap ${sys.memory.heapUsedMb}/${sys.memory.heapTotalMb} MB`),
    sys.coldStart
      ? line("warn", "cold start: this instance just woke up for you")
      : line("info", "warm instance: already running"),
    line("ok", `GET /api/system 200 · ${rttMs} ms`),
    line("cmd", "tail -f /var/log/shipit"),
  ];
}

/** One line per poll while tailing. */
export function heartbeatLine(sys: SystemInfo, rttMs: number): LogLine {
  const level: Level = rttMs > 500 ? "warn" : "debug";
  return line(
    level,
    `heartbeat · up ${formatUptime(sys.uptimeSec)} · rss ${sys.memory.rssMb} MB · reqs ${sys.requests} · rtt ${rttMs} ms`,
  );
}

export const offlineLine = (): LogLine => line("warn", "GET /api/system failed · retrying…");
