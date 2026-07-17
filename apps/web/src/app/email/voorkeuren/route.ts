import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { isPlausibleEmailLinkToken } from "@/lib/email-link-token";
import { getPublicRequestOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";

function getClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Voorkeurentoegang is nog niet geconfigureerd.");
  }
  return new ConvexHttpClient(convexUrl);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const publicOrigin = getPublicRequestOrigin(request);
  const token = requestUrl.searchParams.get("token");
  if (!token || !isPlausibleEmailLinkToken(token)) {
    return NextResponse.redirect(
      new URL("/voorkeuren?auth_fout=ongeldige-link", publicOrigin),
      303,
    );
  }

  try {
    const exchange = await getClient().mutation(api.emailLinks.exchangeBootstrapToken, {
      token,
      purpose: "preferences_access",
    });
    const verifyUrl = new URL("/api/auth/magic-link/verify", publicOrigin);
    verifyUrl.searchParams.set("token", exchange.magicLinkToken);
    verifyUrl.searchParams.set("callbackURL", exchange.callbackPath);
    verifyUrl.searchParams.set("errorCallbackURL", "/voorkeuren?auth_fout=1");
    return NextResponse.redirect(verifyUrl, 303);
  } catch {
    return NextResponse.redirect(
      new URL("/voorkeuren?auth_fout=ongeldige-link", publicOrigin),
      303,
    );
  }
}
