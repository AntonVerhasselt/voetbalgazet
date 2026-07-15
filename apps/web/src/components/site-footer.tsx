import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <div>
          <p className="wordmark wordmark--footer">De Voetbalgazet</p>
          <p className="site-footer__tagline">
            Lokaal voetbal, echte verhalen.
          </p>
        </div>
        <nav aria-label="Voettekst">
          <Link href="/#inschrijven">Inschrijven</Link>
          <Link href="/nieuws/zondagen-langs-de-lijn">Laatste verhaal</Link>
        </nav>
        <p className="site-footer__legal">
          © 2026 De Voetbalgazet. Dit is een funderingsversie; privacy- en
          contactgegevens volgen vóór lancering.
        </p>
      </div>
    </footer>
  );
}
