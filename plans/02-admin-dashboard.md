# Component 2 — AI Journalist Admin Dashboard

## Purpose

An internal **AI-driven journalist dashboard** where editorial workflows combine automated analysis and outreach with **human-in-the-loop approval at every step** before anything is published or sent.

Journalists use this to:
- Analyze match results, calendars, standings, and other football data
- Discover the best article ideas
- Reach out to people for interviews via a **WhatsApp messaging agent**
- Conduct interviews via a **voice agent** (OpenAI Realtime)
- Generate draft articles with a **writing agent**
- Review, edit, and approve each stage manually
- Publish approved articles to the static news site

---

## Design reference

No dedicated admin screens exist in the prototype yet. **Reuse the public site design language:**

```
/Users/antonverhasselt/Library/Application Support/Open Design/namespaces/release-stable-intel/data/projects/a132ea15-213e-409f-9e25-e762711453c3
```

Apply:
- Same color tokens, typography, hairline rules, paper background
- Masthead adapted for admin context (e.g. "Redactie" label, nav for workflows)
- Form patterns from gate preference picker (chips, search, step indicators)
- Monospace meta labels for status/timestamps

Admin-specific patterns to design:
- Pipeline/kanban view for story status
- Side-by-side agent output vs. human edit
- Approval buttons with clear step labels
- Activity log per story

---

## User roles (proposed)

| Role | Access |
|------|--------|
| **Admin** | Full access, user management |
| **Journalist** | Create/review stories, run agents, publish |
| **Viewer** | Read-only (TBD) |

Auth: **Better Auth** via Convex component.

---

## Core workflow pipeline

Each story moves through stages. **No stage auto-advances without human approval.**

```
┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  1. Data    │───▶│  2. Ideas   │───▶│  3. Outreach │───▶│ 4. Interview│
│  Analysis   │    │  Discovery  │    │  (WhatsApp)  │    │  (Voice)    │
└─────────────┘    └─────────────┘    └──────────────┘    └──────┬──────┘
                                                                  │
┌─────────────┐    ┌─────────────┐    ┌──────────────┐           │
│  7. Publish │◀───│  6. Human   │◀───│  5. Writing  │◀──────────┘
│  to site    │    │  Edit       │    │  Agent       │
└─────────────┘    └─────────────┘    └──────────────┘
```

### Stage 1 — Data analysis
**Input:** Match results, calendar fixtures, league standings, historical context (source TBD).

**Agent tasks (OpenRouter):**
- Summarize weekend results by province/division
- Flag upsets, streaks, relegation battles, cup runs
- Cross-reference upcoming fixtures for preview angles
- Output structured JSON: `{ events[], insights[], suggestedAngles[] }`

**Human review:** Journalist selects which data points to pursue.

---

### Stage 2 — Story idea discovery
**Input:** Analysis output + editorial calendar + past published stories.

**Agent tasks:**
- Rank story ideas with rationale (newsworthiness, human interest, timeliness)
- Propose headline/dek drafts in Dutch
- Identify interview candidates (player, coach, fan) per idea
- Estimate effort: data-only vs. interview required

**Human review:** Pick one or more ideas to develop; reject or park others.

---

### Stage 3 — WhatsApp outreach
**Input:** Approved idea + contact list (phone numbers, roles, club affiliation).

**Agent (Twilio WhatsApp + OpenRouter):**
- Send personalized message in Dutch requesting interview
- Handle replies: scheduling, declines, questions
- Propose time slots
- Escalate ambiguous responses to human

**Human review:**
- Approve message template before first send
- Override or take over conversation at any time
- Confirm interview slot

**Twilio integration:**
- WhatsApp Business API
- Webhook → Convex action for inbound messages
- Conversation state in `interviewRequests` table

---

### Stage 4 — Voice interview
**Input:** Scheduled call, interview brief (questions, context from stages 1–2).

**Agent (OpenAI Realtime API + Twilio voice):**
- Conduct phone interview in Dutch
- Follow question guide; adaptive follow-ups
- Record audio → store in R2
- Generate transcript (OpenRouter or OpenAI)

**Human review:**
- Pre-approve question outline
- Option to join/listen live (TBD)
- Review transcript; request re-call if needed
- Mark interview as complete

---

### Stage 5 — Writing agent
**Input:** Transcript, data analysis, idea brief, brand voice guidelines.

**Agent (OpenRouter):**
- Draft full article in Dutch matching De Voetbalgazet voice
- Structure: kicker, headline, dek, body with quotes
- Suggest pull quotes and subheads
- Include fact-check flags for stats

**Human review:** Journalist edits in rich text editor; agent can revise on request.

---

### Stage 6 — Editorial approval
- Final copy edit
- Image selection/upload (R2)
- Metadata: division, author, reading time, SEO
- Legal/sensitivity check

---

### Stage 7 — Publish
- Approve publish → **hand off to Keystatic** (pre-filled draft or open editor)
- Journalist finalizes metadata/images in Keystatic → content saved to `content/articles/` in repo
- Vercel rebuild on git push (static site)
- Optionally queue for next newsletter issue

---

## Dashboard views (proposed)

| View | Description |
|------|-------------|
| **Inbox / Pipeline** | Kanban or list by stage; filters by division, assignee, date |
| **Story detail** | Timeline of agent runs, approvals, artifacts (transcripts, drafts) |
| **Data explorer** | Browse standings, results, calendar (read-only) |
| **Contacts** | CRM for interview subjects, WhatsApp opt-in status |
| **Agent config** | Prompts, model selection, templates (admin only) |
| **Publish queue** | Ready-to-publish articles → open in Keystatic |
| **Keystatic** | `/keystatic` — article CRUD; canonical content store in repo |
| **Activity log** | Audit trail |

---

## Agent architecture

Use **Convex Agent component** for durable workflows:

```
convex/agents/
├── analyzeData.ts      # Stage 1
├── discoverIdeas.ts    # Stage 2
├── whatsappOutreach.ts # Stage 3 — Twilio send/receive
├── voiceInterview.ts   # Stage 4 — OpenAI Realtime + Twilio
└── writeArticle.ts     # Stage 5
```

Each agent run:
- Stored in `agentRuns` with status: `pending | running | awaiting_review | approved | rejected`
- Emits artifacts linked to story (JSON, text, audio URL)
- Scheduled steps via `ctx.scheduler` (internal functions only)
- Human approval mutation advances to next stage

**LLM routing:**

| Task | Provider | Model (TBD) |
|------|----------|---------------|
| Data summarization | OpenRouter | Fast/cheap model |
| Idea ranking | OpenRouter | Reasoning model |
| WhatsApp replies | OpenRouter | Fast, Dutch-capable |
| Voice conversation | OpenAI | Realtime API |
| Transcription | OpenRouter or OpenAI | Whisper-class |
| Article drafting | OpenRouter | High-quality writing model |

---

## External integrations

| Service | Use |
|---------|-----|
| **Twilio** | WhatsApp messaging, outbound/inbound voice calls |
| **OpenAI** | Realtime voice agent for interviews |
| **OpenRouter** | All other LLM calls |
| **R2** | Interview recordings, images, exports |
| **Convex** | State, auth, scheduling |
| **Vercel** | Deploy hook on publish |

Docs:
- [Twilio](https://www.twilio.com/docs)
- [OpenAI Realtime](https://developers.openai.com/api/docs/guides/realtime)
- [OpenRouter](https://openrouter.ai/docs/quickstart)
- [Convex Agent](https://www.convex.dev/components/agent)

---

## Football data (critical dependency)

**Not yet defined.** The analysis agent needs:

- Match results (scores, scorers, cards)
- Fixtures / calendar
- Standings per division
- Team/club metadata (name, province, division)

**Options to evaluate:**
1. Manual CSV upload in admin
2. Scrape Voetbal Vlaanderen / RBFA amateur portals (legal review)
3. Third-party sports API
4. Community/submission input

This blocks Stage 1 automation until resolved.

---

## Human-in-the-loop UX principles

1. **Every agent output is a proposal** — never auto-publish or auto-send without approval (except pre-approved templates for WhatsApp — even then, first message requires sign-off).
2. **Clear diff** — show what the agent changed vs. previous draft.
3. **Rollback** — revert to any prior artifact version.
4. **Pause / takeover** — journalist can stop agent and continue manually.
5. **Audit log** — who approved what, when.

---

## Security & compliance

- Admin routes protected by Better Auth; no public access
- Interview recordings: consent captured in WhatsApp thread + verbal at call start (script TBD)
- PII (phone numbers) encrypted at rest; retention policy TBD
- Twilio webhook signature verification
- Rate limits on agent runs

---

## MVP phasing

### Admin MVP (no AI)
- [ ] Auth + dashboard shell (branded)
- [ ] **Keystatic** setup: article collection, `/keystatic` route, GitHub storage mode
- [ ] Publish to static site via repo commit + Vercel webhook

### AI phase 1
- [ ] Data import (manual) + analysis agent + review UI
- [ ] Idea discovery agent

### AI phase 2
- [ ] WhatsApp outreach with human approval
- [ ] Conversation inbox

### AI phase 3
- [ ] Voice interview agent + R2 storage + transcript
- [ ] Writing agent + editor

### Polish
- [ ] Full pipeline kanban
- [ ] Agent prompt configuration
- [ ] Newsletter handoff from publish view

---

## Open questions

1. Football data source and update frequency?
2. Single journalist or team — assignment model?
3. WhatsApp: Business API approval timeline and phone number?
4. Voice: Twilio Media Streams vs. native OpenAI phone integration?
5. Interview consent workflow (GDPR + recording laws)?
6. Can data-only stories skip stages 3–4?
7. Eve.dev link in user message — is Eve intended for voice/orchestration? ([eve.dev docs](https://eve.dev/docs/introduction))
