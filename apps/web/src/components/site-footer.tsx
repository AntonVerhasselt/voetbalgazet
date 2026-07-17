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
          <Link href="/archief">Archief</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/voorwaarden">Voorwaarden</Link>
          <a href="mailto:redactie@devoetbalgazet.be">Contact</a>
        </nav>
        <p className="site-footer__legal">
          © 2026 De Voetbalgazet · YARU DAKEN BV · Van Duyststraat 60, 2100
          Antwerpen · KBO 1017.634.522 · btw BE 1017.634.522
        </p>
      </div>
    </footer>
  );
}
