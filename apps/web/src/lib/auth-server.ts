import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

function resolveConvexUrls() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return {
      convexUrl: "https://not-configured.convex.cloud",
      convexSiteUrl: "https://not-configured.convex.site",
    };
  }

  // Prefer explicit site URL; otherwise derive from the cloud URL so a Vercel
  // build that only injects NEXT_PUBLIC_CONVEX_URL (via `convex deploy --cmd`)
  // still proxies auth to the correct .convex.site host.
  const convexSiteUrl =
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
    convexUrl.replace(/\.convex\.cloud$/u, ".convex.site");

  return { convexUrl, convexSiteUrl };
}

const { convexUrl, convexSiteUrl } = resolveConvexUrls();

export function isAuthBackendConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL &&
      (process.env.NEXT_PUBLIC_CONVEX_SITE_URL ||
        process.env.NEXT_PUBLIC_CONVEX_URL.endsWith(".convex.cloud")),
  );
}

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl,
  convexSiteUrl,
});
