const foundations = [
  {
    title: "Authenticatie",
    status: "Actief",
    description: "Better Auth via de same-origin route en Convex.",
  },
  {
    title: "Artikels",
    status: "Fase 3",
    description: "Keystatic en de publicatieflow worden later aangesloten.",
  },
  {
    title: "Nieuwsbrieven",
    status: "Fase 4",
    description: "Editor, doelgroepen en verzending zijn nog niet actief.",
  },
] as const;

export default function AdminOverviewPage() {
  return (
    <>
      <header className="admin-page-heading">
        <p className="eyebrow">Overzicht</p>
        <h1>Redactieomgeving</h1>
        <p>
          De beveiligde fundering staat klaar. Onderdelen worden per fase
          toegevoegd zonder publieke toegang tot redactiedata.
        </p>
      </header>
      <section className="admin-status-grid" aria-label="Projectstatus">
        {foundations.map((foundation) => (
          <article className="admin-status-card" key={foundation.title}>
            <span>{foundation.status}</span>
            <h2>{foundation.title}</h2>
            <p>{foundation.description}</p>
          </article>
        ))}
      </section>
    </>
  );
}
