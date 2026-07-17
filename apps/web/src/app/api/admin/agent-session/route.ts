import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import {
  AGENT_EMAIL,
  checkAgentAccessRateLimit,
  deriveAgentPassword,
  getAgentAccessSecret,
  hashIpAddress,
  isAgentAccessEnabled,
  recordAgentAccessFailure,
  recordAgentAccessSuccess,
  verifyAgentAccessSecret,
} from "@/lib/agent-access";
import {
  getAuthProxyTarget,
  isAuthBackendConfigured,
} from "@/lib/auth-server";
import {
  GENERATED_CONVEX_URL,
} from "@/lib/convex-public-env.generated";

export const runtime = "nodejs";

type AgentSessionBody = {
  secret?: unknown;
};

type AgentAccessEventResult = "success" | "failure" | "disabled";

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

function resolveConvexUrl(): string | null {
  const convexUrl =
    GENERATED_CONVEX_URL || trimEnv(process.env.NEXT_PUBLIC_CONVEX_URL);
  return convexUrl || null;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function readBearerSecret(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/iu.exec(header.trim());
  return match?.[1]?.trim() || null;
}

async function parseSecret(request: Request): Promise<string | null> {
  const bearer = readBearerSecret(request);
  let bodySecret: string | null = null;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as AgentSessionBody;
      if (typeof body.secret === "string") {
        bodySecret = body.secret;
      }
    } catch {
      return null;
    }
  }

  if (bearer && bodySecret && bearer !== bodySecret) {
    return null;
  }
  return bodySecret ?? bearer;
}

function appendSetCookies(from: Headers, to: Headers): void {
  const getSetCookie = from.getSetCookie?.bind(from);
  if (getSetCookie) {
    for (const cookie of getSetCookie()) {
      to.append("set-cookie", cookie);
    }
    return;
  }
  const single = from.get("set-cookie");
  if (single) {
    to.append("set-cookie", single);
  }
}

function buildForwardHeaders(request: Request, siteUrl: string): Headers {
  const requestUrl = new URL(request.url);
  const headers = new Headers({
    "content-type": "application/json",
    accept: "application/json",
    origin: siteUrl,
  });
  headers.set("host", new URL(siteUrl).host);
  headers.set("x-forwarded-host", requestUrl.host);
  headers.set("x-forwarded-proto", requestUrl.protocol.replace(/:$/u, ""));
  headers.set("x-better-auth-forwarded-host", requestUrl.host);
  headers.set(
    "x-better-auth-forwarded-proto",
    requestUrl.protocol.replace(/:$/u, ""),
  );
  const userAgent = request.headers.get("user-agent");
  if (userAgent) {
    headers.set("user-agent", userAgent);
  }
  return headers;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function postAgentAccessBridge(
  convexSiteUrl: string,
  secret: string,
  path: "/agent-access/prepare" | "/agent-access/event",
  body: {
    result?: AgentAccessEventResult;
    ipHash?: string;
    userAgent?: string;
  },
): Promise<unknown> {
  const response = await fetch(`${convexSiteUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Agent access bridge failed with HTTP ${response.status}`);
  }
  return (await response.json()) as unknown;
}

async function prepareAgentSessionViaBridge(
  convexSiteUrl: string,
  secret: string,
  args: { ipHash: string; userAgent?: string },
): Promise<string> {
  const data = await postAgentAccessBridge(
    convexSiteUrl,
    secret,
    "/agent-access/prepare",
    args,
  );
  if (!isJsonObject(data) || typeof data.email !== "string") {
    throw new Error("Agent access bridge returned an invalid prepare payload.");
  }
  return data.email;
}

async function recordAgentAccessEventViaBridge(
  convexSiteUrl: string,
  secret: string,
  args: {
    result: AgentAccessEventResult;
    ipHash: string;
    userAgent?: string;
  },
): Promise<void> {
  await postAgentAccessBridge(convexSiteUrl, secret, "/agent-access/event", args);
}

export async function POST(request: Request): Promise<Response> {
  if (!isAgentAccessEnabled()) {
    return new Response(null, { status: 404 });
  }

  if (!isAuthBackendConfigured()) {
    return Response.json(
      { ok: false, error: "Auth backend is niet geconfigureerd." },
      { status: 500 },
    );
  }

  const convexUrl = resolveConvexUrl();
  const convexSiteUrl = getAuthProxyTarget();
  if (!convexUrl || !convexSiteUrl) {
    return Response.json(
      { ok: false, error: "Auth backend is niet geconfigureerd." },
      { status: 500 },
    );
  }

  const ip = clientIp(request);
  const ipHash = await hashIpAddress(ip);
  const userAgent = request.headers.get("user-agent") ?? undefined;
  const rate = checkAgentAccessRateLimit(ipHash);
  if (!rate.allowed) {
    return Response.json({ ok: false }, { status: 429 });
  }

  const secret = await parseSecret(request);
  const configuredSecret = getAgentAccessSecret();
  if (!configuredSecret) {
    return new Response(null, { status: 404 });
  }
  if (!secret || !verifyAgentAccessSecret(secret)) {
    recordAgentAccessFailure(ipHash);
    try {
      await recordAgentAccessEventViaBridge(convexSiteUrl, configuredSecret, {
        result: "failure",
        ipHash,
        userAgent,
      });
    } catch (error) {
      console.error("Failed to record agent access failure", error);
    }
    return Response.json({ ok: false }, { status: 401 });
  }

  const siteUrl =
    trimEnv(process.env.SITE_URL) || new URL(request.url).origin;
  const password = await deriveAgentPassword(configuredSecret);

  try {
    await prepareAgentSessionViaBridge(convexSiteUrl, configuredSecret, {
      ipHash,
      userAgent,
    });
  } catch (error) {
    console.error("Agent session prepare failed", error);
    recordAgentAccessFailure(ipHash);
    return Response.json({ ok: false }, { status: 500 });
  }

  const forwardHeaders = buildForwardHeaders(request, siteUrl);
  let signInResponse: Response;
  try {
    signInResponse = await fetch(`${convexSiteUrl}/api/auth/sign-in/email`, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify({
        email: AGENT_EMAIL,
        password,
      }),
      redirect: "manual",
    });
  } catch (error) {
    console.error("Agent sign-in request failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }

  if (!signInResponse.ok) {
    console.error(
      "Agent sign-in failed",
      signInResponse.status,
      await signInResponse.text().catch(() => ""),
    );
    return Response.json({ ok: false }, { status: 500 });
  }

  const responseHeaders = new Headers({
    "content-type": "application/json",
  });
  appendSetCookies(signInResponse.headers, responseHeaders);

  const cookieHeader = (signInResponse.headers.getSetCookie?.() ?? [])
    .map((entry) => entry.split(";")[0])
    .filter(Boolean)
    .join("; ");

  const tokenHeaders = buildForwardHeaders(request, siteUrl);
  if (cookieHeader) {
    tokenHeaders.set("cookie", cookieHeader);
  }

  let token: string | undefined;
  try {
    const tokenResponse = await fetch(
      `${convexSiteUrl}/api/auth/convex/token`,
      {
        method: "GET",
        headers: tokenHeaders,
        redirect: "manual",
      },
    );
    if (tokenResponse.ok) {
      const tokenJson = (await tokenResponse.json()) as { token?: string };
      token = tokenJson.token;
    }
  } catch (error) {
    console.error("Agent token fetch failed", error);
  }

  if (!token) {
    console.error("Agent session missing Convex JWT");
    return Response.json({ ok: false }, { status: 500 });
  }

  try {
    const authedClient = new ConvexHttpClient(convexUrl);
    authedClient.setAuth(token);
    await authedClient.mutation(api.agentAccess.ensureAgentMembership, {});
    await recordAgentAccessEventViaBridge(convexSiteUrl, configuredSecret, {
      result: "success",
      ipHash,
      userAgent,
    });
  } catch (error) {
    console.error("Agent membership ensure failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }

  recordAgentAccessSuccess(ipHash);

  return new Response(
    JSON.stringify({
      ok: true,
      email: AGENT_EMAIL,
      role: "admin",
    }),
    { status: 200, headers: responseHeaders },
  );
}
