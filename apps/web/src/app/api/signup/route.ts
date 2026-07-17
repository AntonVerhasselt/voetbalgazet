import { NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import {
  checkSignupIpRateLimit,
  clientIpFromRequest,
  getConvexHttpClient,
  hashClientIp,
} from "@/lib/signup-ip-rate-limit";

export const runtime = "nodejs";

type SignupAction =
  | {
      action: "begin";
      email: string;
      website?: string;
    }
  | {
      action: "complete";
      source: "article_gate" | "homepage_inline";
      email: string;
      website?: string;
      divisionKeys: string[];
      teamKey?: string;
    }
  | {
      action: "returning";
      email: string;
      website?: string;
    };

function isSignupAction(value: unknown): value is SignupAction {
  if (!value || typeof value !== "object") {
    return false;
  }
  const body = value as Record<string, unknown>;
  if (body.action === "begin" || body.action === "returning") {
    return typeof body.email === "string";
  }
  if (body.action === "complete") {
    return (
      typeof body.email === "string" &&
      (body.source === "article_gate" || body.source === "homepage_inline") &&
      Array.isArray(body.divisionKeys) &&
      body.divisionKeys.every((key) => typeof key === "string")
    );
  }
  return false;
}

export async function POST(request: Request) {
  const ipHash = hashClientIp(clientIpFromRequest(request));
  if (!checkSignupIpRateLimit(ipHash)) {
    return NextResponse.json(
      {
        error:
          "Te veel inschrijfpogingen vanaf dit netwerk. Wacht even en probeer later opnieuw.",
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }
  if (!isSignupAction(body)) {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  try {
    const client = getConvexHttpClient();
    if (body.action === "begin") {
      const result = await client.mutation(api.subscribers.beginSignup, {
        email: body.email,
        website: body.website,
        clientIpHash: ipHash,
      });
      return NextResponse.json(result);
    }
    if (body.action === "returning") {
      const result = await client.mutation(
        api.subscribers.requestReturningAccess,
        {
          email: body.email,
          website: body.website,
          clientIpHash: ipHash,
        },
      );
      return NextResponse.json(result);
    }

    const mutation =
      body.source === "article_gate"
        ? api.subscribers.completeArticleSignup
        : api.subscribers.completeHomepageSignup;
    const result = await client.mutation(mutation, {
      email: body.email,
      website: body.website,
      divisionKeys: body.divisionKeys,
      teamKey: body.teamKey,
      clientIpHash: ipHash,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Dat lukte niet. Probeer later opnieuw.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
