import { cookies, draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { getEditorSession } from "@/lib/admin-session";
import {
  isSameOriginRequest,
  PREVIEW_COOKIE,
} from "@/lib/preview-session";

export async function POST(request: Request) {
  const session = await getEditorSession();
  if (!session || !isSameOriginRequest(request)) {
    return new Response("Ongeldige aanvraag.", { status: 403 });
  }
  const draft = await draftMode();
  draft.disable();
  const cookieStore = await cookies();
  cookieStore.delete(PREVIEW_COOKIE);
  return NextResponse.redirect(new URL("/admin/artikels", request.url), 303);
}
