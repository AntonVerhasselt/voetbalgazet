import {
  extractBearerToken,
  localDev,
  placeholderAuth,
  vercelOidc,
  withAuthChallenges,
  type AuthFn,
} from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import { timingSafeEqual } from "node:crypto";

function tokensEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

/**
 * Accepts `Authorization: Bearer <EVE_INVOKE_TOKEN>` for Convex / Next waiter
 * calls (Phase D). Skips when the env var is unset so local OIDC / loopback
 * auth still works.
 */
function invokeTokenAuth(): AuthFn<Request> {
  return withAuthChallenges((request: Request) => {
    const expected = process.env.EVE_INVOKE_TOKEN?.trim();
    if (!expected) {
      return null;
    }

    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token || !tokensEqual(token, expected)) {
      return null;
    }

    return {
      attributes: { invoker: "orchestrator" },
      authenticator: "eve-invoke-token",
      principalId: "pipeline-orchestrator",
      principalType: "service" as const,
    };
  }, [{ scheme: "Bearer" }]);
}

export default eveChannel({
  auth: [
    // Vercel deployments and the eve TUI via OIDC.
    vercelOidc(),
    // Loopback `eve dev` / REPL.
    localDev(),
    // Shared secret for pipeline waiter (set EVE_INVOKE_TOKEN).
    invokeTokenAuth(),
    // Fail closed in production if nothing above matched.
    placeholderAuth(),
  ],
});
