import { NextResponse } from "next/server";

export function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(
      new URL("/voorkeuren?auth_fout=ongeldige-link", requestUrl.origin),
      303,
    );
  }

  const verifyUrl = new URL("/api/auth/magic-link/verify", requestUrl.origin);
  verifyUrl.searchParams.set("token", token);
  verifyUrl.searchParams.set("callbackURL", "/voorkeuren");
  verifyUrl.searchParams.set("errorCallbackURL", "/voorkeuren?auth_fout=1");
  return NextResponse.redirect(verifyUrl, 303);
}
