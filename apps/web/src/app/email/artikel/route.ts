import { NextResponse } from "next/server";

const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");
  const slug = requestUrl.searchParams.get("slug");

  if (!token || !slug || !SAFE_SLUG.test(slug)) {
    return NextResponse.redirect(
      new URL("/?auth_fout=ongeldige-link", requestUrl.origin),
      303,
    );
  }

  const verifyUrl = new URL("/api/auth/magic-link/verify", requestUrl.origin);
  verifyUrl.searchParams.set("token", token);
  verifyUrl.searchParams.set("callbackURL", `/nieuws/${slug}`);
  verifyUrl.searchParams.set("errorCallbackURL", `/nieuws/${slug}?auth_fout=1`);
  return NextResponse.redirect(verifyUrl, 303);
}
