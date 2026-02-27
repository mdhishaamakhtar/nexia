import type { NextConfig } from "next";

// In Docker Compose the backend service is reachable as "backend".
// Locally, fall back to localhost. Override via BACKEND_URL env var.
const backendURL = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendURL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
