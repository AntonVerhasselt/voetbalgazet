import { cookies, draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { getEditorSession } from "@/lib/admin-session";
import {
  createPreviewToken,
  isAllowedPreviewBranch,
  isAllowedPreviewTarget,
  isSameOriginRequest,
  PREVIEW_COOKIE,
} from "@/lib/preview-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getEditorSession();
  if (!session) {
    return new Response("Alleen redacteurs kunnen een preview openen.", {
      status: 403,
    });
  }
  if (!isSameOriginRequest(request)) {
    return new Response("Ongeldige preview-origin.", { status: 403 });
  }

  const url = new URL(request.url);
  const branch = url.searchParams.get("branch") ?? "";
  const target = url.searchParams.get("to") ?? "";
  if (!isAllowedPreviewBranch(branch) || !isAllowedPreviewTarget(target)) {
    return new Response("Ongeldige previewbestemming.", { status: 400 });
  }

  const token = createPreviewToken(branch, target);
  const draft = await draftMode();
  draft.enable();
  const cookieStore = await cookies();
  cookieStore.set(PREVIEW_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60,
    path: "/",
  });

  const publicTarget = new URL(target, url.origin);
  const previewTarget = new URL(
    `/preview${publicTarget.pathname}${publicTarget.search}`,
    url.origin,
  );
  const response = NextResponse.redirect(previewTarget);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
