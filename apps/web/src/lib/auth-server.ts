import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ??
  "https://not-configured.convex.cloud";
const convexSiteUrl =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
  "https://not-configured.convex.site";

export function isAuthBackendConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL &&
      process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
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
