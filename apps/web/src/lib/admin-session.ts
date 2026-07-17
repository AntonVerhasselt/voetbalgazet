import { api } from "@convex/_generated/api";
import {
  fetchAuthQuery,
  isAuthBackendConfigured,
} from "@/lib/auth-server";

export type AdminSession = {
  email: string;
  role: "admin" | "journalist" | "viewer";
};

export async function getAdminSession(): Promise<AdminSession | null> {
  if (!isAuthBackendConfigured()) {
    return null;
  }
  try {
    return await fetchAuthQuery(api.admin.getSession, {});
  } catch {
    return null;
  }
}

export async function getEditorSession(): Promise<AdminSession | null> {
  const session = await getAdminSession();
  return session && session.role !== "viewer" ? session : null;
}
