import { createApp } from "./app";

const configDir = Bun.env.CONFIG_DIR ?? "config";

const app = await createApp(configDir);

const port = Bun.env.PORT ? Number(Bun.env.PORT) : 8080;

console.log(`Starting server on port ${port}...`);

Bun.serve({
  port,
  fetch: app.fetch,
  idleTimeout: 0,
});
