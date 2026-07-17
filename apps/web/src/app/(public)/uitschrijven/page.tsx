import type { Metadata } from "next";
import Link from "next/link";
import { verifyUnsubscribeToken } from "@/lib/email-link-token";

export const metadata: Metadata = {
  title: "Uitschrijven",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ token?: string; status?: string }>;
};

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = params.status;
  const token = params.token ?? "";
  const payload = token ? verifyUnsubscribeToken(token) : null;

  if (status === "bevestigd") {
    return (
      <main className="shell legal-page">
        <h1>Je bent uitgeschreven</h1>
        <p>
          Je ontvangt geen wekelijkse nieuwsbrief meer. Je toegang tot artikels
          op de site blijft behouden.
        </p>
        <p>
          <Link href="/voorkeuren">Voorkeuren beheren</Link>
          {" · "}
          <Link href="/">Terug naar de homepage</Link>
        </p>
      </main>
    );
  }

  if (status === "ongeldig" || (token && !payload)) {
    return (
      <main className="shell legal-page">
        <h1>Link niet geldig</h1>
        <p>
          Deze uitschrijflink is verlopen of ongeldig. Open de nieuwste
          nieuwsbrief of pas je voorkeuren aan via je mailboxlink.
        </p>
        <p>
          <Link href="/">Terug naar de homepage</Link>
        </p>
      </main>
    );
  }

  if (status === "fout") {
    return (
      <main className="shell legal-page">
        <h1>Even iets misgelopen</h1>
        <p>Probeer het later opnieuw of mail ons via de privacycontactpagina.</p>
        <p>
          <Link href="/privacy">Privacy</Link>
        </p>
      </main>
    );
  }

  if (!payload) {
    return (
      <main className="shell legal-page">
        <h1>Nieuwsbrief uitschrijven</h1>
        <p>
          Open de uitschrijflink in je nieuwsbrief. We schrijven je pas uit
          nadat je hier bevestigt, zodat mailboxscanners je niet per ongeluk
          uitschrijven.
        </p>
      </main>
    );
  }

  return (
    <main className="shell legal-page">
      <h1>Nieuwsbrief uitschrijven?</h1>
      <p>
        Bevestig dat je geen wekelijkse nieuwsbrief meer wilt ontvangen op{" "}
        <strong>{payload.email}</strong>. Je artikels-toegang blijft bestaan.
      </p>
      <form action="/api/email/uitschrijven" method="post">
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="signup-form__primary">
          Ja, schrijf me uit
        </button>
      </form>
      <p>
        <Link href="/">Nee, terug naar de site</Link>
      </p>
    </main>
  );
}
