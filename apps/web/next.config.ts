import path from "node:path";
import type { NextConfig } from "next";

const workspaceRoot = path.resolve(process.cwd(), "..", "..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  // No `output: "standalone"`. Nothing consumes it — the Docker image copies
  // .next and runs `next start` — and on Vercel it collides with their own
  // build output step, which then fails looking for next-server.js.nft.json.
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
