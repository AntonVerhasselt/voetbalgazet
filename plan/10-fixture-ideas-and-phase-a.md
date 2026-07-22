# Fixture Ideas & Phase A

## What are fixture ideas?

**Fixture ideas** are fake but **schema-valid** idea objects created by the app **without calling Eve or Neon**. They exist so we can build and test the Pipeline UI and Convex mutations (generate lock, list, detail, approve, reject, contact toggles) before the research agent is ready.

They are **not** editorial content and must never ship as “real” research in production without being obviously stubbed (dev/preview only, or `source: "fixture"` gated).

## Why yes (`Q15`)

Unblocks Phase A completely: schema + UI + review UX land while Neon docs and Eve are built in parallel.

## Behavior

1. Editor selects reeks R, clicks **Genereer 5 ideeën**.  
2. `startResearchRun` creates run `{ source: "fixture", status: "running" }` (still respects per-reeks lock).  
3. Internal mutation inserts:
   - 5 `pipelineArticles` with Dutch sample copy  
   - up to 3 `contacts` + `pipelineArticleContacts` with **fake** `neonPersonId` prefixed `fixture:` so they never collide with real Neon ids  
4. Run → `succeeded`.  
5. UI behaves identically to the real path.

## Sample content guidelines

- Dutch titles/facts that look plausible but say nothing false about real clubs if avoidable — use clearly fictional club names **or** label facts as “voorbeelddata”.  
- Prefer `fixture:` ids always.  
- `supportingFacts[].source = "convex"` or a dedicated fixture marker.  

## Switching off fixtures

Feature flag / env: `PIPELINE_RESEARCH_MODE=fixture|eve`.

- Local + early preview: `fixture`  
- When Phase E lands: `eve`  
- Fail closed in production if Eve misconfigured (don’t silently insert fixtures in prod)

## Tests

- Generate fixtures → 5 rows  
- Second generate while running → rejected  
- Approve 0 contacts  
- Reject → not in default query  
- Toggle selection  
