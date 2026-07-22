# Convex Orchestration — Research Runs ↔ Eve

## Responsibility split

| System | Owns |
|--------|------|
| **Convex** | Editorial state, authz, run locking, idempotency, approvals, UI queries |
| **Eve** | Durable research session, sandbox compute, model loop, structured result |
| **Neon** | Football facts (read-only) |
| **Next admin** | UX only; no direct Neon access |

Convex does **not** try to re-implement Eve’s workflow engine. It treats Eve as a remote worker with a job record.

## Generate-ideas sequence

```text
Editor clicks Genereer 5 ideeën
        │
        ▼
startResearchRun (editorMutation)
  - authz check
  - reject if running run exists for divisionKey
  - insert researchRuns { status: queued, clientRequestId }
  - schedule / call runResearchAction
        │
        ▼
runResearchAction ("use node")
  - patch status → running
  - gather context (recent titles, editorial prefs)
  - POST Eve /eve/v1/session
      message + outputSchema + auth
  - consume stream until result.completed | session.failed | timeout
        │
        ├─ success → completeResearchRun mutation
        │              insert 5 editorialArticles (phase idea_review)
        │              link ideaIds; status succeeded
        │
        └─ failure → failResearchRun mutation
                       status failed; errorMessage; no ideas inserted
```

## Why a Convex action?

Eve HTTP + stream consumption needs Node/fetch and can run minutes. Convex mutations cannot do that. Options:

1. **Convex `"use node"` action** (preferred if timeouts allow)
2. **Next.js Route Handler** under `/api/admin/journalist/research` called after mutation
3. **Eve schedule/webhook** push into Convex

**Recommendation:** Start with Convex action; if Convex action time limits prove too tight for long sandbox research, move the waiter to a Next.js/Fluid route that still writes through Convex mutations with a shared secret / admin session.

Document measured p50/p95 Eve run duration during Phase 3 spikes; adjust topology if needed.

## Concurrency & locking

Policy for Phase 1:

- **At most one `queued|running` research run per `divisionKey`.**
- Other divisions can run in parallel (cost permitting).
- Idempotency: same `clientRequestId` returns existing run, does not start a second.

Optional later: global cap (e.g. 2 concurrent Eve sessions).

## Auth to Eve

Eve session routes must not be public.

Recommended:

1. Author `agent/channels/eve.ts` with route auth (shared bearer or Vercel OIDC).
2. Convex action sends `Authorization: Bearer <RESEARCH_AGENT_INVOKE_TOKEN>`.
3. Token only on Convex + Eve envs (not `NEXT_PUBLIC_`).

## Context packed into the Eve message

Built in Convex before invoke:

- `divisionKey` + human label
- Optional Neon division id mapping
- Last N idea titles for that series (approved + pending + rejected) to reduce duplicates
- Editorial preferences blob (from Keystatic `editorial.yaml` and/or new Convex settings)
- Instruction: return exactly 5 ideas matching schema

## Completing a run (transactional rules)

`completeResearchRun` internal mutation:

1. Assert run exists and is `running`.
2. Validate payload (Zod-equivalent Convex validators): length 5, titles, interviewees ≤3, required Neon ids.
3. Insert 5 `editorialArticles`.
4. Insert `editorialEvents` `created` for each.
5. Patch run `succeeded` + `ideaIds` + `finishedAt`.
6. If validation fails → `failed`, insert nothing.

**All-or-nothing:** never partial inserts.

## Approvals

`approveIdea` editorMutation:

1. Load article; assert `phase === "idea_review"`.
2. Validate `selectedIntervieweeKeys` ⊆ candidates and length policy.
3. Optionally set `selectedTitle` from one of `titleProposals`.
4. Patch `phase → awaiting_contacts`, approval audit fields.
5. Append event.

`rejectIdea` similar → `rejected`.

`setIntervieweeSelection` can update toggles before approve without phase change.

## Failure handling

| Failure | Behavior |
|---------|----------|
| Eve auth error | fail run; alert admin |
| Stream timeout | fail run; cancel Eve session if API supports |
| Invalid schema result | fail run; log payload excerpt server-side |
| Neon unreachable inside sandbox | Eve fails turn → fail run |
| Convex write conflict | rely on run status guard |

Retries: **manual** via new generate click (new run). Auto-retry once optional later.

## Observability

Store on `researchRuns`:

- `eveSessionId`
- `finishedAt`, `errorMessage`
- optional token/cost fields if Eve exposes them later

Link in admin (admin-only): open Vercel Agent Runs for that session.

PostHog (optional Phase 1):

- `journalist_research_started`
- `journalist_research_succeeded` / `failed`
- `journalist_idea_approved` / `rejected`

## Security checklist

- [ ] Admin mutations use `editorMutation` / `adminMutation` wrappers
- [ ] Eve invoke token not exposed to browser
- [ ] Neon URL only on Eve (and Cursor secret for agents), never to client
- [ ] Validate all agent output before DB insert
- [ ] Bound string lengths to avoid huge Convex docs
- [ ] No SQL from the browser

## Testing plan

1. Unit: validators for IdeaBatch → Convex docs
2. Unit: phase transition map
3. Integration (mock Eve): start run → fake result → 5 ideas appear
4. Integration (real Eve + Neon): one division smoke in preview
5. UI: button disabled while running (Convex fake run fixture)

## Cron / schedules (later)

Daily auto-research per series can be an Eve `schedules/` entry **or** Convex cron calling the same action. Prefer Convex cron so series selection and rate limits stay in the editorial DB.
