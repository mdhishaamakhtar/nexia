import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Queue } from "bullmq";
import { eq } from "drizzle-orm";
import { profileEmbeddings } from "../../src/db/schema";
import { QUEUE_NAME, TYPE_DELETION_TASK, TYPE_EMBEDDING_TASK } from "../../src/queue/types";
import { createHarness, type Harness } from "../helpers/harness";
import { bearerAuth, call, profileInput, seedUser } from "../helpers/factories";
import { waitFor } from "../helpers/wait";

let h: Harness;
let queue: Queue;

interface Failure {
  jobId: string | undefined;
  message: string;
}
const failures: Failure[] = [];
const completed: Array<string | undefined> = [];

beforeAll(async () => {
  h = createHarness({ withQueue: true });
  queue = new Queue(QUEUE_NAME, { connection: h.redis! });

  h.runtime.worker!.on("failed", (job, err) => {
    failures.push({ jobId: job?.id, message: String(err) });
  });
  h.runtime.worker!.on("completed", (job) => completed.push(job?.id));
});

afterAll(async () => {
  await queue.close();
  await h.close();
});

beforeEach(async () => {
  await h.redis!.flushall();
  failures.length = 0;
  completed.length = 0;
});

const failureFor = (jobId: string | undefined) =>
  waitFor(async () => failures.find((f) => f.jobId === jobId) ?? null, {
    what: `job ${jobId} to fail`,
  });

describe("queue worker", () => {
  test("embeds a profile that exists", async () => {
    const user = await seedUser(h);
    const created = await call<{ id: number }>(h.app, "POST", "/api/v1/profiles", {
      headers: await bearerAuth(h, user.id),
      body: profileInput({ full_name: "Worker Subject" }),
    });

    await waitFor(
      async () => {
        const [row] = await h.db
          .select()
          .from(profileEmbeddings)
          .where(eq(profileEmbeddings.profileId, created.body.id));
        return row ?? null;
      },
      { what: "the embedding row" }
    );
  });

  test("gives up immediately on an embedding payload with no profile id", async () => {
    const job = await queue.add(TYPE_EMBEDDING_TASK, { nope: true }, { attempts: 5 });
    const failure = await failureFor(job.id);

    expect(failure.message).toContain("invalid embedding payload");
    // Unrecoverable: a malformed payload will never become valid, so retrying
    // it four more times only delays the queue.
    expect((await queue.getJob(job.id!))!.attemptsMade).toBe(1);
  });

  test("gives up immediately on a deletion payload with no profile id", async () => {
    const job = await queue.add(TYPE_DELETION_TASK, { profile_id: "not-a-number" });
    const failure = await failureFor(job.id);
    expect(failure.message).toContain("invalid deletion payload");
  });

  test("gives up immediately on an unknown job type", async () => {
    const job = await queue.add("task:nonsense", { profile_id: 1 }, { attempts: 5 });
    const failure = await failureFor(job.id);

    expect(failure.message).toContain("unknown job type");
    expect((await queue.getJob(job.id!))!.attemptsMade).toBe(1);
  });

  test("gives up when the profile no longer exists", async () => {
    // A profile deleted before its embedding job ran is the normal race, not an
    // error worth retrying five times.
    const job = await queue.add(TYPE_EMBEDDING_TASK, { profile_id: 999_999 }, { attempts: 5 });
    const failure = await failureFor(job.id);

    expect(failure.message).toContain("profile not found");
    expect((await queue.getJob(job.id!))!.attemptsMade).toBe(1);
  });

  test("retries when the embedding provider fails", async () => {
    const user = await seedUser(h);
    const created = await call<{ id: number }>(h.app, "POST", "/api/v1/profiles", {
      headers: await bearerAuth(h, user.id),
      body: profileInput({ full_name: "Flaky Provider" }),
    });
    await waitFor(
      async () => {
        const [row] = await h.db
          .select()
          .from(profileEmbeddings)
          .where(eq(profileEmbeddings.profileId, created.body.id));
        return row ?? null;
      },
      { what: "the first embedding" }
    );

    failures.length = 0;
    h.embeddings!.failNext(new Error("gemini is down"));
    const job = await queue.add(
      TYPE_EMBEDDING_TASK,
      { profile_id: created.body.id },
      { attempts: 2, backoff: { type: "fixed", delay: 10 } }
    );

    const failure = await waitFor(
      async () => failures.find((f) => f.message.includes("gemini embedding failed")) ?? null,
      { what: "the provider failure" }
    );
    expect(failure.message).toContain("gemini is down");

    // A provider outage is transient, so this one must be retried — and the
    // retry succeeds because only the first call was set to fail.
    await waitFor(async () => (completed.includes(job.id) ? true : null), {
      what: "the retry to succeed",
    });
  });

  test("deletes an embedding on a deletion task", async () => {
    const user = await seedUser(h);
    const created = await call<{ id: number }>(h.app, "POST", "/api/v1/profiles", {
      headers: await bearerAuth(h, user.id),
      body: profileInput(),
    });
    await waitFor(
      async () => {
        const [row] = await h.db
          .select()
          .from(profileEmbeddings)
          .where(eq(profileEmbeddings.profileId, created.body.id));
        return row ?? null;
      },
      { what: "the embedding row" }
    );

    await queue.add(TYPE_DELETION_TASK, { profile_id: created.body.id });

    await waitFor(
      async () => {
        const rows = await h.db
          .select()
          .from(profileEmbeddings)
          .where(eq(profileEmbeddings.profileId, created.body.id));
        return rows.length === 0 ? true : null;
      },
      { what: "the embedding to be deleted" }
    );
  });
});
