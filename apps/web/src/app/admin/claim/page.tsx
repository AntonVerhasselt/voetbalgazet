import { redirect } from "next/navigation";
import { api } from "@convex/_generated/api";
import {
  fetchAuthMutation,
  isAuthBackendConfigured,
} from "@/lib/auth-server";

export default async function ClaimAdminMembershipPage() {
  if (!isAuthBackendConfigured()) {
    redirect("/admin/inloggen?fout=configuratie");
  }

  try {
    await fetchAuthMutation(api.admin.claimConfiguredMembership, {});
  } catch {
    redirect("/admin/inloggen?fout=koppeling");
  }

  redirect("/admin");
}
