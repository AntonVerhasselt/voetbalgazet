import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../apps/web/src/proxy";
import {
  PREVIEW_COOKIE,
  createPreviewToken,
} from "../apps/web/src/lib/preview-session";

function request(
  path: string,
  init?: {
    cookie?: string;
  },
): NextRequest {
  const headers = new Headers();
  if (init?.cookie) {
    headers.set("cookie", init.cookie);
  }
  return new NextRequest(new URL(path, "https://devoetbalgazet.be"), {
    headers,
  });
}

describe("proxy admin/preview gates", () => {
  it("allows public admin auth entry routes without a session cookie", async () => {
    for (const path of [
      "/admin/inloggen",
      "/admin/claim",
      "/admin/agent-inloggen",
    ]) {
      const response = proxy(request(path));
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("redirects protected admin and keystatic routes to login", () => {
    const admin = proxy(request("/admin/nieuwsbrieven"));
    expect(admin.status).toBe(307);
    expect(admin.headers.get("location")).toContain("/admin/inloggen");
    expect(admin.headers.get("location")).toContain(
      "terug=%2Fadmin%2Fnieuwsbrieven",
    );

    const keystatic = proxy(request("/keystatic"));
    expect(keystatic.status).toBe(307);
    expect(keystatic.headers.get("location")).toContain("/admin/inloggen");
  });

  it("lets authenticated cookie holders through to admin", () => {
    // better-auth session cookie name defaults to better-auth.session_token
    const response = proxy(
      request("/admin", {
        cookie: "better-auth.session_token=test-session",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("rejects preview article routes without a valid signed cookie", () => {
    const missing = proxy(request("/preview/nieuws/derby-reportage"));
    expect(missing.status).toBe(403);

    const invalid = proxy(
      request("/preview/nieuws/derby-reportage", {
        cookie: `${PREVIEW_COOKIE}=not-a-valid-token`,
      }),
    );
    expect(invalid.status).toBe(403);
  });

  it("allows preview article routes with a valid signed cookie", () => {
    const token = createPreviewToken("content/feature", "/nieuws/derby-reportage");
    const response = proxy(
      request("/preview/nieuws/derby-reportage", {
        cookie: `${PREVIEW_COOKIE}=${token}`,
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
