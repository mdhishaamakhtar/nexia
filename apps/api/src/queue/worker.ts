import { Worker, UnrecoverableError } from "bullmq";
import Redis from "ioredis";
import { TYPE_EMBEDDING_TASK, TYPE_DELETION_TASK, type EmbeddingPayload, type DeletionPayload } from "./types";
import type { Logger } from "../logging/logger";
import { ErrorKind, isServiceError } from "../services/errors";

export interface EmbeddingRunner {
  embedProfile(profileId: number): Promise<void>;
  deleteEmbedding(profileId: number): Promise<void>;
}

export function createWorker(
  redis: Redis,
  runner: EmbeddingRunner,
  logger: Logger,
  concurrency = 2,
): Worker {
  const log = logger.child({ component: "queue_worker" });

  const worker = new Worker(
    "nexia-embedding",
    async (job) => {
      switch (job.name) {
        case TYPE_EMBEDDING_TASK: {
          const payload = job.data as EmbeddingPayload;
          if (!payload || typeof payload.profile_id !== "number") {
            throw new UnrecoverableError("invalid embedding payload");
          }

          log.info({ profileId: payload.profile_id }, "processing embedding task");

          try {
            await runner.embedProfile(payload.profile_id);
          } catch (err) {
            if (isServiceError(err) && err.kind === ErrorKind.NotFound) {
              log.warn({ profileId: payload.profile_id }, "embedding task skipped: profile not found");
              throw new UnrecoverableError("profile not found");
            }
            throw err;
          }

          log.info({ profileId: payload.profile_id }, "embedding task completed");
          return;
        }

        case TYPE_DELETION_TASK: {
          const payload = job.data as DeletionPayload;
          if (!payload || typeof payload.profile_id !== "number") {
            throw new UnrecoverableError("invalid deletion payload");
          }

          log.info({ profileId: payload.profile_id }, "processing deletion task");

          try {
            await runner.deleteEmbedding(payload.profile_id);
          } catch (err) {
            throw new Error(`deletion failed: ${err instanceof Error ? err.message : String(err)}`);
          }

          log.info({ profileId: payload.profile_id }, "deletion task completed");
          return;
        }

        default:
          throw new UnrecoverableError(`unknown job type: ${job.name}`);
      }
    },
    {
      connection: redis,
      concurrency,
    },
  );

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, jobName: job?.name, err: String(err) }, "job failed");
  });

  return worker;
}
