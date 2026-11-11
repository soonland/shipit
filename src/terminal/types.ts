export type SystemInfo = {
  version: string;
  revision: string;
  started: string;
  service: string;
  region: string;
  instance: string;
  node: string;
  platform: string;
  pid: number;
  cpus: number;
  uptimeSec: number;
  memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number };
  requests: number;
  coldStart: boolean;
};

export type Level = "cmd" | "info" | "debug" | "ok" | "warn";

export type LogLine = { time: string; level: Level; text: string };
