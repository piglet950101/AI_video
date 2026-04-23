import { Logtail } from "@logtail/node";
import { env } from "./env";

const logtail = env.LOGTAIL_SOURCE_TOKEN
  ? new Logtail(env.LOGTAIL_SOURCE_TOKEN)
  : null;

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  const line = `[${level.toUpperCase()}] ${msg}`;
  if (meta) {
    console[level === "debug" ? "log" : level](line, meta);
  } else {
    console[level === "debug" ? "log" : level](line);
  }
  if (logtail) {
    // Fire and forget — do not block request path on log delivery.
    logtail[level](msg, meta).catch(() => {});
  }
}

export const log = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
  flush: () => logtail?.flush() ?? Promise.resolve(),
};
