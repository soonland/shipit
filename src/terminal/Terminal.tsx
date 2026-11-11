import { useEffect, useRef, useState } from "react";
import { bootLines, heartbeatLine, offlineLine } from "./logs";
import type { LogLine, SystemInfo } from "./types";

type Props = {
  pollMs?: number;
  lineDelayMs?: number;
  maxLines?: number;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchSystem(signal: AbortSignal): Promise<{ sys: SystemInfo; rtt: number }> {
  const t0 = performance.now();
  const res = await fetch("/api/system", { signal, cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  const sys = (await res.json()) as SystemInfo;
  return { sys, rtt: Math.round(performance.now() - t0) };
}

const tags: Record<LogLine["level"], string> = {
  cmd: "$",
  info: "INFO",
  debug: "DEBUG",
  ok: "OK",
  warn: "WARN",
};

export default function Terminal({ pollMs = 4000, lineDelayMs = 140, maxLines = 60 }: Props) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const delay = prefersReducedMotion() ? 0 : lineDelayMs;
    const push = (l: LogLine) => setLines((prev) => [...prev, l].slice(-maxLines));

    (async () => {
      // Boot: wait for the server, then print the sequence line by line.
      for (;;) {
        try {
          const { sys, rtt } = await fetchSystem(controller.signal);
          for (const l of bootLines(sys, rtt)) {
            if (controller.signal.aborted) return;
            push(l);
            if (delay) await sleep(delay);
          }
          break;
        } catch {
          if (controller.signal.aborted) return;
          push(offlineLine());
          await sleep(pollMs);
        }
      }
      // Tail: one heartbeat per poll.
      while (!controller.signal.aborted) {
        await sleep(pollMs);
        if (controller.signal.aborted) return;
        try {
          const { sys, rtt } = await fetchSystem(controller.signal);
          push(heartbeatLine(sys, rtt));
        } catch {
          if (!controller.signal.aborted) push(offlineLine());
        }
      }
    })();

    return () => controller.abort();
  }, [pollMs, lineDelayMs, maxLines]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="term" role="log" aria-live="polite" aria-label="Live server logs">
      <div className="term-bar">
        <i />
        <i />
        <i />
        <span className="term-title mono">shipit — live logs</span>
      </div>
      <div className="term-body mono" ref={bodyRef}>
        {lines.map((l, i) => (
          <div key={i} className={`log log-${l.level}`}>
            {l.level === "cmd" ? (
              <>
                <span className="p">$</span> {l.text}
              </>
            ) : (
              <>
                <span className="log-time">{l.time}</span>
                <span className="log-tag">{tags[l.level]}</span>
                <span className="log-text">{l.text}</span>
              </>
            )}
          </div>
        ))}
        <div className="log">
          <span className="p">$</span> <span className="cursor" />
        </div>
      </div>
    </div>
  );
}
