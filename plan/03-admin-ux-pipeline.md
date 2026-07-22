# Admin UX — Pipeline

## Placement

- Nav label: **Pipeline** (short: **Pipe**)  
- Root: `/admin/pipeline`  
- Roles: `admin` + `journalist` write; `viewer` read-only / no generate  

## Routes

```text
/admin/pipeline                  → redirect to /ideeen
/admin/pipeline/ideeen           → idea_review list (default; rejects filtered out)
/admin/pipeline/contacten        → stub
/admin/pipeline/interviews       → stub
/admin/pipeline/drafts           → stub
/admin/pipeline/[articleId]      → detail
```

Query: `?reeks=<divisionKey>`.

Optional later: `/admin/pipeline/ideeen?toon=afgewezen` for rejected bin (not MVP chrome).

## Series selector

Compact top bar: **Reeks** + select (Neon-aligned catalog). Persist URL + localStorage. Badge = count in `idea_review` for selection.

## Phase strip

`Ideeën · Contacten · Interviews · Drafts · Klaar` with counts for selected reeks. Rejected not a primary tab.

## Ideeën view

### Generate

**Genereer 5 ideeën**

- Disabled when this reeks has `queued|running` research run  
- Spinner copy: **Bezig met research…**  
- Phase A: creates **fixture** ideas (`source: "fixture"`) — see [`10-fixture-ideas-and-phase-a.md`](./10-fixture-ideas-and-phase-a.md)  
- Phase D+: real Eve  

### List

Only `phase === "idea_review"`. Columns: ideetitel, 3-titel hint, contacten geselecteerd/totaal, tijd.

### Detail

1. Ideetitel  
2. **Drie titelvoorstellen** (all shown; no forced pick on approve — `Q6`)  
3. Waarom interessant  
4. Ondersteunende feiten  
5. Interviewkandidaten (0–3) — toggle selected; cannot add  
6. Actions: **Goedkeuren** (0 contacts OK) / **Afwijzen** (optional reason)  

After reject → row leaves default list (still in DB).

## Empty / errors

Dutch copy. All-or-nothing batches. Retry after failure.

## Realtime

Convex queries/mutations. `clientRequestId` on generate.

## Copy cheat-sheet

| EN concept | NL UI |
|------------|-------|
| Pipeline | Pipeline |
| Generate 5 ideas | Genereer 5 ideeën |
| Approve | Idee goedkeuren |
| Reject | Idee afwijzen |
| Don’t interview | Niet interviewen |
| Ideas / Contacts / … | Ideeën / Contacten / Interviews / Drafts / Publicatie |
