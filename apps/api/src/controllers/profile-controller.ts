import { Hono } from "hono";
import { listProfilesQuerySchema, profileInputSchema } from "@nexia/shared";
import type { ProfileService } from "../services/profile-service";
import type { AppEnv } from "../middleware/auth";
import { errNotFound } from "../services/errors";
import { parseJsonBody, parseOrThrow } from "../utils/validation";

/** An id that is not a positive integer cannot name a profile: treat it as missing. */
function profileId(raw: string): number {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) throw errNotFound();
  return id;
}

export function createProfileController(profileService: ProfileService) {
  const app = new Hono<AppEnv>();

  app.post("/", async (c) => {
    const input = await parseJsonBody(c, profileInputSchema);
    const created = await profileService.createProfile(input, c.get("userId"));
    return c.json({ id: created.id }, 201);
  });

  app.get("/", async (c) => {
    const { page, limit, search, relationship_type } = parseOrThrow(
      listProfilesQuerySchema,
      c.req.query()
    );
    const result = await profileService.listProfiles(
      { page, limit, search, relationshipType: relationship_type },
      c.get("userId")
    );
    return c.json({ data: result.profiles, total: result.total, page, limit });
  });

  app.get("/:id", async (c) => {
    const profile = await profileService.getProfile(profileId(c.req.param("id")), c.get("userId"));
    if (!profile) throw errNotFound();
    return c.json(profile);
  });

  app.put("/:id", async (c) => {
    const id = profileId(c.req.param("id"));
    const input = await parseJsonBody(c, profileInputSchema);
    const updated = await profileService.replaceProfile(id, input, c.get("userId"));
    return c.json(updated);
  });

  app.delete("/:id", async (c) => {
    await profileService.deleteProfile(profileId(c.req.param("id")), c.get("userId"));
    return c.json({ message: "Profile deleted" });
  });

  return app;
}
