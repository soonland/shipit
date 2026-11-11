import type { SystemInfo } from "../terminal/types";

export const system = (over: Partial<SystemInfo> = {}): SystemInfo => ({
  version: "2.0.0",
  revision: "shipit-00007-xyz",
  started: "2026-01-01 00:00:00 UTC",
  service: "shipit",
  region: "northamerica-northeast1",
  instance: "00abc123def4",
  node: "v24.0.0",
  platform: "linux/x64",
  pid: 1,
  cpus: 1,
  uptimeSec: 75,
  memory: { rssMb: 48, heapUsedMb: 8, heapTotalMb: 12 },
  requests: 3,
  coldStart: true,
  ...over,
});

/** fetch mock that answers by URL. */
export function routeFetch(routes: Record<string, () => Response | Promise<Response>>) {
  return (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const handler = routes[url];
    return Promise.resolve(handler ? handler() : new Response("", { status: 404 }));
  };
}

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
