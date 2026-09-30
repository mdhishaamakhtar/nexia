import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorCode } from "@nexia/shared";

/** Writes the `{ error: { code, message } }` envelope every failure uses. */
export function respondError(
  c: Context,
  status: ContentfulStatusCode,
  code: ErrorCode,
  message: string
): Response {
  return c.json({ error: { code, message } }, status);
}
