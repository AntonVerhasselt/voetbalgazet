# Convex Orchestration — Research Runs ↔ Eve

## Responsibility split

| System | Owns |
|--------|------|
| **Convex** | Pipeline state, authz, run locking, idempotency, approvals, UI queries |
| **Eve** (`apps/agents/research-idea-agent`) | Durable research session, sandbox, model loop, structured result |
| **Neon** | Football facts (read-only); naming source of truth |
| **Next admin** | UX only; no direct Neon access from browser |

## Generate-ideas sequence

```text
Editor clicks Genereer 5 ideeën
        │
        ▼
startResearchRun (editorMutation)
  - authz
  - reject if queued|running exists for divisionKey
  - insert pipelineResearchRuns { status: queued, clientRequestId }
  - schedule runResearchAction (or stub fixture path in Phase A)
        │
        ▼
Phase A stub: complete with 5 fixture ideas
Phase D+: runResearchAction ("use node")
  - status → running
  - pack context (recent titles, archive headlines, editorial prefs)
  - POST Eve /eve/v1/session + outputSchema + auth
  - consume until result.completed | failure | timeout
        │
        ├─ success → completeResearchRun
        │              insert 5 pipelineArticles (idea_review)
        │              status succeeded
        └─ failure → failResearchRun (no ideas inserted)
```

## Waiter topology

| Option | When |
|--------|------|
| Convex `"use node"` action | Prefer first if duration fits action limits |
| Next.js / Fluid route under `apps/web` | Fallback if Eve runs too long (`Q13`) |

## Concurrency

**Pending `Q10`.** Plan default until answered: **one queued|running run per `divisionKey`**; other reeksen may run in parallel. Idempotent `clientRequestId`.

## Auth to Eve

Shared bearer or Vercel OIDC on Eve channel. Token only on Convex + Eve envs (never `NEXT_PUBLIC_`).

## Context packed into Eve message

- Neon-aligned `divisionKey` + label  
- Recent pipeline idea titles (all statuses) for series  
- Recent published Markdoc titles/slugs/deks for series  
- Editorial prefs  
- “Return exactly 5 ideas matching schema”

## Completing a run

`completeResearchRun` internal mutation:

1. Assert run `running`.  
2. Validate IdeaBatch (exactly 5, lengths, Neon ids when present).  
3. Insert 5 `pipelineArticles` + `pipelineEvents`.  
4. Patch run succeeded.  
5. Validation failure → failed, **zero** inserts.

## Approvals

- `approveIdea`: `idea_review` → `awaiting_contacts`; freeze `selectedIntervieweeKeys` (**may be empty**).  
- `rejectIdea` → `rejected`.  
- `setIntervieweeSelection` before approve.

## Observability

Store `eveSessionId`, errors, timestamps on `pipelineResearchRuns`. Optional PostHog: started / succeeded / failed / approved / rejected.

## Security checklist

- [ ] `editorMutation` / role gates  
- [ ] Eve invoke token not in browser  
- [ ] Neon URL only on Eve (+ Cursor secret for agents)  
- [ ] Validate agent output before insert  
- [ ] Bound string sizes  
- [ ] No SQL from the client  

## Testing

1. Validators unit tests  
2. Phase transitions  
3. Mock Eve → 5 ideas  
4. Fixture path for UI  
5. Real Eve + Neon smoke in preview  
