import { describe, test, expect } from "bun:test";
import { ProfileService, type ProfileRepo, type EmbeddingQueue } from "../services/profile-service";
import { ServiceError, ErrorKind } from "../services/errors";
import pino from "pino";

const logger = pino({ level: "silent" });

class FakeProfileRepo implements ProfileRepo {
  created: Array<{ id: number; userId: number }> = [];
  updatedProfiles: Array<{ id: number; userId: number; input: Record<string, unknown> }> = [];
  deleted: Array<{ id: number; userId: number }> = [];
  findByIdResp: Record<string, unknown> | null = null;
  findAllResp: { profiles: Record<string, unknown>[]; total: number } = { profiles: [], total: 0 };
  err: Error | null = null;

  async create(input: Parameters<ProfileRepo["create"]>[0]) {
    if (this.err) throw this.err;
    const created = { id: 100, userId: (input.profile as Record<string, unknown>).userId as number };
    this.created.push(created);
    return created;
  }
  async findById(_id: number, _userId: number) {
    if (this.err) throw this.err;
    return this.findByIdResp;
  }
  async findAll(_params: Parameters<ProfileRepo["findAll"]>[0]) {
    if (this.err) throw this.err;
    return this.findAllResp;
  }
  async update(profileId: number, userId: number, input: Parameters<ProfileRepo["update"]>[2]) {
    if (this.err) throw this.err;
    this.updatedProfiles.push({ id: profileId, userId, input });
    return { id: profileId, userId };
  }
  async loadForEmbedding(_profileId: number) {
    return { id: 1, userId: 1 };
  }
  async delete(id: number, userId: number) {
    if (this.err) throw this.err;
    this.deleted.push({ id, userId });
  }
}

class FakeEmbeddingQueue implements EmbeddingQueue {
  embedded: number[] = [];
  deleted: number[] = [];
  err: Error | null = null;

  async enqueueEmbeddingTask(id: number) {
    if (this.err) throw this.err;
    this.embedded.push(id);
  }
  async enqueueDeletionTask(id: number) {
    if (this.err) throw this.err;
    this.deleted.push(id);
  }
}

const minimalProfile = {
  full_name: "Alice",
  relationship_type: "Friend" as const,
};

describe("ProfileService", () => {
  test("create profile", async () => {
    const repo = new FakeProfileRepo();
    const queue = new FakeEmbeddingQueue();
    const svc = new ProfileService(repo, queue, logger);

    repo.findByIdResp = { id: 100, userId: 77, fullName: "Alice", zodiacSign: "Aries" };

    const result = await svc.createProfile(
      { ...minimalProfile, birthday: "2001-03-22", top_songs: [{ name: "Song", artist: "Artist" }] },
      77,
    );
    expect(result.fullName).toBe("Alice");
    expect(queue.embedded).toEqual([100]);
  });

  test("create validation — >3 top songs", async () => {
    const svc = new ProfileService(new FakeProfileRepo(), new FakeEmbeddingQueue(), logger);
    try {
      await svc.createProfile({
        ...minimalProfile,
        top_songs: [
          { name: "a", artist: "b" },
          { name: "c", artist: "d" },
          { name: "e", artist: "f" },
          { name: "g", artist: "h" },
        ],
      }, 1);
      expect.unreachable();
    } catch (err) {
      expect(err instanceof ServiceError).toBe(true);
      expect((err as ServiceError).kind).toBe(ErrorKind.Validation);
    }
  });

  test("list profiles bounds", async () => {
    const repo = new FakeProfileRepo();
    repo.findAllResp = { profiles: [{ id: 1 }], total: 1 };
    const svc = new ProfileService(repo, null, logger);

    const result = await svc.listProfiles(0, 500, undefined, undefined, 1);
    expect(result.profiles.length).toBe(1);
    expect(result.total).toBe(1);
  });

  test("update and delete", async () => {
    const repo = new FakeProfileRepo();
    repo.findByIdResp = { id: 10, userId: 3, fullName: "Bob" };
    const queue = new FakeEmbeddingQueue();
    const svc = new ProfileService(repo, queue, logger);

    await svc.updateProfile(10, { full_name: "Bob", relationship_type: "Friend", top_songs: [{ name: "Song", artist: "A" }] }, 3);
    expect(repo.updatedProfiles.length).toBe(1);
    expect(repo.updatedProfiles[0]!.id).toBe(10);
    expect(queue.embedded).toEqual([10]);

    await svc.deleteProfile(10, 3);
    expect(repo.deleted).toEqual([{ id: 10, userId: 3 }]);
    expect(queue.deleted).toEqual([10]);
  });

  test("repo errors propagate", async () => {
    const repo = new FakeProfileRepo();
    repo.err = new Error("repo failed");
    const svc = new ProfileService(repo, new FakeEmbeddingQueue(), logger);

    try {
      await svc.createProfile({ ...minimalProfile, top_songs: [{ name: "a", artist: "b" }] }, 1);
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message).toBe("repo failed");
    }
  });

  test("update validation — >3 top songs", async () => {
    const svc = new ProfileService(new FakeProfileRepo(), new FakeEmbeddingQueue(), logger);
    try {
      await svc.updateProfile(1, {
        ...minimalProfile,
        top_songs: [
          { name: "a", artist: "b" },
          { name: "c", artist: "d" },
          { name: "e", artist: "f" },
          { name: "g", artist: "h" },
        ],
      }, 1);
      expect.unreachable();
    } catch (err) {
      expect(err instanceof ServiceError).toBe(true);
      expect((err as ServiceError).kind).toBe(ErrorKind.Validation);
    }
  });

  test("list profiles limit zero uses default", async () => {
    const repo = new FakeProfileRepo();
    repo.findAllResp = { profiles: [{ id: 1 }], total: 1 };
    const svc = new ProfileService(repo, null, logger);

    const result = await svc.listProfiles(1, 0, undefined, undefined, 1);
    expect(result.profiles.length).toBe(1);
  });

  test("delete queue error does not fail", async () => {
    const repo = new FakeProfileRepo();
    const queue = new FakeEmbeddingQueue();
    queue.err = new Error("queue unavailable");
    const svc = new ProfileService(repo, queue, logger);

    await svc.deleteProfile(5, 1);
    expect(repo.deleted).toEqual([{ id: 5, userId: 1 }]);
  });

  test("create queue error does not fail", async () => {
    const repo = new FakeProfileRepo();
    repo.findByIdResp = { id: 100, userId: 1 };
    const queue = new FakeEmbeddingQueue();
    queue.err = new Error("queue unavailable");
    const svc = new ProfileService(repo, queue, logger);

    await svc.createProfile({ ...minimalProfile, top_songs: [{ name: "Song", artist: "Artist" }] }, 1);
    expect(repo.created.length).toBe(1);
  });
});
