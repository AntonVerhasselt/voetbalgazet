import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";
import {
  readConfiguredAgentAccessSecret,
  secretsEqual,
} from "./lib/agentAccessShared";
import { resend } from "./resendClient";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

type AgentAccessResult = "success" | "failure" | "disabled";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function readBearerSecret(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/iu.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function agentAccessDeniedResponse(req: Request): Response | null {
  const configured = readConfiguredAgentAccessSecret(
    process.env.AGENT_ACCESS_SECRET,
  );
  if (!configured) {
    return new Response(null, { status: 404 });
  }
  const bearer = readBearerSecret(req);
  if (!bearer || !secretsEqual(bearer, configured)) {
    return jsonResponse({ ok: false }, 401);
  }
  return null;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJsonObject(req: Request): Promise<Record<string, unknown>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {};
  }
  const body = (await req.json()) as unknown;
  if (!isJsonObject(body)) {
    throw new Error("Invalid JSON body.");
  }
  return body;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseAgentAccessResult(value: unknown): AgentAccessResult {
  if (value === "success" || value === "failure" || value === "disabled") {
    return value;
  }
  throw new Error("Invalid agent access event result.");
}

http.route({
  path: "/agent-access/prepare",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const denied = agentAccessDeniedResponse(req);
    if (denied) {
      return denied;
    }
    let body: Record<string, unknown>;
    try {
      body = await readJsonObject(req);
    } catch {
      return jsonResponse({ ok: false }, 400);
    }
    const ipHash = optionalString(body.ipHash);
    if (!ipHash) {
      return jsonResponse({ ok: false }, 400);
    }
    try {
      await ctx.runMutation(internal.agentAccess.consumeAgentAccessRateLimit, {
        ipHash,
      });
    } catch {
      return jsonResponse({ ok: false }, 429);
    }
    const result = await ctx.runMutation(
      internal.agentAccess.prepareAgentSession,
      {
        ipHash,
        userAgent: optionalString(body.userAgent),
      },
    );
    return jsonResponse(result);
  }),
});

http.route({
  path: "/agent-access/event",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const denied = agentAccessDeniedResponse(req);
    if (denied) {
      return denied;
    }
    let body: Record<string, unknown>;
    try {
      body = await readJsonObject(req);
      const result = parseAgentAccessResult(body.result);
      const ipHash = optionalString(body.ipHash);
      if (result === "failure" && ipHash) {
        try {
          await ctx.runMutation(
            internal.agentAccess.consumeAgentAccessRateLimit,
            {
              ipHash,
            },
          );
        } catch {
          return jsonResponse({ ok: false }, 429);
        }
      }
      await ctx.runMutation(internal.agentAccess.recordAgentAccessEvent, {
        result,
        ipHash,
        userAgent: optionalString(body.userAgent),
      });
    } catch {
      return jsonResponse({ ok: false }, 400);
    }
    return jsonResponse({ ok: true });
  }),
});

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

export default http;
