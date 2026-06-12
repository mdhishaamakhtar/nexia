import type { Context } from "hono";

export function respondSuccess(c: Context, status: number, data: unknown): Response {
  return c.json(data, status);
}

export function respondErrorResponse(
  c: Context,
  status: number,
  code: string,
  message: string,
): Response {
  return c.json({ error: { code, message } }, status);
}
