import { useEffect, useRef, useState, type CSSProperties } from "react";
import { stages } from "./stages";

type Status = "idle" | "running" | "done";

type Props = {
  version: string;
  revision: string;
  /** Multiplies every stage's simulated duration (tests use a small value). */
  timeScale?: number;
};

/** Time the progress line takes to reach the next node. */
const RAIL_MS = 450;

const icon: Record<Status, string> = { idle: "○", running: "◌", done: "✓" };

export default function Pipeline({ version, revision, timeScale = 1 }: Props) {
  const [selected, setSelected] = useState(0);
  const [statuses, setStatuses] = useState<Status[]>(() => stages.map(() => "idle"));
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(true);
    setFinished(false);
    setStatuses(stages.map(() => "idle"));

    let start = 0;
    stages.forEach((stage, i) => {
      const ms = stage.simMs * timeScale;
      timers.current.push(
        setTimeout(() => {
          setSelected(i);
          setStatuses((prev) => prev.map((s, j) => (j === i ? "running" : s)));
        }, start),
        setTimeout(
          () => {
            setStatuses((prev) => prev.map((s, j) => (j === i ? "done" : s)));
            if (i === stages.length - 1) {
              setRunning(false);
              setFinished(true);
            }
          },
          // Finish early so the rail can travel to the next node before it starts.
          start + ms - RAIL_MS * timeScale,
        ),
      );
      start += ms;
    });
  };

  const stage = stages[selected];
  const doneCount = statuses.filter((s) => s === "done").length;

  return (
    <div className="pipe">
      <div className="pipe-head">
        <p className="pipe-lead">
          From a commit on a laptop to this page. Click a stage to see what really happens, or run
          a release.
        </p>
        <button type="button" className="pipe-run mono" onClick={run} disabled={running}>
          {running ? "running…" : finished ? "↻ run again" : "▶ simulate a release"}
        </button>
      </div>

      <div
        className="pipe-track"
        style={
          {
            "--progress": `${(Math.min(doneCount, stages.length - 1) / (stages.length - 1)) * 100}%`,
            "--rail-ms": `${RAIL_MS * timeScale}ms`,
          } as CSSProperties
        }
      >
        <div className="pipe-rail" aria-hidden="true" />
        <div className="pipe-stages" role="tablist" aria-label="Pipeline stages">
          {stages.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              id={`stage-${s.id}`}
              aria-selected={i === selected}
              aria-controls="stage-panel"
              className={`stage stage-${statuses[i]}${i === selected ? " is-selected" : ""}`}
              onClick={() => setSelected(i)}
            >
              <span className="stage-node mono" aria-hidden="true">
                {statuses[i] === "idle" ? String(i + 1).padStart(2, "0") : icon[statuses[i]]}
              </span>
              <span className="stage-title">{s.title}</span>
              <span className="stage-where mono">{s.where}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        className="pipe-panel"
        role="tabpanel"
        id="stage-panel"
        aria-labelledby={`stage-${stage.id}`}
        key={stage.id}
      >
        <div className="pipe-panel-head">
          <h3>
            <span className="mono">{String(selected + 1).padStart(2, "0")}</span> {stage.title}
          </h3>
          <span className={`pipe-status mono pipe-status-${statuses[selected]}`}>
            {statuses[selected] === "idle"
              ? `~${stage.duration}`
              : statuses[selected] === "running"
                ? "running"
                : `passed · ~${stage.duration}`}
          </span>
        </div>
        <p>{stage.summary}</p>
        <ul>
          {stage.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <pre className="pipe-code mono">
          <span className="p">$</span> {stage.code}
        </pre>
      </div>

      {finished && (
        <p className="pipe-result mono" role="status">
          ✓ pipeline passed · v{version} live · revision {revision}
        </p>
      )}
    </div>
  );
}
