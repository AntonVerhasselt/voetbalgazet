import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import {
  GENERATED_CONVEX_SITE_URL,
  GENERATED_CONVEX_URL,
} from "./convex-public-env.generated";

type ConvexUrls = {
  convexUrl: string;
  convexSiteUrl: string;
};

type AuthHelpers = ReturnType<typeof convexBetterAuthNextJs>;

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

function deriveSiteUrl(convexUrl: string): string {
  if (
    convexUrl === "http://127.0.0.1:3210" ||
    convexUrl === "http://localhost:3210"
  ) {
    return convexUrl.replace(":3210", ":3211");
  }
  if (!convexUrl.endsWith(".convex.cloud")) {
    return "";
  }
  // Keep host labels as Convex wrote them (including region for some
  // deployments). Only swap the TLD: .cloud → .site.
  return convexUrl.replace(/\.convex\.cloud$/u, ".convex.site");
}

function resolveConvexUrls(): ConvexUrls | null {
  // Prefer URLs baked by `convex deploy --cmd` (canonical HTTP Actions host).
  // Those beat a wrong/stale Vercel dashboard value such as a regional
  // `*.eu-west-1.convex.site` that 404s for some prod deployments.
  // Local `next dev` keeps GENERATED_* empty and uses .env.local instead.
  const convexUrl =
    GENERATED_CONVEX_URL || trimEnv(process.env.NEXT_PUBLIC_CONVEX_URL);
  const convexSiteUrl =
    GENERATED_CONVEX_SITE_URL ||
    trimEnv(process.env.NEXT_PUBLIC_CONVEX_SITE_URL) ||
    deriveSiteUrl(convexUrl);

  if (!convexUrl || !convexSiteUrl) {
    return null;
  }

  const parsedSiteUrl = new URL(convexSiteUrl);
  const isLocalDevelopmentSite =
    parsedSiteUrl.protocol === "http:" &&
    (parsedSiteUrl.hostname === "127.0.0.1" ||
      parsedSiteUrl.hostname === "localhost") &&
    parsedSiteUrl.port === "3211";
  if (!convexSiteUrl.endsWith(".convex.site") && !isLocalDevelopmentSite) {
    throw new Error(
      `NEXT_PUBLIC_CONVEX_SITE_URL must be a *.convex.site URL or the local Convex HTTP Actions URL (got "${convexSiteUrl}").`,
    );
  }

  return { convexUrl, convexSiteUrl };
}

let authHelpers: AuthHelpers | null = null;
let authHelpersKey: string | null = null;

function getAuthHelpers(): AuthHelpers {
  const urls = resolveConvexUrls();
  if (!urls) {
    throw new Error(
      "Convex auth is not configured. Set NEXT_PUBLIC_CONVEX_URL and NEXT_PUBLIC_CONVEX_SITE_URL " +
        "(use the HTTP Actions URL from the Convex dashboard, e.g. https://calculating-eel-615.convex.site).",
    );
  }

  const key = `${urls.convexUrl}|${urls.convexSiteUrl}`;
  if (!authHelpers || authHelpersKey !== key) {
    authHelpers = convexBetterAuthNextJs(urls);
    authHelpersKey = key;
  }
  return authHelpers;
}

export function isAuthBackendConfigured(): boolean {
  return resolveConvexUrls() !== null;
}

export function getAuthProxyTarget(): string | null {
  return resolveConvexUrls()?.convexSiteUrl ?? null;
}

/** Lazy request handlers so production never bakes a dead not-configured host. */
export const handler = {
  GET: (request: Request) => getAuthHelpers().handler.GET(request),
  POST: (request: Request) => getAuthHelpers().handler.POST(request),
};

function lazyMethod<K extends keyof AuthHelpers>(key: K): AuthHelpers[K] {
  return ((...args: unknown[]) => {
    const method = getAuthHelpers()[key];
    if (typeof method !== "function") {
      return method;
    }
    return (method as (...methodArgs: unknown[]) => unknown).apply(
      getAuthHelpers(),
      args,
    );
  }) as AuthHelpers[K];
}

export const preloadAuthQuery = lazyMethod("preloadAuthQuery");
export const isAuthenticated = lazyMethod("isAuthenticated");
export const getToken = lazyMethod("getToken");
export const fetchAuthQuery = lazyMethod("fetchAuthQuery");
export const fetchAuthMutation = lazyMethod("fetchAuthMutation");
export const fetchAuthAction = lazyMethod("fetchAuthAction");
