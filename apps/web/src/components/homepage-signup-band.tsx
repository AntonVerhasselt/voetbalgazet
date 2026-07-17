"use client";

import Link from "next/link";
import { SignupForm } from "@/components/signup-form";
import { authClient } from "@/lib/auth-client";
import { hasReaderAccess } from "@/lib/reader-access";

export function HomepageSignupBand() {
  const { data: session } = authClient.useSession();
  const subscribed = hasReaderAccess(session?.user);

  return (
    <section
      className="signup-band"
      id="inschrijven"
      aria-labelledby="signup-heading"
    >
      <div className="shell signup-band__inner">
        <div>
          <p className="eyebrow">Blijf langs de lijn</p>
          <h2 id="signup-heading">
            {subscribed
              ? "Je bent geabonneerd"
              : "Verhalen uit jouw reeks, in je mailbox."}
          </h2>
          <p>
            {subscribed
              ? "Je lezerssessie is actief. Spring meteen naar het archief of kies een nieuw verhaal op de voorpagina."
              : "Kies minstens één reeks en optioneel je favoriete club. Je krijgt meteen toegang tot alle verhalen en onze wekelijkse nieuwsbrief."}
          </p>
        </div>
        {subscribed ? (
          <Link className="signup-band__continue" href="/archief">
            Verder lezen <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <SignupForm source="homepage_inline" />
        )}
      </div>
    </section>
  );
}
