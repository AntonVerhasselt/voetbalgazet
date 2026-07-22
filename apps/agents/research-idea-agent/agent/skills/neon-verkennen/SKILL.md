---
description: Gebruik wanneer je Neon moet verkennen met TypeScript/SQL in de sandbox om feiten te vinden voor artikelideeën.
---

# Neon verkennen

1. Lees eerst `/workspace/docs/` (schema-overzicht). Als daar nog een placeholder staat: zeg dat expliciet in `researchSummary` en lever **geen** verzonnen Neon-ids of stats.
2. Gebruik `/workspace/lib/db.ts` — die leest `DATABASE_URL` of `NEON_DATABASE_URL`.
3. Schrijf scripts onder `/workspace/research/` en voer ze uit met:

```bash
npx tsx research/mijn-query.ts
```

4. Alleen `SELECT`. Limiteer resultaatrijen. Log de SQL of een fingerprint in `supportingFacts[].sqlFingerprint` wanneer nuttig.
5. Bewaar relevante tussenresultaten als JSON onder `/workspace/research/` zodat je later kunt citeren in `evidence`.
6. Filter altijd op de gevraagde reeks (`divisionKey` / Neon-equivalent) — geen ideeën uit andere reeksen tenzij de data dat dwingend maakt en je het benoemt.
