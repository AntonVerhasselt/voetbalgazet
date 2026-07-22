# Article Archive Strategy — Tools (not static JSON dump)

## Why the previous recommendation was weak

Seeding `archive-index.json` into the sandbox and hoping the model greps it is brittle:

- Search quality depends on the model improvising filters.
- Index goes stale unless something regenerates it every deploy.
- Full article bodies are awkward to ship as sandbox files.
- It fights Eve’s strength: **typed tools** in the app runtime.

Your sitemap/`curl` idea is closer to a real journalist workflow, but as you noted: **you cannot meaningfully search before you fetch**. Sitemap only gives URLs.

## Options compared

| Approach | Search before read? | Freshness | Cost/latency | Fit |
|----------|---------------------|-----------|--------------|-----|
| **A. Static JSON in sandbox** | Weak (grep) | Stale unless rebuilt | Low | Rejected for primary path |
| **B. Sitemap + curl only** | No (URL/slug heuristics only) | Live site | High if many fetches; soft-gate may block | Fallback only |
| **C. Authored Eve tools over a searchable index** | **Yes** | As fresh as the index sync | Low for search; fetch body on demand | **Primary** |
| **D. Put articles in Neon** | Yes (SQL) | Requires sync pipeline into football DB | Medium | Later, optional |
| **E. Vector search** | Yes (semantic) | Needs embeddings pipeline | Higher | Later nice-to-have |

## Recommended architecture (MVP)

**Primary: typed Eve tools** backed by a **Convex article archive index**, plus an optional **body fetch** tool.

```text
Keystatic / Git Markdoc (source of published truth today)
        │  sync on publish / CI / admin action
        ▼
Convex table: articleArchive
        │  queried by Eve tools (app runtime)
        ▼
Eve tools (Dutch names/descriptions):
  - zoek_gepubliceerde_artikelen
  - haal_artikel_samenvatting
  - haal_artikel_inhoud          (optional; Markdoc→text or public URL)
  - lijst_sitemap_urls           (optional freshness check)
```

Sandbox stays focused on **Neon SQL / TypeScript analysis**. Archive work goes through tools, not ad-hoc curl in the VM (except optional sitemap tool).

### Why tools beat sandbox curl

1. Tools run in Eve **app runtime** → can call Convex with a server secret; sandbox never needs Convex credentials.
2. Search is structured: filter by `divisionKey`, club/team, date range, free-text over title/dek/excerpt.
3. Agent can **search first**, then fetch 1–3 full articles that look overlapping.
4. Soft-gated public pages don’t break research (index holds metadata + excerpt even if HTML is gated).
5. Observability: tool calls show up in Eve Agent Runs.

### Sitemap + curl as secondary

Keep a thin optional tool for freshness / “did we miss a newly published URL?”:

- `lees_sitemap` → returns `/nieuws/...` paths from `https://devoetbalgazet.be/sitemap.xml`
- Compare against archive index; if missing, either warn or trigger a sync job

Do **not** make “curl every article” the main duplicate-check path.

## Convex table: `articleArchive`

One row per **published** site article (and optionally drafts later — MVP = published only).

| Field | Type | Notes |
|-------|------|-------|
| `slug` | `string` | Unique |
| `headline` | `string` | |
| `dek` | `optional string` | |
| `kicker` | `optional string` | |
| `status` | `"published" \| "archived"` | |
| `publishedAt` | `number` | |
| `updatedAt` | `number` | |
| `divisionKeys` | `string[]` | Neon-aligned after taxonomy migration |
| `teamKeys` / `neonTeamIds` | `string[]` | As available |
| `clubKeys` / `neonClubIds` | `string[]` | As available |
| `excerpt` | `string` | First N chars / lead paragraphs for search |
| `bodyText` | `optional string` | Plain text of body for deeper check (size-capped) |
| `canonicalPath` | `string` | `/nieuws/<slug>` |
| `source` | `"keystatic"` | |
| `contentHash` | `string` | Detect unchanged syncs |
| `syncedAt` | `number` | |

Indexes:

- `by_slug`
- `by_publishedAt`
- `by_status_and_publishedAt`
- Search MVP: query by division then filter text in TS; later Convex search index on `headline`+`dek`+`excerpt` if available

### Sync mechanisms (pick one primary for MVP)

1. **CI / build script** after content changes: parse `apps/web/content/articles/*.mdoc` → upsert Convex via deploy key / internal mutation.  
2. **Admin “Sync archief” button** for manual refresh.  
3. **Later:** hook on Keystatic publish.

Dry-run script required before any bulk write (`--dry-run` first).

## Eve tools (Dutch)

All tool **filenames**, **descriptions**, and **argument descriptions** in Dutch.

### `zoek_gepubliceerde_artikelen.ts`

```ts
// Beschrijving: Zoek in het gepubliceerde artikelarchief om overlappingen te vermijden.
input: {
  reeksId: string;              // verplichte series-scope
  zoekterm?: string;            // titel/dek/excerpt
  clubId?: string;
  teamId?: string;
  limiet?: number;              // default 10, max 25
  sindsDagen?: number;          // optioneel tijdsvenster
}
output: {
  resultaten: Array<{
    slug, headline, dek, publishedAt, canonicalPath,
    divisionKeys, scoreHint?
  }>
}
```

### `haal_artikel_samenvatting.ts`

Metadata + excerpt for one slug.

### `haal_artikel_inhoud.ts`

Returns capped plain-text body (from Convex `bodyText` if synced, else fetch+strip public HTML as fallback). Soft-gate: prefer Convex bodyText.

### `lees_sitemap.ts` (optional)

Fetches sitemap, returns nieuws URLs; agent compares to search results.

## Agent instructions (archive section)

In Dutch, roughly:

1. Voor je een idee finaliseert, gebruik `zoek_gepubliceerde_artikelen` voor deze reeks met relevante zoektermen (club, speler, hoek).  
2. Bij mogelijke overlap: haal samenvatting/inhoud en noteer `archiveOverlapNotes`.  
3. Stel geen idee voor dat inhoudelijk dezelfde hoek herhaalt als een recent artikel.  
4. Gebruik sitemap alleen als controle, niet als primaire zoekmethode.

## Duplicate detection — what we mean (Q18)

Two different notions:

| Kind | Mechanism |
|------|-----------|
| **Same person / contact** | `contacts.neonPersonId` unique — no duplicate contact rows |
| **Same story angle** | Archive tools — e.g. “jeugdtrainer met plan bij club X” already published last week |

Neon IDs alone do **not** prevent story-angle duplicates. Archive search does.

MVP rule of thumb (tunable): if search finds a published article in the same reeks with strong title/club/player overlap in the last ~60 days, agent must justify novelty or drop the idea. Exact window can stay soft in instructions until editorial preference exists.

## What we will not do in MVP

- Full vector/semantic search  
- Storing every Markdoc revision forever in Convex  
- Making Neon the CMS  
- Unrestricted sandbox egress to crawl the whole web  

## Implementation phases for archive

1. Schema `articleArchive` + sync dry-run script from Markdoc  
2. Eve tools `zoek_*` / `haal_*` calling Convex HTTP or shared secret query  
3. Wire instructions + eval “must call zoek before finalize”  
4. Optional sitemap tool  
5. Later: search index / Neon sync if desired  
