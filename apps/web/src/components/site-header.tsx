import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header__utility">
        <span>Editie Vlaanderen</span>
        <span>Onafhankelijk lokaal voetbal</span>
      </div>
      <div className="shell site-header__brand">
        <Link className="wordmark" href="/" aria-label="De Voetbalgazet, home">
          De Voetbalgazet
        </Link>
        <p>Lokaal voetbal, echte verhalen.</p>
      </div>
      <nav className="site-nav" aria-label="Hoofdnavigatie">
        <div className="shell site-nav__inner">
          <Link href="/">Voorpagina</Link>
          <Link href="/archief">Archief</Link>
          <Link className="site-nav__subscribe" href="/#inschrijven">
            Abonneren
          </Link>
        </div>
      </nav>
    </header>
  );
}
