import IORedis, { type RedisOptions } from "ioredis";
import { Queue, QueueEvents } from "bullmq";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var redisGlobal: IORedis | undefined;
}

const baseOptions: RedisOptions = {
  // BullMQ requires this to be null (blocking commands).
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
};

export const redis =
  global.redisGlobal ?? new IORedis(env.REDIS_URL, baseOptions);

if (process.env.NODE_ENV !== "production") {
  global.redisGlobal = redis;
}

export const QUEUES = {
  PUBLISH: "errozero:publish",
  METRICS: "errozero:metrics",
  HEYGEN_POLL: "errozero:heygen-poll",
} as const;

export const publishQueue = new Queue(QUEUES.PUBLISH, { connection: redis });
export const metricsQueue = new Queue(QUEUES.METRICS, { connection: redis });

export const publishQueueEvents = new QueueEvents(QUEUES.PUBLISH, { connection: redis });
