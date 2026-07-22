# Convex Orchestration — Research Runs ↔ Eve

## Split

| System | Owns |
|--------|------|
| Convex | Pipeline state, contacts, articleArchive, locks, authz |
| Eve | Research session, sandbox, archive tools, IdeaBatch |
| Neon | Football facts (read-only) |
| Waiter | Start Eve session, wait for `result.completed`, call complete/fail mutations |

## Generate sequence

```text
startResearchRun(divisionKey, clientRequestId)
  → reject if queued|running for divisionKey
  → insert run { status queued, source fixture|eve }
  → kick waiter

Phase A waiter/stub:
  → running → insert 5 fixtures + contacts → succeeded

Phase D+ waiter:
  → running
  → pack Dutch prompt (reeks, recent titles, prefs)
  → POST Eve /eve/v1/session + outputSchema
  → stream until result.completed | fail | timeout
  → completeResearchRun | failResearchRun
```

## Concurrency (Q10)

**Per-reeks lock:** one `queued|running` per `divisionKey`. Other reeksen may run in parallel. Optional later: global max concurrent Eve sessions for cost.

## Waiter host (Q13)

Prefer Convex `"use node"` action first. If duration exceeds limits → Next.js/Fluid route under `apps/web` authenticated for admin/server, writing via Convex mutations + shared secret.

## completeResearchRun

1. Assert run running  
2. Validate 5 ideas  
3. Upsert contacts; insert articles + joins  
4. Patch run succeeded + ideaIds  
5. On validation error: fail run, **no** partial inserts  

## Approvals

- Keep all 3 `titleProposals`  
- Freeze `pipelineArticleContacts.selected` (0..3)  
- `phase → awaiting_contacts`  
- Reject → `rejected` (hidden from default UI queries)

## Auth

Eve invoke token / OIDC. Archive tools use server-side Convex credentials in Eve app runtime (not sandbox).

## Observability

`eveSessionId`, Dutch `errorMessage`, optional PostHog events.
