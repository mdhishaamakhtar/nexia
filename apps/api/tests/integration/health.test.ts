import { describe, test, expect, beforeAll, afterAll } from "vitest";
import type { ProfileOutput } from "@nexia/shared";
import { createHarness, type Harness } from "../helpers/harness";
import { bearerAuth, call, profileInput, seedUser } from "../helpers/factories";

describe("health probes", () => {
  let h: Harness;

  beforeAll(() => {
    h = createHarness();
  });
  afterAll(async () => {
    await h.close();
  });

  test("healthz reports ok", async () => {
    const res = await call<{ status: string }>(h.app, "GET", "/api/v1/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  test("readyz queries the real database", async () => {
    const res = await call<{ status: string }>(h.app, "GET", "/api/v1/readyz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  test("a profile round-trips through the real stack", async () => {
    const user = await seedUser(h);
    const auth = await bearerAuth(h, user.id);

    const created = await call<{ id: number }>(h.app, "POST", "/api/v1/profiles", {
      headers: auth,
      body: profileInput({ full_name: "Zoe Example", birthday: "1994-07-25" }),
    });
    expect(created.status).toBe(201);

    const got = await call<ProfileOutput>(h.app, "GET", `/api/v1/profiles/${created.body.id}`, {
      headers: auth,
    });
    expect(got.status).toBe(200);
    expect(got.body.full_name).toBe("Zoe Example");
    // Derived by the service from the birthday, never sent by the client.
    expect(got.body.zodiac_sign).toBe("Leo");
  });
});
