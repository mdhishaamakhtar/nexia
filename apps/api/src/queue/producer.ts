import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  QUEUE_NAME,
  TYPE_EMBEDDING_TASK,
  TYPE_DELETION_TASK,
  type EmbeddingPayload,
  type DeletionPayload,
} from "./types";
import type { Logger } from "../logging/logger";

export class EmbeddingQueueProducer {
  private queue: Queue;
  private logger: Logger;

  constructor(redis: Redis, logger: Logger) {
    this.queue = new Queue(QUEUE_NAME, { connection: redis });
    this.logger = logger.child({ component: "queue_producer" });
  }

  async enqueueEmbeddingTask(profileId: number): Promise<void> {
    const payload: EmbeddingPayload = { profile_id: profileId };
    await this.queue.add(TYPE_EMBEDDING_TASK, payload, {
      attempts: 5,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
    this.logger.debug({ profileId }, "enqueued embedding task");
  }

  async enqueueDeletionTask(profileId: number): Promise<void> {
    const payload: DeletionPayload = { profile_id: profileId };
    await this.queue.add(TYPE_DELETION_TASK, payload, {
      attempts: 5,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
    this.logger.debug({ profileId }, "enqueued deletion task");
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

export function parseRedisURL(redisURL: string): { host: string; port: number; password?: string } {
  // Only treat as URL if it has a protocol prefix
  if (redisURL.startsWith("redis://") || redisURL.startsWith("rediss://")) {
    const url = new URL(redisURL);
    return {
      host: url.hostname || "127.0.0.1",
      port: Number(url.port) || 6379,
      password: url.password || undefined,
    };
  }
  // Bare host:port format
  const [host, portStr] = redisURL.split(":");
  return {
    host: host || "127.0.0.1",
    port: Number(portStr) || 6379,
  };
}

export function createRedisConnection(redisURL: string): Redis {
  const opts = parseRedisURL(redisURL);
  return new Redis({
    host: opts.host,
    port: opts.port,
    password: opts.password,
    maxRetriesPerRequest: null,
  });
}
