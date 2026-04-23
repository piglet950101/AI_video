import IORedis, { type RedisOptions } from "ioredis";
import { Queue } from "bullmq";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var redisGlobal: IORedis | undefined;
  // eslint-disable-next-line no-var
  var publishQueueGlobal: Queue | undefined;
}

const baseOptions: RedisOptions = {
  // BullMQ Workers require this to be null (they use blocking commands).
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true, // don't open a socket at import time (build safety)
};

// BullMQ queue names cannot contain ":" (Redis key namespacing uses them).
export const QUEUES = {
  PUBLISH: "errozero-publish",
  METRICS: "errozero-metrics",
  HEYGEN_POLL: "errozero-heygen-poll",
} as const;

export function getRedis(): IORedis {
  if (global.redisGlobal) return global.redisGlobal;
  const client = new IORedis(env.REDIS_URL, baseOptions);
  if (process.env.NODE_ENV !== "production") global.redisGlobal = client;
  return client;
}

export function getPublishQueue(): Queue {
  if (global.publishQueueGlobal) return global.publishQueueGlobal;
  const q = new Queue(QUEUES.PUBLISH, { connection: getRedis() });
  if (process.env.NODE_ENV !== "production") global.publishQueueGlobal = q;
  return q;
}
