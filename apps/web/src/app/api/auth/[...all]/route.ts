import { getAuthProxyTarget, handler } from "@/lib/auth-server";

async function withProxyDiagnostics(
  responsePromise: Promise<Response>,
): Promise<Response> {
  const response = await responsePromise;
  const proxyTarget = getAuthProxyTarget();

  if (response.status !== 404 || !proxyTarget) {
    return response;
  }

  // Convex usher returns an empty 404 when the proxy host has no auth HTTP
  // routes (wrong/regional .convex.site or a placeholder host).
  const body = await response.clone().arrayBuffer();
  if (body.byteLength > 0) {
    return response;
  }

  return Response.json(
    {
      error: "Auth proxy target returned 404",
      proxyTarget,
      hint:
        "Set NEXT_PUBLIC_CONVEX_SITE_URL to the Convex HTTP Actions URL from the dashboard. " +
        "For production this project expects https://calculating-eel-615.convex.site " +
        "(not an *.eu-west-1.convex.site host).",
    },
    {
      status: 502,
      headers: {
        "x-auth-proxy-target": proxyTarget,
      },
    },
  );
}

export function GET(request: Request) {
  return withProxyDiagnostics(handler.GET(request));
}

export function POST(request: Request) {
  return withProxyDiagnostics(handler.POST(request));
}
