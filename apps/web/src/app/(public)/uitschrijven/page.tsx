import type { Metadata } from "next";
import Link from "next/link";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { UnsubscribeAnalytics } from "@/components/unsubscribe-analytics";
import { isPlausibleEmailLinkToken } from "@/lib/email-link-token";

export const metadata: Metadata = {
  title: "Nieuwsbrief uitschrijven",
  description:
    "Schrijf je uit van de wekelijkse nieuwsbrief. Je toegang tot artikels blijft behouden.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ token?: string; status?: string }>;
};

type TokenPreview = {
  valid: boolean;
  maskedEmail?: string;
};

function getConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Uitschrijven is nog niet geconfigureerd.");
  }
  return new ConvexHttpClient(convexUrl);
}

async function resolveTokenPreview(token: string): Promise<TokenPreview> {
  if (!isPlausibleEmailLinkToken(token)) {
    return { valid: false };
  }
  try {
    return await getConvexClient().query(api.emailLinks.resolveUnsubscribeToken, {
      token,
      now: Date.now(),
    });
  } catch {
    return { valid: false };
  }
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = params.status;
  const token = params.token ?? "";
  const preview = token ? await resolveTokenPreview(token) : { valid: false };

  if (status === "bevestigd") {
    return (
      <main className="shell legal-page">
        <UnsubscribeAnalytics status={status} />
        <h1>Je bent uitgeschreven van de nieuwsbrief</h1>
        <p>
          Je ontvangt geen wekelijkse nieuwsbrief meer. Dit verandert niets aan
          je toegang tot artikels op de website — die blijft gewoon bestaan.
        </p>
        <p>
          Wil je later opnieuw de nieuwsbrief? Open de voorkeurenlink in een
          eerdere mail of vraag een veilige link via{" "}
          <Link href="/voorkeuren">voorkeuren</Link>.
        </p>
        <p>
          <Link href="/">Terug naar de homepage</Link>
        </p>
      </main>
    );
  }

  if (status === "ongeldig" || (token && !preview.valid)) {
    return (
      <main className="shell legal-page">
        <h1>Nieuwsbrief-link niet geldig</h1>
        <p>
          Deze uitschrijflink voor de nieuwsbrief is verlopen of ongeldig. Open
          de nieuwste nieuwsbrief of pas je voorkeuren aan via je mailboxlink.
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
        <p>
          We konden je nieuwsbriefuitschrijving niet bevestigen. Probeer het
          later opnieuw of mail{" "}
          <Link href="/privacy">onze privacycontactpagina</Link>.
        </p>
      </main>
    );
  }

  if (!preview.valid) {
    return (
      <main className="shell legal-page">
        <h1>Nieuwsbrief uitschrijven</h1>
        <p>
          Deze pagina is alleen bedoeld om je van de <strong>wekelijkse
          nieuwsbrief</strong> uit te schrijven via de link in die mail. Er is
          geen uitschrijving voor website-toegang: artikels blijven leesbaar
          zolang je lezerssessie of toegang actief is.
        </p>
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
        <strong>{preview.maskedEmail}</strong>.
      </p>
      <p>
        <strong>Let op:</strong> dit stopt alleen de nieuwsbrief. Je toegang tot
        artikels op de site blijft behouden.
      </p>
      <form action="/api/email/uitschrijven" method="post">
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="signup-form__primary">
          Ja, schrijf me uit van de nieuwsbrief
        </button>
      </form>
      <p>
        <Link href="/">Nee, terug naar de site</Link>
      </p>
    </main>
  );
}
