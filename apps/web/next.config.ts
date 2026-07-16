import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  // Canonical host is the apex (no www). Keep GitHub OAuth / SITE_URL on
  // https://devoetbalgazet.be. Also set that domain as Primary in Vercel →
  // Settings → Domains, otherwise Vercel may 308 apex → www and fight this.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.devoetbalgazet.be" }],
        destination: "https://devoetbalgazet.be/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
