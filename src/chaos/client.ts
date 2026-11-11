import { useSyncExternalStore } from "react";

// The code is kept for this browser tab only (sessionStorage), never in the page source.
const STORAGE_KEY = "shipit.chaosKey";
const CHANGE_EVENT = "shipit:chaos-key";

export function getKey(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setKey(key: string | null): void {
  try {
    if (key) sessionStorage.setItem(STORAGE_KEY, key);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked: the key just won't survive a reload
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

export function useChaosKey(): string | null {
  return useSyncExternalStore(subscribe, getKey, () => null);
}

export type ChaosResult = { status: number; body: Record<string, unknown>; ms: number };

export async function chaosCall(action: string, key: string): Promise<ChaosResult> {
  const t0 = performance.now();
  const res = await fetch(`/api/chaos/${action}`, {
    method: "POST",
    headers: { "x-chaos-key": key },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body, ms: Math.round(performance.now() - t0) };
}

export type VerifyResult = "ok" | "wrong" | "disabled" | "limited" | "offline";

export async function verifyKey(key: string): Promise<VerifyResult> {
  try {
    const { status } = await chaosCall("verify", key);
    if (status === 200) return "ok";
    if (status === 404) return "disabled";
    if (status === 429) return "limited";
    return "wrong";
  } catch {
    return "offline";
  }
}
