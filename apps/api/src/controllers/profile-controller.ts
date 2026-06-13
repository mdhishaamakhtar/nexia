import { Hono } from "hono";
import { profileInputSchema, listProfilesQuerySchema } from "@nexia/shared";
import type { ProfileService } from "../services/profile-service";
import { respondWithServiceError, respondError } from "../services/errors";
import { getUserId } from "../middleware/auth";
import { parseJsonBody } from "../utils/validation";

export function createProfileController(profileService: ProfileService) {
  const app = new Hono();

  app.post("/", async (c) => {
    const userId = getUserId(c);
    if (!userId) return respondError(c, 401, "UNAUTHORIZED", "Authentication required");
    const parsed = await parseJsonBody(c, profileInputSchema);
    if (!parsed.ok) return parsed.response;
    try {
      const created = await profileService.createProfile(parsed.data, userId);
      return c.json({ id: created.id }, 201);
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.get("/", async (c) => {
    const userId = getUserId(c);
    if (!userId) return respondError(c, 401, "UNAUTHORIZED", "Authentication required");
    const query = listProfilesQuerySchema.safeParse({
      page: c.req.query("page"),
      limit: c.req.query("limit"),
      search: c.req.query("search"),
      relationship_type: c.req.query("relationship_type"),
    });
    if (!query.success) {
      return respondError(c, 400, "VALIDATION_ERROR", "Invalid query parameters");
    }
    const { page = 1, limit = 10, search, relationship_type } = query.data;
    try {
      const result = await profileService.listProfiles(
        page,
        limit,
        search,
        relationship_type,
        userId
      );
      return c.json({ data: result.profiles, total: result.total, page, limit });
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.get("/:id", async (c) => {
    const userId = getUserId(c);
    if (!userId) return respondError(c, 401, "UNAUTHORIZED", "Authentication required");
    const id = parseId(c.req.param("id"));
    if (id === null) return respondError(c, 400, "BAD_REQUEST", "Invalid profile ID");
    try {
      const profile = await profileService.getProfile(id, userId);
      if (!profile) return respondError(c, 404, "NOT_FOUND", "Resource not found");
      return c.json(profile);
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.put("/:id", async (c) => {
    const userId = getUserId(c);
    if (!userId) return respondError(c, 401, "UNAUTHORIZED", "Authentication required");
    const id = parseId(c.req.param("id"));
    if (id === null) return respondError(c, 400, "BAD_REQUEST", "Invalid profile ID");
    const parsed = await parseJsonBody(c, profileInputSchema);
    if (!parsed.ok) return parsed.response;
    try {
      await profileService.updateProfile(id, parsed.data, userId);
      return c.json({ message: "Profile updated" });
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.delete("/:id", async (c) => {
    const userId = getUserId(c);
    if (!userId) return respondError(c, 401, "UNAUTHORIZED", "Authentication required");
    const id = parseId(c.req.param("id"));
    if (id === null) return respondError(c, 400, "BAD_REQUEST", "Invalid profile ID");
    try {
      await profileService.deleteProfile(id, userId);
      return c.json({ message: "Profile deleted" });
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  return app;
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
