import { createApp } from "./app";

const { app, config, logger, shutdown } = await createApp(Bun.env.CONFIG_DIR ?? "config");

const port = config.server.port;
const server = Bun.serve({ port, fetch: app.fetch, idleTimeout: 0 });
logger.info({ port }, "nexia api listening");

let shuttingDown = false;
async function handleSignal(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "received shutdown signal");
  await server.stop();
  await shutdown();
  process.exit(0);
}

process.on("SIGTERM", () => void handleSignal("SIGTERM"));
process.on("SIGINT", () => void handleSignal("SIGINT"));
