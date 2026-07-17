import { describe, expect, it } from "vitest";
import { getPublicRequestOrigin } from "../apps/web/src/lib/request-origin";

describe("getPublicRequestOrigin", () => {
  it("prefers non-local x-forwarded-host over localhost request URL", () => {
    const request = new Request("https://localhost:3000/email/voorkeuren", {
      headers: {
        "x-forwarded-host":
          "turning-guidelines-postcards-banana.trycloudflare.com",
        "x-forwarded-proto": "https",
      },
    });
    expect(getPublicRequestOrigin(request)).toBe(
      "https://turning-guidelines-postcards-banana.trycloudflare.com",
    );
  });

  it("falls back to SITE_URL when the request host is local", () => {
    const previous = process.env.SITE_URL;
    process.env.SITE_URL = "https://example.test";
    try {
      const request = new Request("http://127.0.0.1:3000/email/artikel");
      expect(getPublicRequestOrigin(request)).toBe("https://example.test");
    } finally {
      if (previous === undefined) {
        delete process.env.SITE_URL;
      } else {
        process.env.SITE_URL = previous;
      }
    }
  });

  it("keeps the request origin for public hosts", () => {
    const request = new Request("https://devoetbalgazet.be/uitschrijven");
    expect(getPublicRequestOrigin(request)).toBe("https://devoetbalgazet.be");
  });
});
