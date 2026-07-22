# Contacts Data Model

Contacts are first-class Convex entities. They bridge **Neon football people** ↔ **pipeline articles** ↔ **future WhatsApp / interview agents**.

## Goals

1. Every suggested interviewee from the research agent becomes (or links to) a **contact**.  
2. Identity is anchored on **`neonPersonId`** (unique).  
3. Always store **club + team** names **and** Neon ids (when known).  
4. Typed roles: player, staff, board, other (+ free-text detail).  
5. Human **`notes`** field exists now, filled later (UI write in a later phase).  
6. Same contact can appear on many pipeline articles over time.  
7. Next agents can find “other people at the same club” via `neonClubId` / `neonTeamId`.

## Core tables

### `contacts`

Canonical person record.

| Field | Type | Notes |
|-------|------|-------|
| `neonPersonId` | `string` | **Unique**. Football Data Platform person id |
| `fullName` | `string` | Display name from Neon (denormalized) |
| `contactType` | `"player" \| "staff" \| "board" \| "other"` | |
| `contactTypeDetail` | `optional string` | e.g. `aanvaller`, `T1-trainer`, `voorzitter` |
| `neonClubId` | `string` | Primary club id at time of last sync/upsert |
| `clubName` | `string` | Denormalized label |
| `neonTeamId` | `optional string` | Team within club/competition if Neon distinguishes |
| `teamName` | `optional string` | |
| `divisionKeys` | `string[]` | Series this person is relevant to (Neon-aligned) |
| `neonSeasonId` | `optional string` | If useful for disambiguation |
| `dateOfBirth` | `optional string` | Only if present in Neon and useful; omit if sensitive/unnecessary |
| `shirtNumber` | `optional number` | Optional denormalized sports metadata |
| `isActive` | `boolean` | Soft flag if left club (updated by later syncs) |
| `notes` | `optional string` | **Human editorial notes** — empty in MVP agent writes; UI later |
| `preferredChannel` | `optional "whatsapp" \| "phone" \| "email" \| "unknown"` | Future |
| `phoneE164` | `optional string` | Future WhatsApp agent |
| `email` | `optional string` | Future |
| `whatsappJid` | `optional string` | Future |
| `source` | `"research_agent" \| "whatsapp_agent" \| "manual" \| "import"` | |
| `firstSeenAt` | `number` | |
| `lastSeenAt` | `number` | Bump on upsert |
| `createdAt` / `updatedAt` | `number` | |
| `schemaVersion` | `number` | Start 1 |

Indexes:

- `by_neon_person` (`neonPersonId`) — unique lookup  
- `by_neon_club` (`neonClubId`) — “everyone we know at this club”  
- `by_neon_team` (`neonTeamId`)  
- `by_contact_type` (`contactType`)  
- `by_updatedAt` (`updatedAt`)

**Upsert rule:** research agent output → `upsertContactByNeonPersonId`. Update denormalized labels/club/team when Neon data is newer; **never wipe `notes` or channel fields** on agent upsert.

### `pipelineArticleContacts`

Join between a pipeline article and contacts suggested/selected for interview.

| Field | Type | Notes |
|-------|------|-------|
| `articleId` | `Id<"pipelineArticles">` | |
| `contactId` | `Id<"contacts">` | |
| `neonPersonId` | `string` | Denormalized for queries |
| `whyInterview` | `string` | Agent rationale (Dutch) |
| `suggestedOrder` | `number` | 0–2 from agent list |
| `selected` | `boolean` | Editor toggle; default `true` |
| `createdAt` / `updatedAt` | `number` | |

Indexes:

- `by_article` (`articleId`)  
- `by_contact` (`contactId`)  
- `by_article_and_contact` (`articleId`, `contactId`) unique  
- `by_article_and_selected` (`articleId`, `selected`)

**Max 3** join rows per article from the research agent. Editor can only flip `selected`; cannot add rows in idea phase.

### Why not only embed interviewees on `pipelineArticles`?

Embedded arrays are fine for display snapshots, but:

- WhatsApp agent needs **club-scoped contact search** across articles.  
- The same player may be suggested for multiple stories.  
- Channel details and notes belong on the person, not on one idea.

**Pattern:** keep a small **display snapshot** optional on the article for offline/debug, but **source of truth** = `contacts` + `pipelineArticleContacts`.

Recommended: on insert from Eve, upsert contacts + write join rows; article queries join/load contacts for UI. No long-term reliance on embedded-only interviewee arrays.

## Related future tables (designed, not built)

| Table | Purpose |
|-------|---------|
| `contactLeads` | People who can *provide* a contact’s phone (club secretary, etc.) — found by WhatsApp agent using `neonClubId` |
| `contactChannelEvents` | Audit of outreach attempts |
| `conversations` | WhatsApp threads linked to `contactId` and/or `contactLeadId` |

`contactLeads` also reference `neonPersonId` / club ids when the lead is a known football person; otherwise `manual` source with notes.

## Flow: research → idea review

```text
Eve returns interviewees[0..3]
        │
        ▼
For each person:
  upsert contacts by neonPersonId
    (names, type, club/team ids+names, divisionKeys)
        │
        ▼
Insert pipelineArticleContacts (selected=true by default)
        │
        ▼
UI shows contacts for article; editor toggles selected
        │
        ▼
Approve (0 selected allowed):
  freeze selected flags (no further toggle without reopen)
  phase → awaiting_contacts
        │
        ▼
Future WhatsApp agent:
  load selected contacts (may be empty)
  if need phone: search other contacts / Neon people at same neonClubId
```

## Validation

- `neonPersonId` required for research-origin contacts  
- `neonClubId` + `clubName` required  
- `contactType` required  
- ≤3 `pipelineArticleContacts` per article from research run  
- Approve allowed with **zero** `selected=true` rows  
- Agent must not invent Neon ids — ids come from SQL results  

## Privacy / retention notes

- Storing names + club/team for editorial ops is accepted (`Q16`).  
- Channel fields empty until WhatsApp phase.  
- `notes` is human-only; don’t let the model overwrite it.  
- Youth/minors: **all players OK to suggest** (`Q17`).  

## UI implications (idea phase)

Detail panel lists up to 3 contacts:

- Name, type (+ detail), club, team  
- Why interview  
- Toggle selected  

No “add contact” in idea phase. Notes field hidden or read-only empty until a later contacts admin UI.
