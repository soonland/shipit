import { useEffect, useRef, useState } from "react";
import {
  bootLines,
  heartbeatLine,
  hiddenLine,
  offlineLine,
  resumedLine,
  stoppedLine,
  visibleLine,
} from "./logs";
import type { LogLine, SystemInfo } from "./types";

type Props = {
  /** Time between heartbeats. */
  pollMs?: number;
  /** Stop tailing after this long, to save requests (and let Cloud Run scale to zero). */
  stopAfterMs?: number;
  /** Delay between boot lines (0 = print at once). */
  lineDelayMs?: number;
  maxLines?: number;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolves when the tab is visible (immediately if it already is) or the signal aborts. */
function whenVisible(signal: AbortSignal): Promise<void> {
  if (!document.hidden) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      document.removeEventListener("visibilitychange", onChange);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const onChange = () => {
      if (!document.hidden) done();
    };
    document.addEventListener("visibilitychange", onChange);
    signal.addEventListener("abort", done);
  });
}

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

export default function Terminal({
  pollMs = 10_000,
  stopAfterMs = 120_000,
  lineDelayMs = 140,
  maxLines = 60,
}: Props) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [session, setSession] = useState(0); // 0 = first visit (boot), then one per resume
  const [stopped, setStopped] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const delay = prefersReducedMotion() ? 0 : lineDelayMs;
    const push = (l: LogLine) => setLines((prev) => [...prev, l].slice(-maxLines));

    async function boot() {
      for (;;) {
        await whenVisible(signal);
        try {
          const { sys, rtt } = await fetchSystem(signal);
          for (const l of bootLines(sys, rtt)) {
            if (signal.aborted) return;
            push(l);
            if (delay) await sleep(delay);
          }
          return;
        } catch {
          if (signal.aborted) return;
          push(offlineLine());
          await sleep(pollMs);
        }
      }
    }

    async function tail() {
      const deadline = Date.now() + stopAfterMs;
      while (!signal.aborted) {
        await sleep(pollMs);
        if (document.hidden) {
          push(hiddenLine());
          await whenVisible(signal);
          if (signal.aborted) return;
          push(visibleLine());
        }
        if (signal.aborted) return;
        if (Date.now() >= deadline) {
          push(stoppedLine(stopAfterMs));
          setStopped(true);
          return;
        }
        try {
          const { sys, rtt } = await fetchSystem(signal);
          push(heartbeatLine(sys, rtt));
        } catch {
          if (!signal.aborted) push(offlineLine());
        }
      }
    }

    (async () => {
      if (session === 0) await boot();
      else push(resumedLine());
      if (!signal.aborted) await tail();
    })();

    return () => controller.abort();
  }, [session, pollMs, stopAfterMs, lineDelayMs, maxLines]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, stopped]);

  const resume = () => {
    setStopped(false);
    setSession((s) => s + 1);
  };

  return (
    <div className="term" role="log" aria-live="polite" aria-label="Live server logs">
      <div className="term-bar">
        <div className="traffic" aria-hidden="true">
          <span className="tl tl-close" />
          <span className="tl tl-min" />
          <span className="tl tl-max" />
        </div>
        <span className="term-title">shipit — live logs — zsh — 80×24</span>
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
          <span className="p">$</span>{" "}
          {stopped ? (
            <button type="button" className="term-resume" onClick={resume}>
              ▶ resume tail
            </button>
          ) : (
            <span className="cursor" />
          )}
        </div>
      </div>
    </div>
  );
}
