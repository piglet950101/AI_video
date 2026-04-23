import { Logtail } from "@logtail/node";
import { env } from "./env";

const logtail = env.LOGTAIL_SOURCE_TOKEN
  ? new Logtail(env.LOGTAIL_SOURCE_TOKEN)
  : null;

type Level = "debug" | "info" | "warn" | "error";
type Meta = Record<string, unknown>;

function writeConsole(level: Level, msg: string, meta?: Meta) {
  const line = `[${level.toUpperCase()}] ${msg}`;
  switch (level) {
    case "debug":
      meta ? console.log(line, meta) : console.log(line);
      return;
    case "info":
      meta ? console.info(line, meta) : console.info(line);
      return;
    case "warn":
      meta ? console.warn(line, meta) : console.warn(line);
      return;
    case "error":
      meta ? console.error(line, meta) : console.error(line);
      return;
  }
}

function shipToLogtail(level: Level, msg: string, meta?: Meta) {
  if (!logtail) return;
  // Fire-and-forget — never block the request path on log delivery.
  const send =
    level === "debug"
      ? logtail.debug(msg, meta)
      : level === "info"
        ? logtail.info(msg, meta)
        : level === "warn"
          ? logtail.warn(msg, meta)
          : logtail.error(msg, meta);
  send.catch(() => {});
}

export const log = {
  debug: (msg: string, meta?: Meta) => {
    writeConsole("debug", msg, meta);
    shipToLogtail("debug", msg, meta);
  },
  info: (msg: string, meta?: Meta) => {
    writeConsole("info", msg, meta);
    shipToLogtail("info", msg, meta);
  },
  warn: (msg: string, meta?: Meta) => {
    writeConsole("warn", msg, meta);
    shipToLogtail("warn", msg, meta);
  },
  error: (msg: string, meta?: Meta) => {
    writeConsole("error", msg, meta);
    shipToLogtail("error", msg, meta);
  },
  flush: () => logtail?.flush() ?? Promise.resolve(),
};
