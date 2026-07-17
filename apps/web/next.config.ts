import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  // Browser source maps for PostHog error tracking. Upload privately in CI when
  // POSTHOG_PERSONAL_API_KEY / POSTHOG_CLI_ENV_ID are configured — do not rely on
  // public map hosting.
  productionBrowserSourceMaps: true,
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
  async headers() {
    return [
      {
        source: "/preview/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
