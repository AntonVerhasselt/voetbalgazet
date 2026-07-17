import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

export const runtime = "nodejs";

function getClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Uitschrijven is nog niet geconfigureerd.");
  }
  return new ConvexHttpClient(convexUrl);
}

function readTokenAndOneClick(form: FormData, requestUrl: URL): {
  token: string;
  oneClick: boolean;
} {
  const listUnsubscribe = String(form.get("List-Unsubscribe") ?? "");
  const oneClick = listUnsubscribe.toLowerCase() === "one-click";
  let token = String(form.get("token") ?? "");
  if (!token || token.toLowerCase() === "one-click") {
    token = requestUrl.searchParams.get("token") ?? "";
  }
  return { token, oneClick };
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const contentType = request.headers.get("content-type") ?? "";
  let token = requestUrl.searchParams.get("token") ?? "";
  let oneClick = false;

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { token?: string };
      token = body.token ?? token;
    } else {
      const form = await request.formData();
      const parsed = readTokenAndOneClick(form, requestUrl);
      token = parsed.token || token;
      oneClick = parsed.oneClick;
    }
  } catch {
    // Keep query-string token for RFC 8058 clients that POST an empty body.
  }

  if (!token) {
    return NextResponse.redirect(
      new URL("/uitschrijven?status=ongeldig", request.url),
      303,
    );
  }

  try {
    const client = getClient();
    await client.mutation(api.subscribers.confirmUnsubscribe, {
      token,
      source: oneClick ? "one_click_unsubscribe" : "email_unsubscribe",
    });
    if (oneClick) {
      return new NextResponse(null, { status: 200 });
    }
    return NextResponse.redirect(
      new URL("/uitschrijven?status=bevestigd", request.url),
      303,
    );
  } catch {
    return NextResponse.redirect(
      new URL("/uitschrijven?status=fout", request.url),
      303,
    );
  }
}
