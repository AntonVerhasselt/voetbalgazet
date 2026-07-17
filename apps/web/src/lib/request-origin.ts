/**
 * Resolve the public origin for redirects behind reverse proxies / tunnels.
 * Next may see `http(s)://localhost:3000` while clients use SITE_URL or
 * `x-forwarded-host`.
 */
export function getPublicRequestOrigin(request: Request): string {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const siteUrl = process.env.SITE_URL?.trim().replace(/\/$/u, "");

  if (forwardedHost && !isLocalHost(forwardedHost)) {
    const proto =
      forwardedProto ||
      (siteUrl?.startsWith("https://") ? "https" : requestUrl.protocol.replace(/:$/u, ""));
    return `${proto}://${forwardedHost}`;
  }

  if (isLocalHost(requestUrl.host) && siteUrl) {
    return siteUrl;
  }

  return requestUrl.origin;
}

function isLocalHost(host: string): boolean {
  const hostname = host.replace(/:\d+$/u, "").toLowerCase();
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}
