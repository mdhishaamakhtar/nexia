import { describe, test, expect } from "vitest";
import type { ProfileOutput } from "@nexia/shared";
import { ProfileService, type ProfileRepo, type EmbeddingQueue } from "../services/profile-service";
import { ServiceError, ErrorKind } from "../services/errors";
import pino from "pino";

const logger = pino({ level: "silent" });

/** Builds a minimal valid ProfileOutput for repo fakes to return. */
function profileOutput(overrides: Partial<ProfileOutput> = {}): ProfileOutput {
  return {
    id: 100,
    user_id: 77,
    full_name: "Alice",
    pronouns: "",
    relationship_type: "Friend",
    bio: "",
    profession: "",
    long_term_goals: "",
    birthday: null,
    zodiac_sign: null,
    music_preference: "",
    favorite_movie: "",
    favorite_book: "",
    notes: "",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    tags: [],
    political_views: [],
    food_restrictions: [],
    movie_genres: [],
    book_genres: [],
    hangout_places: [],
    quotes: [],
    favorite_memories: [],
    top_songs: [],
    associated_song: null,
    ...overrides,
  };
}

class FakeProfileRepo implements ProfileRepo {
  created: Array<{ id: number; userId: number }> = [];
  updatedProfiles: Array<{ id: number; userId: number; input: unknown }> = [];
  deleted: Array<{ id: number; userId: number }> = [];
  createResp: ProfileOutput = profileOutput();
  updateResp: ProfileOutput = profileOutput();
  findByIdResp: ProfileOutput | null = null;
  findAllResp: { profiles: ProfileOutput[]; total: number } = { profiles: [], total: 0 };
  err: Error | null = null;

  async create(input: Parameters<ProfileRepo["create"]>[0]) {
    if (this.err) throw this.err;
    this.created.push({ id: this.createResp.id, userId: input.profile.userId as number });
    return this.createResp;
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
    return this.updateResp;
  }
  async loadForEmbedding(_profileId: number) {
    return profileOutput();
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

    repo.createResp = profileOutput({ id: 100, user_id: 77, full_name: "Alice" });

    const result = await svc.createProfile(
      {
        ...minimalProfile,
        birthday: "2001-03-22",
        top_songs: [{ name: "Song", artist: "Artist" }],
      },
      77
    );
    expect(result.full_name).toBe("Alice");
    expect(queue.embedded).toEqual([100]);
  });

  test("create validation — >3 top songs", async () => {
    const svc = new ProfileService(new FakeProfileRepo(), new FakeEmbeddingQueue(), logger);
    try {
      await svc.createProfile(
        {
          ...minimalProfile,
          top_songs: [
            { name: "a", artist: "b" },
            { name: "c", artist: "d" },
            { name: "e", artist: "f" },
            { name: "g", artist: "h" },
          ],
        },
        1
      );
      expect.unreachable();
    } catch (err) {
      expect(err instanceof ServiceError).toBe(true);
      expect((err as ServiceError).kind).toBe(ErrorKind.Validation);
    }
  });

  test("list profiles bounds", async () => {
    const repo = new FakeProfileRepo();
    repo.findAllResp = { profiles: [profileOutput({ id: 1 })], total: 1 };
    const svc = new ProfileService(repo, null, logger);

    const result = await svc.listProfiles(0, 500, undefined, undefined, 1);
    expect(result.profiles.length).toBe(1);
    expect(result.total).toBe(1);
  });

  test("update and delete", async () => {
    const repo = new FakeProfileRepo();
    repo.updateResp = profileOutput({ id: 10, user_id: 3, full_name: "Bob" });
    const queue = new FakeEmbeddingQueue();
    const svc = new ProfileService(repo, queue, logger);

    await svc.updateProfile(
      10,
      { full_name: "Bob", relationship_type: "Friend", top_songs: [{ name: "Song", artist: "A" }] },
      3
    );
    expect(repo.updatedProfiles.length).toBe(1);
    expect(repo.updatedProfiles[0]!.id).toBe(10);
    expect(queue.embedded).toEqual([10]);

    await svc.deleteProfile(10, 3);
    expect(repo.deleted).toEqual([{ id: 10, userId: 3 }]);
    expect(queue.deleted).toEqual([10]);
  });

  test("partial update preserves omitted birthday/zodiac", async () => {
    const repo = new FakeProfileRepo();
    repo.updateResp = profileOutput({ id: 10 });
    const svc = new ProfileService(repo, new FakeEmbeddingQueue(), logger);

    // Agent patches just the profession — no birthday in the payload.
    await svc.updateProfile(10, { profession: "Doctor" }, 3);

    const sent = repo.updatedProfiles[0]!.input as {
      profile: Record<string, unknown>;
    };
    // birthday/zodiac must be absent so Drizzle leaves the stored values intact;
    // sending them would null out the existing date (the bug this guards).
    expect("birthday" in sent.profile).toBe(false);
    expect("zodiacSign" in sent.profile).toBe(false);
    expect(sent.profile.profession).toBe("Doctor");
  });

  test("update with birthday re-derives zodiac", async () => {
    const repo = new FakeProfileRepo();
    repo.updateResp = profileOutput({ id: 11 });
    const svc = new ProfileService(repo, new FakeEmbeddingQueue(), logger);

    await svc.updateProfile(11, { birthday: "2001-03-22" }, 3);

    const sent = repo.updatedProfiles[0]!.input as {
      profile: Record<string, unknown>;
    };
    expect(sent.profile.birthday).toBe("2001-03-22");
    expect(sent.profile.zodiacSign).toBe("Aries");
  });

  test("update clearing birthday nulls zodiac", async () => {
    const repo = new FakeProfileRepo();
    repo.updateResp = profileOutput({ id: 12 });
    const svc = new ProfileService(repo, new FakeEmbeddingQueue(), logger);

    await svc.updateProfile(12, { birthday: null }, 3);

    const sent = repo.updatedProfiles[0]!.input as {
      profile: Record<string, unknown>;
    };
    expect(sent.profile.birthday).toBe(null);
    expect(sent.profile.zodiacSign).toBe(null);
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
      await svc.updateProfile(
        1,
        {
          ...minimalProfile,
          top_songs: [
            { name: "a", artist: "b" },
            { name: "c", artist: "d" },
            { name: "e", artist: "f" },
            { name: "g", artist: "h" },
          ],
        },
        1
      );
      expect.unreachable();
    } catch (err) {
      expect(err instanceof ServiceError).toBe(true);
      expect((err as ServiceError).kind).toBe(ErrorKind.Validation);
    }
  });

  test("list profiles limit zero uses default", async () => {
    const repo = new FakeProfileRepo();
    repo.findAllResp = { profiles: [profileOutput({ id: 1 })], total: 1 };
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
    repo.createResp = profileOutput({ id: 100, user_id: 1 });
    const queue = new FakeEmbeddingQueue();
    queue.err = new Error("queue unavailable");
    const svc = new ProfileService(repo, queue, logger);

    await svc.createProfile(
      { ...minimalProfile, top_songs: [{ name: "Song", artist: "Artist" }] },
      1
    );
    expect(repo.created.length).toBe(1);
  });
});
