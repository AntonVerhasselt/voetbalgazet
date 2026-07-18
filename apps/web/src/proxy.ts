import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import {
  PREVIEW_COOKIE,
  verifyPreviewToken,
} from "@/lib/preview-session";

/** Admin entry routes that must stay reachable without a session cookie. */
const ADMIN_PUBLIC_PATHS = new Set([
  "/admin/inloggen",
  "/admin/claim",
  "/admin/agent-inloggen",
]);

function withPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function isAdminPublicPath(pathname: string): boolean {
  return ADMIN_PUBLIC_PATHS.has(pathname);
}

/**
 * Next.js 16 request proxy (replaces the deprecated middleware convention).
 * Centralizes early auth gates for admin/Keystatic and draft preview.
 *
 * Full membership/role checks still run in route layouts via Convex —
 * this only blocks obviously unauthenticated traffic and invalid preview cookies.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/keystatic")) {
    if (isAdminPublicPath(pathname)) {
      return NextResponse.next();
    }

    const sessionToken = getSessionCookie(request);
    if (!sessionToken) {
      const loginUrl = new URL("/admin/inloggen", request.url);
      if (pathname !== "/admin" && pathname !== "/admin/") {
        loginUrl.searchParams.set("terug", `${pathname}${request.nextUrl.search}`);
      }
      return NextResponse.redirect(loginUrl);
    }

    return withPrivateHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/preview/nieuws/")) {
    const token = request.cookies.get(PREVIEW_COOKIE)?.value;
    if (!token || !verifyPreviewToken(token)) {
      return withPrivateHeaders(
        new NextResponse("Preview sessie ongeldig of verlopen.", {
          status: 403,
        }),
      );
    }
    return withPrivateHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/preview/")) {
    return withPrivateHeaders(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/keystatic",
    "/keystatic/:path*",
    "/preview/:path*",
  ],
};
