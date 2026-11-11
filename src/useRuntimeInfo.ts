import { useEffect, useState } from "react";

export type RuntimeInfo = {
  version: string;
  revision: string;
  started: string;
};

const fallback: RuntimeInfo = { version: "dev", revision: "local", started: "—" };

export function useRuntimeInfo(): RuntimeInfo {
  const [info, setInfo] = useState<RuntimeInfo>(fallback);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/info", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: RuntimeInfo) => setInfo(data))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return info;
}
