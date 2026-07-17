import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { isPlausibleEmailLinkToken } from "@/lib/email-link-token";

const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export const runtime = "nodejs";

function getClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Artikeltoegang is nog niet geconfigureerd.");
  }
  return new ConvexHttpClient(convexUrl);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");
  const slug = requestUrl.searchParams.get("slug");

  if (!token || !isPlausibleEmailLinkToken(token) || !slug || !SAFE_SLUG.test(slug)) {
    return NextResponse.redirect(
      new URL("/?auth_fout=ongeldige-link", requestUrl.origin),
      303,
    );
  }

  try {
    const exchange = await getClient().mutation(api.emailLinks.exchangeBootstrapToken, {
      token,
      purpose: "article_access",
      articleSlug: slug,
    });
    const verifyUrl = new URL("/api/auth/magic-link/verify", requestUrl.origin);
    verifyUrl.searchParams.set("token", exchange.magicLinkToken);
    verifyUrl.searchParams.set("callbackURL", exchange.callbackPath);
    verifyUrl.searchParams.set(
      "errorCallbackURL",
      `${exchange.callbackPath}?auth_fout=1`,
    );
    return NextResponse.redirect(verifyUrl, 303);
  } catch {
    return NextResponse.redirect(
      new URL(`/?auth_fout=ongeldige-link`, requestUrl.origin),
      303,
    );
  }
}
