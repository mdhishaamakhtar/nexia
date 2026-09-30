import { serve } from "@hono/node-server";
import { createApp } from "./app";

/** How long in-flight requests (a chat reply, say) get to finish on shutdown. */
const SHUTDOWN_GRACE_MS = 10_000;

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

  // Stop accepting connections, give open ones a bounded time, then go.
  const closed = new Promise<void>((done) => server.close(() => done()));
  const deadline = new Promise<void>((done) => setTimeout(done, SHUTDOWN_GRACE_MS).unref());
  await Promise.race([closed, deadline]);

  await shutdown();
  process.exit(0);
}

process.on("SIGTERM", () => void handleSignal("SIGTERM"));
process.on("SIGINT", () => void handleSignal("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandled promise rejection");
});
