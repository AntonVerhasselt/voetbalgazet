import type { Metadata } from "next";
import { PreferencesForm } from "@/components/preferences-form";

export const metadata: Metadata = {
  title: "Nieuwsbriefvoorkeuren",
  description: "Kies de reeksen en club die je in je nieuwsbrief wilt volgen.",
  robots: { index: false, follow: false },
};

export default function PreferencesPage() {
  return (
    <main className="shell preferences-page">
      <header>
        <p className="eyebrow">Jouw lokale voetbal</p>
        <h1>Nieuwsbriefvoorkeuren</h1>
        <p>
          Deze keuzes bepalen alleen welke verhalen we in je nieuwsbrief
          uitlichten. De publieke site blijft voor iedereen hetzelfde.
        </p>
      </header>
      <PreferencesForm />
    </main>
  );
}
