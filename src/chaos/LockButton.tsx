import { useEffect, useRef, useState, type FormEvent } from "react";
import { setKey, useChaosKey, verifyKey, type VerifyResult } from "./client";

const messages: Record<Exclude<VerifyResult, "ok">, string> = {
  wrong: "Wrong code.",
  disabled: "Chaos mode is not enabled on this server.",
  limited: "Too many attempts. Wait a minute.",
  offline: "Server unreachable. Try again.",
};

function LockIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      {open ? <path d="M8 11V7a4 4 0 0 1 7.5-2" /> : <path d="M8 11V7a4 4 0 0 1 8 0v4" />}
      <circle cx="12" cy="16" r="1.2" fill="currentColor" />
    </svg>
  );
}

export default function LockButton() {
  const key = useChaosKey();
  const unlocked = Boolean(key);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setCode("");
    setError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!code) return;
    setChecking(true);
    const result = await verifyKey(code);
    setChecking(false);
    if (result === "ok") {
      setKey(code);
      close();
    } else {
      setError(messages[result]);
    }
  }

  return (
    <div className="lock">
      <button
        type="button"
        className={`lock-btn${unlocked ? " is-unlocked" : ""}`}
        aria-label={unlocked ? "Chaos mode unlocked. Click to lock" : "Unlock chaos mode"}
        title={unlocked ? "Chaos mode unlocked · click to lock" : "Unlock chaos mode"}
        onClick={() => (unlocked ? setKey(null) : setOpen(true))}
      >
        <LockIcon open={unlocked} />
        {unlocked && <span className="mono">chaos</span>}
      </button>

      {open && (
        <div className="lock-backdrop" onClick={close}>
          <form
            className="lock-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lock-title"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
          >
            <h3 id="lock-title">
              <LockIcon open={false} /> Unlock chaos mode
            </h3>
            <p>Enter your secret code to enable the chaos commands in the terminal.</p>
            <input
              ref={inputRef}
              type="password"
              className="mono"
              autoComplete="current-password"
              aria-label="Secret code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
            />
            {error && (
              <p className="lock-error" role="alert">
                {error}
              </p>
            )}
            <div className="lock-actions">
              <button type="button" className="lock-cancel" onClick={close}>
                Cancel
              </button>
              <button type="submit" className="lock-submit mono" disabled={!code || checking}>
                {checking ? "checking…" : "unlock"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
