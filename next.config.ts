import path from "node:path";
import type { NextConfig } from "next";

// Initialize the OpenNext Cloudflare dev shim so `getCloudflareContext()` works
// during `next dev`. No-op in production builds.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root: a stray parent lockfile (the SundaySuite repos share
  // a parent dir) would otherwise be auto-selected and break output tracing.
  turbopack: {
    root: path.join(__dirname),
  },
  // TS 7 side-om-side: `typescript` peker på TS 6-kompatpakken (uten bin.tsc), så Next
  // må bruke in-process API-typesjekkeren. Lastbærende, se docs/DECISIONS.md ADR-001.
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
