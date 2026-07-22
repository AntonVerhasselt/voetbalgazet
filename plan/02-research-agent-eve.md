# Research & Proposal Agent (Eve)

## Role

Autonomous data journalist for one series (division). Explores Neon football data in a sandbox, avoids duplicates via archive context, returns **exactly 5** structured idea proposals.

## Package layout

Eve’s contract is “an agent is a directory” with an inner `agent/` folder. In this monorepo:

```text
agents/
└── research/
    ├── package.json              # eve + deps; own Vercel project
    ├── tsconfig.json
    ├── .env.example
    ├── README.md
    └── agent/
        ├── agent.ts              # model + outputSchema defaults
        ├── instructions.md       # always-on identity + hard rules
        ├── sandbox/
        │   ├── sandbox.ts        # vercel backend, bootstrap, network policy
        │   └── workspace/        # seeded into /workspace
        │       ├── docs/
        │       │   ├── database-schema.md
        │       │   ├── relationships.md
        │       │   ├── common-queries.md
        │       │   ├── editorial-guidelines.md
        │       │   └── style-guide.md
        │       ├── package.json  # pg, tsx as sandbox deps
        │       └── lib/
        │           └── db.ts     # read-only pg helper example
        ├── skills/
        │   ├── finding-interesting-stories.md
        │   ├── finding-player-records.md
        │   ├── finding-unusual-results.md
        │   └── editorial-criteria.md
        ├── tools/                # minimal; prefer sandbox coding
        │   └── submit_research_ ent.md  # optional — prefer client outputSchema
        ├── hooks/                # optional logging / Convex notify
        └── evals/
            ├── grounded-facts.eval.ts
            └── five-ideas-shape.eval.ts
```

Do **not** put Eve’s `agent/` inside `apps/web`. Long sandbox research + Fluid Compute fits a dedicated Eve deployment better than the Next.js site project.

### Deploy topology

| Piece | Where |
|-------|--------|
| Admin UI | Existing `apps/web` on Vercel |
| Convex | Existing Convex project |
| Research agent | New Vercel project rooted at `agents/research` |

Convex (or a small authenticated route) calls:

`POST https://<research-agent>.vercel.app/eve/v1/session`

with bearer/OIDC auth + `outputSchema`.

## Agent configuration

```ts
// agent/agent.ts
import { defineAgent } from "eve";
import { ideaBatchSchema } from "./lib/ideaBatchSchema";

export default defineAgent({
  name: "voetbalgazet-research",
  model: "anthropic/claude-sonnet-5", // or OpenRouter LanguageModel — see decisions
  outputSchema: ideaBatchSchema,     // task-mode default for schedules/remote; client can also pass per turn
});
```

### Model provider decision

| Option | Pros | Cons |
|--------|------|------|
| **Vercel AI Gateway** (Eve default) | OIDC on Vercel, no extra key, first-class | Not OpenRouter |
| **OpenRouter via AI SDK provider** | Matches your brief; model shopping | Extra key; self-host credential path |

**Recommendation:** Start with AI Gateway for reliability on Vercel; keep OpenRouter as a drop-in `LanguageModel` if you need specific models/routing. Do not block Phase 1 on OpenRouter unless you already rely on it elsewhere.

## Instructions philosophy

`instructions.md` must encode:

1. You are a Flemish local-football data journalist for De Voetbalgazet.
2. Work only within the requested `divisionKey` / Neon division mapping.
3. Never modify the database; use read-only access.
4. Never invent statistics — every claim needs retrieved evidence.
5. Prefer many small exploratory queries over one mega-query.
6. Iterate in the sandbox until you have 5 *distinct* newsworthy ideas with enough evidence.
7. Check archive/overlap before finalizing.
8. Return **only** the structured batch (5 ideas) matching the schema.
9. Interviewees must be real Neon people with club linkage; max 3 per idea.
10. Language: Dutch (Flemish editorial voice) for titles and “why interesting”.

## Structured output schema (contract)

Client turn uses Eve `outputSchema` so the turn emits `result.completed` with:

```ts
type IdeaBatch = {
  ideas: [
    IdeaProposal,
    IdeaProposal,
    IdeaProposal,
    IdeaProposal,
    IdeaProposal,
  ]; // exactly 5 — enforce via Zod tuple or length refine
};

type IdeaProposal = {
  ideaTitle: string;
  titleProposals: [string, string, string];
  whyInteresting: string;
  supportingFacts: Array<{
    claim: string;
    evidence: string;
    source: "neon" | "archive" | "convex";
  }>;
  interviewees: Array<{
    neonPersonId: string;
    fullName: string;
    role: "player" | "staff" | "other";
    roleDetail?: string;
    neonClubId: string;
    neonTeamId?: string;
    clubName: string;
    whyInterview: string;
  }>; // max 3
  researchSummary?: string;
  archiveOverlapNotes?: string;
};
```

Convex maps this into `editorialArticles` + embedded interviewees (`key = neonPersonId`).

## Sandbox design

### What to seed (not a full monorepo clone)

Cloning the entire Voetbalgazet app is heavy and unnecessary. Seed:

- Schema/editorial markdown docs
- A tiny `package.json` with `pg` + `tsx` + `typescript`
- Example `lib/db.ts` that opens a read-only client from `process.env.NEON_DATABASE_URL` or `DATABASE_URL`
- Optional sample notebooks / query snippets

### Bootstrap (template snapshot)

```ts
// agent/sandbox/sandbox.ts
import { defineSandbox } from "eve/sandbox";
import { vercel } from "eve/sandbox/vercel";

export default defineSandbox({
  backend: () =>
    vercel({
      runtime: "node24",
      resources: { vcpus: 2 },
      // env injection for Postgres wire protocol
      env: {
        DATABASE_URL: process.env.NEON_DATABASE_URL ?? "",
      },
    }),
  revalidationKey: () => `research-sandbox-v1-${process.env.SANDBOX_DOCS_VERSION ?? "1"}`,
  async bootstrap({ use }) {
    const sandbox = await use();
    await sandbox.run({ command: "npm install" }); // in /workspace with seeded package.json
  },
  async onSession({ use }) {
    await use({
      // tighten after Neon hostnames known
      networkPolicy: {
        allow: [
          "*.neon.tech",
          // article archive host TBD
        ],
      },
      // timeout: research can be long — set explicitly (plan limit TBD)
    });
  },
});
```

### How the agent researches

No `execute_sql` tool required. Built-in Eve tools already provide `bash`, `read_file`, `write_file`, `glob`, `grep`.

Typical agent loop:

1. Read `/workspace/docs/database-schema.md` and editorial guidelines.
2. Write `research/explore_standings.ts`.
3. `npx tsx research/explore_standings.ts`
4. Analyze stdout; write notes to `research/notes.md`.
5. Iterate with more scripts.
6. Finalize structured ideas (output schema).

Optional authored tool: `get_division_context` that returns Convex editorial prefs / recent approved ideas for the series (runs in **app runtime**, not sandbox), so the model doesn’t need Convex credentials inside the VM.

### Secrets

| Secret | Where | Used by |
|--------|-------|---------|
| `NEON_DATABASE_URL` | Eve Vercel project env (+ Cursor secret for tests) | Sandbox `env` / bootstrap |
| Model creds | `AI_GATEWAY_API_KEY` or OIDC / OpenRouter key | Eve runtime |
| `RESEARCH_AGENT_SHARED_SECRET` or OIDC | Eve + Convex/Next | Authenticate session creation |
| `CONVEX_SITE_URL` + webhook secret | Eve (if push model) | Optional result webhook |

**Note:** Eve docs prefer keeping secrets out of the sandbox via HTTP credential brokering. Postgres uses a wire protocol, so **env injection of the read-only URL is the practical approach**. Neon role must be SELECT-only.

## Skills (on-demand)

Keep always-on instructions short; put playbooks in skills:

- **finding-interesting-stories** — streaks, table swings, derby patterns, youth→first team, disciplinary spikes
- **finding-player-records** — season-best, unusual age/performance, first goals
- **finding-unusual-results** — outliers vs form
- **editorial-criteria** — what De Voetbalgazet publishes; local human angle; interviewability

## Input message from Convex

When starting a session, send a single task message, e.g.:

```text
Genereer precies 5 artikelideeën voor reeks `antwerpen-p1`.

Editorial preferences:
- ...

Recent rejected/approved idea titles to avoid:
- ...

Return only the structured IdeaBatch.
```

Pass `outputSchema` on the client turn (Eve client SDK or HTTP equivalent).

## Result ingestion paths

### Preferred: pull from orchestrator

1. Convex action starts Eve session with `outputSchema`.
2. Action consumes stream until `result.completed` / failure.
3. Action calls internal mutation to insert 5 articles + mark run succeeded.

### Alternative: push from Eve tool

Tool `persist_ideas` posts to Convex HTTP action with shared secret.

Prefer **pull** first — clearer ownership, easier idempotency, no public Convex write surface from the agent.

## Evals (minimum)

1. Schema compliance: always 5 ideas, 3 titles, ≤3 interviewees with IDs.
2. Grounding: reject runs that invent a known-fake stat in a fixture DB.
3. Series focus: ideas reference the requested division.
4. Language: titles in Dutch.

## Local development

```bash
cd agents/research
npm install
eve link          # Vercel project + AI Gateway creds
# set NEON_DATABASE_URL in .env.local
eve dev           # TUI research loop
```

Sandbox local backends: Docker → microsandbox → just-bash. For real `pg` + network, use Docker or `vercel()` backend with credentials.

## What we will not do in Phase 1

- WhatsApp / interview tools inside this agent
- Writing full articles
- Mutating Neon
- Auto-publishing to Keystatic
- Multi-series batch in one run (one division per run)
