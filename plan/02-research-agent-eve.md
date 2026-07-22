# Research Idea Agent (Eve)

## Role

Autonomous data journalist for **one** Neon-aligned reeks. Explores Neon in a sandbox, returns **exactly 5** idea proposals with grounded facts and optional interviewees.

**Out of scope:** searching / deduping against published site articles (Keystatic/Git archive). Revisit later.

## Location & deploy

```text
apps/agents/research-idea-agent/     ← Eve project root
  package.json
  agent/
    agent.ts                         ← model zai/glm-5.2
    instructions.md                  ← Dutch (sent to model)
    sandbox/
      sandbox.ts                     ← English code
      workspace/
        docs/                        ← Neon schema docs (next session; can be Dutch for the model)
        package.json                 ← pg, tsx
        lib/db.ts                    ← English code
    tools/                           ← English filenames; Dutch descriptions
    skills/                          ← Dutch content (loaded into model context)
    evals/                           ← English code OK
```

**Vercel:** separate project, Root Directory `apps/agents/research-idea-agent`.

## Model

```ts
import { defineAgent } from "eve";

export default defineAgent({
  name: "voetbalgazet-research-idea",
  model: "zai/glm-5.2", // MIT open-weight; changeable later
});
```

## Language split

| Surface | Language |
|---------|----------|
| TypeScript / function names / Convex fields / JSON **keys** | **English** |
| `instructions.md`, skills, tool `description` / Zod `.describe()` | **Dutch** (sent to the agent) |
| Task message from orchestrator | **Dutch** |
| IdeaBatch **string values** (titles, facts, whyInteresting, …) | **Dutch** |
| Admin UI copy | Dutch (existing product language) |

See [`09-dutch-agent-conventions.md`](./09-dutch-agent-conventions.md).

## Capabilities

| Concern | Mechanism |
|---------|-----------|
| Football stats exploration | Sandbox: write/run TypeScript + `pg` against Neon |
| Structured result | Eve `outputSchema` / `result.completed` |
| Contact identity | Returned Neon person/club/team ids → Convex upsert |

No archive/search tools in this phase.

## Sandbox

- Runtime Node 24; bootstrap `npm install` for `pg`/`tsx`  
- `DATABASE_URL` / `NEON_DATABASE_URL` via `vercel({ env })`  
- Network allow-list: Neon hosts (+ only what’s required)  
- Seed Neon schema markdown (written next session)  
- Ephemeral research files under `/workspace/research/`  

## Output schema (IdeaBatch)

English keys (code), Dutch string values. Exactly 5 ideas.

```ts
type IdeaBatch = {
  ideas: [IdeaProposal, IdeaProposal, IdeaProposal, IdeaProposal, IdeaProposal];
};

type IdeaProposal = {
  ideaTitle: string;
  titleProposals: [string, string, string];
  whyInteresting: string;
  supportingFacts: Array<{
    claim: string;
    evidence: string;
    source: "neon" | "convex";
  }>;
  interviewees: Array<{
    neonPersonId: string;
    fullName: string;
    contactType: "player" | "staff" | "board" | "other";
    contactTypeDetail?: string;
    neonClubId: string;
    clubName: string;
    neonTeamId?: string;
    teamName?: string;
    whyInterview: string;
  }>; // 0–3
  researchSummary?: string;
};
```

Zod field `.describe(...)` strings for the schema shown to the model are **Dutch**.

## Input message (from orchestrator)

Dutch task prompt including:

- reeks id + label  
- editorial prefs  
- Reminder: exactly 5 ideas, grounded facts, Dutch prose in string fields  

## Result ingest

1. Validate IdeaBatch  
2. For each interviewee → upsert `contacts`  
3. Insert 5 `pipelineArticles` + `pipelineArticleContacts`  
4. Mark run succeeded  

## Evals (minimum)

1. Shape: 5 ideas, 3 titles, ≤3 interviewees  
2. String fields look Dutch (heuristic / judge)  
3. Grounding fixture against known Neon facts (later)  

## Local dev

```bash
cd apps/agents/research-idea-agent
npm install && eve link
# NEON_DATABASE_URL
eve dev
```
