import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import KeystaticApp from "./keystatic";

export const metadata: Metadata = {
  title: "Artikels beheren",
  robots: { index: false, follow: false },
};

export default async function KeystaticLayout() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/inloggen?terug=/keystatic");
  }
  if (session.role === "viewer") {
    redirect("/admin?fout=onvoldoende-rechten");
  }
  return <KeystaticApp />;
}
