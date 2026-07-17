import { makeRouteHandler } from "@keystatic/next/route-handler";
import keystaticConfig, {
  resolveKeystaticStorageKind,
} from "../../../../../keystatic.config";
import { getEditorSession } from "@/lib/admin-session";

export const runtime = "nodejs";

const storageKind = resolveKeystaticStorageKind();
const { GET: keystaticGet, POST: keystaticPost } = makeRouteHandler({
  config: keystaticConfig,
});

async function withLocalEditorGuard(
  request: Request,
  handler: (request: Request) => Promise<Response>,
): Promise<Response> {
  // GitHub mode relies on Keystatic's own OAuth + repository permissions.
  // Local mode exposes filesystem write endpoints and must require a
  // Better Auth redaction session.
  if (storageKind === "local") {
    if (process.env.NODE_ENV === "production") {
      return new Response(
        "Keystatic GitHub mode is verplicht in productie.",
        { status: 503 },
      );
    }
    const session = await getEditorSession();
    if (!session) {
      return new Response("Niet geautoriseerd voor lokale Keystatic API.", {
        status: 401,
      });
    }
  }
  return handler(request);
}

export function GET(request: Request) {
  return withLocalEditorGuard(request, keystaticGet);
}

export function POST(request: Request) {
  return withLocalEditorGuard(request, keystaticPost);
}
