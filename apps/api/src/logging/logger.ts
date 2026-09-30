import pino from "pino";
import type { Config } from "../config/config";

export type Logger = pino.Logger;

/**
 * JSON lines on stdout. For readable local output, pipe through pino-pretty:
 * `npm run dev:api | npx pino-pretty`.
 */
export function createLogger(cfg: Config): Logger {
  const level = process.env.LOG_LEVEL ?? (cfg.server.mode === "debug" ? "debug" : "info");
  return pino({
    level,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
