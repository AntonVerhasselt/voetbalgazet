# Research & Proposal Agent (Eve)

## Role

Autonomous data journalist for one series (division). Explores Neon football data in a sandbox, avoids duplicates via archive context, returns **exactly 5** structured idea proposals.

## Package layout (monorepo)

Eve’s contract is “an agent is a directory” with an inner `agent/` folder. **Decision:** keep it in this monorepo, under `apps/agents/`, as its own deployable Eve app:

```text
apps/
├── web/                          # Next.js site + admin (existing Vercel project)
└── agents/
    └── research-idea-agent/      # Eve app → OWN Vercel project (Root Directory)
        ├── package.json
        ├── tsconfig.json
        ├── .env.example
        ├── README.md
        └── agent/
            ├── agent.ts
            ├── instructions.md
            ├── sandbox/
            │   ├── sandbox.ts
            │   └── workspace/
            │       ├── docs/
            │       │   ├── database-schema.md
            │       │   ├── relationships.md
            │       │   ├── common-queries.md
            │       │   ├── editorial-guidelines.md
            │       │   ├── style-guide.md
            │       │   └── archive-index.json   # generated from Markdoc
            │       ├── package.json             # pg, tsx
            │       └── lib/
            │           └── db.ts
            ├── skills/
            │   ├── finding-interesting-stories.md
            │   ├── finding-player-records.md
            │   ├── finding-unusual-results.md
            │   └── editorial-criteria.md
            ├── tools/            # minimal; prefer sandbox coding
            ├── hooks/
            └── evals/
```

### Why this layout (recommendation)

| Approach | Verdict |
|----------|---------|
| Embed Eve in `apps/web` via `eve/next` | Avoid — mixes long sandbox research with the public site deploy; harder timeouts/secrets |
| `agents/` at repo root | Fine, but you asked for `apps/agents/` |
| **`apps/agents/research-idea-agent` + own Vercel project** | **Chosen** — monorepo source, isolated deploy, Fluid/sandbox sized for agents |

Vercel project settings for the agent:

- Root Directory: `apps/agents/research-idea-agent`
- Include files outside root: only if needed for shared packages (prefer self-contained agent package)
- Env: `NEON_DATABASE_URL`, AI Gateway OIDC / `AI_GATEWAY_API_KEY`, invoke auth secret

### Deploy topology

| Piece | Where |
|-------|--------|
| Admin UI | `apps/web` (existing Vercel project) |
| Convex | Existing Convex project |
| Idea research agent | New Vercel project → `apps/agents/research-idea-agent` |

Invoke: `POST https://<research-idea-agent>.vercel.app/eve/v1/session`

## Agent configuration

```ts
// agent/agent.ts
import { defineAgent } from "eve";
import { ideaBatchSchema } from "./lib/ideaBatchSchema";

export default defineAgent({
  name: "voetbalgazet-research-idea",
  // AI Gateway model id — pick a cheaper open/capable model from the catalog
  model: "alibaba/qwen3.7-plus", // example; finalize after a quality smoke test
  outputSchema: ideaBatchSchema,
});
```

### Models — AI Gateway (locked)

**Decision:** Use Vercel AI Gateway (Eve default). OpenRouter not required for MVP.

- Gateway offers hundreds of models including cheaper/open ones (Qwen, Nemotron, GLM, MiniMax, etc.) at **provider list price, zero markup**.
- Browse: [vercel.com/ai-gateway/models](https://vercel.com/ai-gateway/models)
- Free tier = subset + lower rate limits; paid credits unlock full catalog.
- Switch models by changing the `model` string — no OpenRouter integration needed unless a specific provider is missing.

Recommend: start cheap/mid for MVP iteration; upgrade if idea quality or tool-use is weak (`Q19` still open for preference).

## Instructions philosophy

`instructions.md` must encode:

1. Flemish local-football data journalist for De Voetbalgazet.
2. Work only within the requested Neon-aligned series id.
3. Never modify the database; read-only access.
4. Never invent statistics — every claim needs retrieved evidence.
5. Prefer many small exploratory queries over one mega-query.
6. Iterate until 5 distinct newsworthy ideas have enough evidence.
7. Check archive overlap (seeded index + titles in the task message).
8. Return only the structured IdeaBatch (exactly 5).
9. Interviewees = real Neon people with club linkage; max 3; may return fewer.
10. Language: Dutch (Flemish) for titles and “why interesting” — confirm `Q8`.

## Structured output schema

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
  }>; // 0–3
  researchSummary?: string;
  archiveOverlapNotes?: string;
};
```

Convex maps into `pipelineArticles` (`interviewees[].key = neonPersonId`).

## Article archive (MVP)

Articles are **only in Git** today (Markdoc). Neon has no archive yet.

**MVP approach (A + B):**

1. **Convex packs** into the Eve message: recent pipeline idea titles + published Markdoc titles/slugs/deks for the series.
2. **Seed** `docs/archive-index.json` into the sandbox (generated from `apps/web/content/articles/*.mdoc` via a small script in the agent or repo `scripts/`).

**Later optional:** sync published articles into Neon for SQL archive search — separate Football Data Platform change; not MVP.

Do **not** clone the full monorepo into the sandbox for archive access.

## Sandbox design

### Seed (not full app clone)

- Schema/editorial markdown
- `archive-index.json`
- Tiny `package.json` with `pg` + `tsx` + `typescript`
- Example `lib/db.ts` reading `process.env.DATABASE_URL` / `NEON_DATABASE_URL`

### Bootstrap

```ts
import { defineSandbox } from "eve/sandbox";
import { vercel } from "eve/sandbox/vercel";

export default defineSandbox({
  backend: () =>
    vercel({
      runtime: "node24",
      resources: { vcpus: 2 },
      env: {
        DATABASE_URL: process.env.NEON_DATABASE_URL ?? "",
      },
    }),
  revalidationKey: () => `research-idea-sandbox-v1`,
  async bootstrap({ use }) {
    const sandbox = await use();
    await sandbox.run({ command: "npm install" });
  },
  async onSession({ use }) {
    await use({
      networkPolicy: {
        allow: ["*.neon.tech"],
      },
    });
  },
});
```

Postgres uses env injection (wire protocol). Neon role must be SELECT-only.

### Research loop

Built-in Eve tools: `bash`, `read_file`, `write_file`, `glob`, `grep`. Agent writes TypeScript, runs `npx tsx …`, iterates, then returns structured IdeaBatch.

## Secrets

| Secret | Where | Used by |
|--------|-------|---------|
| `NEON_DATABASE_URL` | Eve Vercel project + Cursor Cloud secret | Sandbox env |
| AI Gateway | OIDC on Vercel / `AI_GATEWAY_API_KEY` | Eve runtime |
| Invoke token | Eve + Convex | Authenticate session creation |

## Local development

```bash
cd apps/agents/research-idea-agent
npm install
eve link
# NEON_DATABASE_URL in .env.local
eve dev
```

## Out of scope for this agent

- WhatsApp / interview / writing
- Mutating Neon
- Auto-publishing to Keystatic
- Multi-series batch in one run
