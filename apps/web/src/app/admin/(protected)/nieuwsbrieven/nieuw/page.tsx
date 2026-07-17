"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

export default function NieuwCampagnePage() {
  const router = useRouter();
  const createCampaign = useMutation(api.newsletterCampaigns.createCampaign);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    createCampaign({})
      .then((id) => {
        router.replace(`/admin/nieuwsbrieven/${id}`);
      })
      .catch(() => {
        router.replace("/admin/nieuwsbrieven");
      });
  }, [createCampaign, router]);

  return (
    <div className="admin-page-heading">
      <p className="admin-notice">Nieuw concept aanmaken…</p>
    </div>
  );
}
