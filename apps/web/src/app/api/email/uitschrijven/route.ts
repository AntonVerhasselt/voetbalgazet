import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { verifyUnsubscribeToken } from "@/lib/email-link-token";

export const runtime = "nodejs";

function getClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Uitschrijven is nog niet geconfigureerd.");
  }
  return new ConvexHttpClient(convexUrl);
}

async function confirm(
  token: string,
  source: "email_unsubscribe" | "one_click_unsubscribe",
) {
  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return { ok: false as const, status: 400 as const };
  }
  const client = getClient();
  await client.mutation(api.subscribers.confirmUnsubscribe, {
    email: payload.email,
    source,
  });
  return { ok: true as const };
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let token = "";
  let oneClick = false;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    token = String(form.get("token") ?? form.get("List-Unsubscribe") ?? "");
    oneClick =
      String(form.get("List-Unsubscribe") ?? "").toLowerCase() ===
        "one-click" || form.has("List-Unsubscribe");
    // RFC 8058 sends List-Unsubscribe=One-Click; token stays in query.
    if (!token || token.toLowerCase() === "one-click") {
      token = new URL(request.url).searchParams.get("token") ?? "";
    }
  } else if (contentType.includes("application/json")) {
    const body = (await request.json()) as { token?: string };
    token = body.token ?? "";
  } else {
    token = new URL(request.url).searchParams.get("token") ?? "";
    const form = await request.formData().catch(() => null);
    if (form) {
      token = token || String(form.get("token") ?? "");
      oneClick =
        String(form.get("List-Unsubscribe") ?? "").toLowerCase() ===
        "one-click";
    }
  }

  if (!token) {
    return NextResponse.json({ error: "Ongeldige link." }, { status: 400 });
  }

  try {
    const result = await confirm(
      token,
      oneClick ? "one_click_unsubscribe" : "email_unsubscribe",
    );
    if (!result.ok) {
      return NextResponse.redirect(
        new URL("/uitschrijven?status=ongeldig", request.url),
        303,
      );
    }
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
