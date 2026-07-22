# Convex Orchestration — Research Runs ↔ Eve

## Split

| System | Owns |
|--------|------|
| Convex | Pipeline state, contacts, locks, authz |
| Eve | Research session, sandbox, IdeaBatch |
| Neon | Football facts (read-only) |
| Waiter | Start Eve session, wait for `result.completed`, call complete/fail mutations |

## Generate sequence

```text
startResearchRun(divisionKey, clientRequestId)
  → reject if queued|running for THIS divisionKey only
  → insert run { status queued, source fixture|eve }
  → kick waiter

Phase A waiter/stub:
  → running → insert 5 fixtures + contacts → succeeded

Later waiter:
  → running
  → pack Dutch prompt (reeks, prefs)
  → POST Eve /eve/v1/session + outputSchema
  → stream until result.completed | fail | timeout
  → completeResearchRun | failResearchRun
```

## Concurrency (Q10)

**Per-division lock only:** one `queued|running` per `divisionKey`.  
Generate button disabled only for the selected reeks that is busy. Other reeksen can still start jobs.

## Waiter host

Prefer Convex `"use node"` action first. If duration exceeds limits → Next.js/Fluid route under `apps/web`, writing via Convex mutations + shared secret.

## completeResearchRun

1. Assert run running  
2. Validate 5 ideas (English keys, Dutch string content)  
3. Upsert contacts; insert articles + joins  
4. Patch run succeeded + ideaIds  
5. On validation error: fail run, **no** partial inserts  

## Approvals

- Keep all 3 `titleProposals`  
- Freeze `pipelineArticleContacts.selected` (0..3)  
- `phase → awaiting_contacts`  
- Reject → `rejected` (hidden from default UI queries)

## Auth

Eve invoke token / OIDC. Never expose Neon URL or invoke token to the browser.

## Observability

`eveSessionId`, safe `errorMessage`, optional PostHog events.
