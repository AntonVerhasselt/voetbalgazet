# Neon schema — placeholder

> Vervang dit document in Phase B na schema-introspectie (read-only).

## Doel

De research-agent gebruikt Neon als bron van waarheid voor provinciale
voetbaldata. Dit bestand moet later bevatten:

- Overzicht van kern-tabellen (competities, reeksen, clubs, teams, personen,
  wedstrijden, events/stats)
- Hoe reeksen mappen op Pipeline `divisionKey`
- Voorbeeld-SELECTS per veelvoorkomende researchvraag
- Belangrijke constraints (seizoen, jeugd, thuis/uit)

## Connectie

In de sandbox:

```ts
import { query } from "../lib/db.ts";

const result = await query("select 1 as ok");
console.log(result.rows);
```

Env: `DATABASE_URL` / `NEON_DATABASE_URL` (read-only connection string).

## Regels voor de agent

1. Alleen `SELECT`
2. Geen verzonnen ids of statistieken
3. Filter op de gevraagde reeks
4. Citeer concrete rijen/cijfers in `supportingFacts[].evidence`
