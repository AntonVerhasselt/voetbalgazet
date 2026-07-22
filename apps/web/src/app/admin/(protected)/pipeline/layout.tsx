import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { PipelineShell } from "./_components/pipeline-shell";

export default async function PipelineLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/inloggen");
  }

  const canEdit = session.role !== "viewer";

  return (
    <Suspense
      fallback={
        <div className="pipeline-body">
          <p className="pipeline-list__empty">Laden…</p>
        </div>
      }
    >
      <PipelineShell canEdit={canEdit}>{children}</PipelineShell>
    </Suspense>
  );
}
