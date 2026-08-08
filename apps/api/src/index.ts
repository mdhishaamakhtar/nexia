import { serve } from "@hono/node-server";
import { createApp } from "./app";

const { app, config, logger, shutdown } = await createApp(process.env.CONFIG_DIR ?? "config");

const port = config.server.port;
const server = serve({ fetch: app.fetch, port });
// Chat responses stream for as long as the model takes; no socket idle timeout.
server.setTimeout(0);
logger.info({ port }, "nexia api listening");

let shuttingDown = false;
async function handleSignal(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "received shutdown signal");
  await new Promise<void>((done) => server.close(() => done()));
  await shutdown();
  process.exit(0);
}

process.on("SIGTERM", () => void handleSignal("SIGTERM"));
process.on("SIGINT", () => void handleSignal("SIGINT"));
