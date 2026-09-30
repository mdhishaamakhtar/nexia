import type { Context } from "hono";
import type { ZodType } from "zod";
import { errValidation, ServiceError, ErrorKind } from "../services/errors";

function formatZodIssues(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): string {
  return error.issues
    .map((i) => (i.path.length > 0 ? `${i.path.join(".")}: ${i.message}` : i.message))
    .join("; ");
}

/** Validates `raw` against a schema, throwing a 400-mapped ServiceError on failure. */
export function parseOrThrow<T>(schema: ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw errValidation(formatZodIssues(result.error));
  return result.data;
}

/**
 * Reads and validates a JSON request body. Invalid JSON and schema mismatches
 * both throw a validation ServiceError, which the error handler turns into a
 * 400, so handlers stay a straight line: parse, call, respond.
 */
export async function parseJsonBody<T>(c: Context, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new ServiceError(ErrorKind.Validation, "The request body is not valid JSON");
  }
  return parseOrThrow(schema, raw);
}
