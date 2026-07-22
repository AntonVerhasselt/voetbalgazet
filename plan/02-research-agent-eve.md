# Research Idea Agent (Eve)

## Role

Autonomous data journalist for **one** Neon-aligned reeks. Explores Neon in a sandbox, uses **archive tools** to avoid story-angle duplicates, returns **exactly 5** Dutch idea proposals with grounded facts and optional interviewees.

## Location & deploy

```text
apps/agents/research-idea-agent/     ← Eve project root
  package.json
  agent/
    agent.ts                         ← model zai/glm-5.2
    instructions.md                  ← Dutch
    sandbox/
      sandbox.ts
      workspace/
        docs/                        ← Neon schema docs (next session)
        package.json                 ← pg, tsx
        lib/db.ts
    tools/                           ← Dutch tool names
      zoek_gepubliceerde_artikelen.ts
      haal_artikel_samenvatting.ts
      haal_artikel_inhoud.ts
      lees_sitemap.ts                ← optional
    skills/                          ← Dutch markdown
    evals/
```

**Vercel:** separate project, Root Directory `apps/agents/research-idea-agent`.

## Model

```ts
import { defineAgent } from "eve";

export default defineAgent({
  name: "voetbalgazet-research-idea",
  model: "zai/glm-5.2", // MIT open-weight; changeable later
  // outputSchema via client turn preferred; can also set defaults here
});
```

## Language (hard rule)

**Everything the agent authors or exposes is Dutch:**

- `instructions.md`  
- skill bodies + frontmatter descriptions  
- tool `description` and Zod field `.describe(...)`  
- model-facing error strings where applicable  
- all IdeaBatch string content (titles, whyInteresting, facts, whyInterview, notes)

Technical identifiers (`neonPersonId`, SQL, JSON keys) stay as schema requires; **values** for humans are Dutch. See [`09-dutch-agent-conventions.md`](./09-dutch-agent-conventions.md).

## Capabilities split

| Concern | Mechanism |
|---------|-----------|
| Football stats exploration | Sandbox: write/run TypeScript + `pg` against Neon |
| Avoid duplicate *stories* | Tools → Convex `articleArchive` (+ optional sitemap) |
| Avoid duplicate *people rows* | Convex upsert on `neonPersonId` after result ingest |
| Structured result | Eve `outputSchema` / `result.completed` |

**Do not** give the sandbox unrestricted web crawl as the archive strategy.

## Sandbox

- Runtime Node 24; bootstrap `npm install` for `pg`/`tsx`  
- `DATABASE_URL` / `NEON_DATABASE_URL` via `vercel({ env })`  
- Network allow-list: Neon hosts (+ only what’s required)  
- Seed Neon schema markdown (written next session)  
- Ephemeral research files under `/workspace/research/`  

## Output schema (IdeaBatch)

Exactly 5 ideas. Content language: Dutch.

```ts
type IdeaBatch = {
  ideas: [IdeaProposal, IdeaProposal, IdeaProposal, IdeaProposal, IdeaProposal];
};

type IdeaProposal = {
  ideetitel: string;
  titelVoorstellen: [string, string, string];
  waaromInteressant: string;
  ondersteunendeFeiten: Array<{
    bewering: string;
    bewijs: string;
    bron: "neon" | "archief" | "convex";
  }>;
  interviewkandidaten: Array<{
    neonPersoonId: string;
    volledigeNaam: string;
    type: "speler" | "staf" | "bestuur" | "andere";
    typeDetail?: string;
    neonClubId: string;
    clubNaam: string;
    neonTeamId?: string;
    teamNaam?: string;
    waaromInterviewen: string;
  }>; // 0–3
  onderzoeksSamenvatting?: string;
  archiefOverlapNotities?: string;
};
```

Convex maps Dutch schema → internal field names (`ideaTitle`, `contactType: player|staff|board|other`, …).

## Archive tools

Detailed in [`07-article-archive-tools.md`](./07-article-archive-tools.md). Agent **must** call search before finalizing ideas (enforce via instructions + eval).

## Input message (from orchestrator)

Dutch task prompt including:

- `reeksId` + label  
- Recent pipeline idea titles for that reeks  
- Editorial prefs  
- Reminder: exactly 5 ideas, grounded facts, archive search, Dutch output  

## Result ingest

1. Validate IdeaBatch  
2. For each interviewkandidaat → upsert `contacts`  
3. Insert 5 `pipelineArticles` + `pipelineArticleContacts`  
4. Mark run succeeded  

## Evals (minimum)

1. Shape: 5 ideas, 3 titles, ≤3 kandidaten  
2. Language: Dutch titles (heuristic / judge)  
3. Must call `zoek_gepubliceerde_artikelen`  
4. Grounding fixture against known Neon facts (later)  

## Local dev

```bash
cd apps/agents/research-idea-agent
npm install && eve link
# NEON_DATABASE_URL + Convex archive access secret
eve dev
```
