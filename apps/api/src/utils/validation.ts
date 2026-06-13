import type { Context } from "hono";
import type { ZodType } from "zod";
import { respondError } from "./http";

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: Response };

function formatZodIssues(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): string {
  return error.issues
    .map((i) => (i.path.length > 0 ? `${i.path.join(".")}: ${i.message}` : i.message))
    .join("; ");
}

/**
 * Reads and validates a JSON request body against a zod schema. On failure it
 * returns a ready-to-send 400 response (invalid JSON → BAD_REQUEST, schema
 * mismatch → VALIDATION_ERROR) so callers can early-return.
 */
export async function parseJsonBody<T>(c: Context, schema: ZodType<T>): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return { ok: false, response: respondError(c, 400, "BAD_REQUEST", "Invalid JSON body") };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: respondError(c, 400, "VALIDATION_ERROR", formatZodIssues(result.error)),
    };
  }

  return { ok: true, data: result.data };
}
