import { Hono } from "hono";
import type { ProfileService } from "../services/profile-service";
import { respondWithServiceError } from "../services/errors";
import { getUserId } from "../middleware/auth";

export function createProfileController(profileService: ProfileService) {
  const app = new Hono();

  app.post("/", async (c) => {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
    }
    try {
      const body = await c.req.json();
      const created = await profileService.createProfile(body, userId);
      return c.json({ id: created.id }, 201);
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.get("/", async (c) => {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
    }
    try {
      const page = Math.max(1, Number(c.req.query("page")) || 1);
      let limit = Number(c.req.query("limit")) || 10;
      if (limit < 1) limit = 10;
      if (limit > 100) limit = 100;
      const search = c.req.query("search") || undefined;
      const relationshipType = c.req.query("relationship_type") || undefined;

      const result = await profileService.listProfiles(
        page,
        limit,
        search,
        relationshipType,
        userId
      );
      return c.json({
        data: result.profiles,
        total: result.total,
        page,
        limit,
      });
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.get("/:id", async (c) => {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
    }
    const id = Number(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ error: { code: "BAD_REQUEST", message: "Invalid profile ID" } }, 400);
    }
    try {
      const profile = await profileService.getProfile(id, userId);
      if (!profile) {
        return c.json({ error: { code: "NOT_FOUND", message: "Resource not found" } }, 404);
      }
      return c.json(profile);
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.put("/:id", async (c) => {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
    }
    const id = Number(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ error: { code: "BAD_REQUEST", message: "Invalid profile ID" } }, 400);
    }
    try {
      const body = await c.req.json();
      await profileService.updateProfile(id, body, userId);
      return c.json({ message: "Profile updated" });
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.delete("/:id", async (c) => {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
    }
    const id = Number(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ error: { code: "BAD_REQUEST", message: "Invalid profile ID" } }, 400);
    }
    try {
      await profileService.deleteProfile(id, userId);
      return c.json({ message: "Profile deleted" });
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  return app;
}
