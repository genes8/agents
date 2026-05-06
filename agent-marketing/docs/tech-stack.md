# Tech Stack

## Application Stack

- **Frontend / full-stack framework:** TanStack Start
- **Router:** TanStack Router
- **Build tool / dev server:** Vite
- **UI library:** React
- **Language:** TypeScript
- **Runtime validation:** Zod v4
- **Styling:** Global CSS (`src/styles.css`) — dark editorial theme with Fraunces + Space Mono
- **State management:** Persisted Postgres/Drizzle campaign state + React presentation state in `routes/index.tsx`
- **Testing:** Vitest (environment: node) — 94 tests across 14 files

## AI / Agent Stack

- **LLM client:** OpenAI JavaScript/TypeScript SDK (`openai`)
- **Primary LLM provider:** DeepSeek through an OpenAI-compatible API
- **Base URL:** `OPENAI_BASE_URL`, falling back to `https://api.deepseek.com/v1`
- **Model:** `OPENAI_DEFAULT_MODEL`, falling back in code to `deepseek-v4-flash`
- **Output shape:** JSON chat completions parsed and validated with Zod schemas
- **LLM recovery:** `completeStructuredPromptWithRecovery` — fixed auto-repair loop (one JSON repair pass, one schema-correction pass) before surfacing errors; optional fallback is only available as a code-level function option, not an env var
- **Agent orchestration:** Custom in-repo TypeScript orchestrator with function-based subagents
- **Campaign workflow:** Hand-written FSM (`CampaignWorkflowState` + `CampaignEvent`) in `src/lib/workflow/campaign-state.ts`

## Subagents

- **Market researcher:** Builds research context and audience/category insights.
- **Positioning strategist:** Converts research into ICP, positioning, pain points, messaging pillars, and hooks.
- **Social copywriter:** Generates platform-native copy for X, LinkedIn, Instagram, and content calendars.
- **Creative director:** Generates creative direction, carousel outlines, visual briefs, and image prompts.
- **QC reviewers (×5):** Brand safety, claim verification, platform compliance, tone consistency, conversion — run in parallel after module generation; results persisted to `qc_reviews` table.

## MCP Runtime

- **MCP client package:** `@modelcontextprotocol/client`
- **Transport:** stdio MCP servers
- **Configuration:** `MCP_STDIO_SERVERS` env var (JSON array of server configs)
- **Purpose:** Optional research/search/scraping-style tool context before LLM generation.
- **Source persistence:** MCP tool results are persisted to `mcp_sources` with URL, title, snippet, confidence, `usedIn`, run linkage, and tool attribution when provided by the MCP result.

## Persistence

- **Database:** Postgres via `postgres` (`postgres-js`)
- **ORM:** Drizzle ORM (`drizzle-orm/postgres-js`)
- **Migrations:** Drizzle Kit Postgres migrations in `drizzle/`
- **Schema tables:** `users`, `campaigns`, `campaign_strategies`, `campaign_modules`, `agent_runs`, `mcp_sources`, `campaign_messages`, `export_events`, `qc_reviews`
- **Single-user MVP:** `DEFAULT_USER_ID = "default-user"` in `src/lib/db/client.ts`; server handlers verify campaign ownership before exposing sources, QC reviews, messages, or export events
- **Auth boundary:** `src/lib/auth/user.ts` — real login providers such as Clerk/Auth0/Lucia are deferred and can replace `getCurrentUserId()` later
- **Rate-limit hook:** `src/lib/hooks/rate-limit.ts` — no-op in MVP; plug in Upstash/Redis without changing server function signatures

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | — | DeepSeek (or OpenAI) API key (required) |
| `OPENAI_BASE_URL` | `https://api.deepseek.com/v1` | LLM API base URL |
| `OPENAI_DEFAULT_MODEL` | `deepseek-v4-flash` | Primary model name |
| `OPENAI_TEMPERATURE` | `0.7` | LLM sampling temperature |
| `OPENAI_MAX_TOKENS` | `4096` | Max tokens per LLM call |
| `DATABASE_URL` | — | Postgres connection string |
| `TEST_DATABASE_URL` | `DATABASE_URL` | Postgres connection string used by repository tests |
| `MCP_STDIO_SERVERS` | — | JSON array of stdio MCP server configs |

## Workflow State Machine

Campaigns follow a strict FSM with these states:

| State | Description | Transition Trigger |
|---|---|---|
| `draft_brief` | Campaign created, brief saved | User generates strategy |
| `research_ready` | MCP research completed | Strategy generation starts |
| `strategy_ready` | Strategy generated | Module generation requested |
| `modules_ready` | Module(s) generated | QC reviewers complete |
| `review_pending` | QC found warn/fail issues | User approves or rejects |
| `approved` | All QC checks passed or user approved | User exports |
| `exported` | Campaign exported (Markdown/JSON) | Re-export allowed |

State transitions are enforced by `CampaignWorkflowState` + `CampaignEvent` in `src/lib/workflow/campaign-state.ts`. Re-generating a module on an `exported` campaign preserves the `exported` state (no regression).

## QC Review Flow

1. After every module generation, 5 QC reviewers run in parallel: brand safety, claim verifier, platform compliance, tone consistency, conversion.
2. Each reviewer returns a verdict: `pass`, `warn`, or `fail`.
3. If all pass → campaign auto-approves → `approved` state.
4. If any warn or fail → `review_pending` state → user sees review panel with Approve/Request Revisions buttons.
5. Reviews are persisted to `qc_reviews` with reviewer name, verdict, issues, suggested edits, confidence, and linked source IDs.
6. Reviews remain visible after export (read-only in `exported` state).

## Chat + Refinement

- **Chat handler:** `chatHandler` in `campaign-orchestrator.ts` — accepts freeform user messages, maintains conversation history (last 20 messages passed to LLM for context).
- **Refinement intent detection:** Regex-based (`isRefinementIntent`) — triggers on phrases like "make this more", "rewrite this", "refine this", "turn this into". Does NOT trigger on questions or passive mentions.
- **Target resolution:** `resolveRefinementTarget` — single module → auto-target, named module → target, ambiguous → clarification question, zero modules → falls through to generic chat.
- **Message types:** `chat` (generic), `refinement` (module update), `system_event` — displayed with visual badges in the UI.
- **Failed refinements:** Create a failed run log and return an assistant error message.

## Exports

- Browser-side Markdown and JSON downloads from the Export panel (gated behind QC approval or exported state).
- Approved exports are recorded in `export_events` with campaign ID, trusted user ID, format, and timestamp; recording an export transitions the campaign to `exported` and the UI displays export history.
- Re-export is allowed from `exported` state (both backend and UI accept `exported` as a valid export state).
- Rate-limited via `checkRateLimit` on the `recordExportFn` server function.

## Frontend Components

| Component | File | Purpose |
|---|---|---|
| `BriefForm` | `src/components/BriefForm.tsx` | Step 1 — startup brief form (sticky sidebar) |
| `StrategyPanel` | `src/components/StrategyPanel.tsx` | Step 2 — renders strategy core (ICP, positioning, pain points, hooks, channel strategy) |
| `ModuleWorkbench` | `src/components/ModuleWorkbench.tsx` | Step 3 — module generation buttons + generated output cards; marks already-generated modules with active style + ✓ |
| `ReviewPanel` | `src/components/ReviewPanel.tsx` | QC review display with verdict badge, reviewer cards, issues list, suggested edits, approve/reject buttons; visible for `review_pending`, `approved`, and `exported` (read-only) states |
| `CampaignChat` | `src/components/CampaignChat.tsx` | Chat interface with message history, type badges (refinement/system), Enter-to-send |
| `SourcePanel` | `src/components/SourcePanel.tsx` | MCP source display with tool attribution, confidence %, title, snippet, URL |
| `ExportActions` | `src/components/ExportActions.tsx` | Markdown/JSON download buttons + export history list |
| `CampaignHistory` | `src/components/CampaignHistory.tsx` | Sidebar list of past campaigns with workflow state labels |

All components refresh after key actions (strategy generation, module generation, export) via a shared `refreshToken` counter.

## Backend Shape

The app does not run a separate Express/Fastify/Nest server. TanStack Start provides server-side functions inside the same full-stack application. Backend entry points live in `src/server/` and call the campaign orchestrator, which coordinates: DB repositories, LLM client, QC reviewers, MCP runtime, and FSM state transitions.

**Server function files:**

- `src/server/campaign.ts` — model config check only
- `src/server/campaigns.ts` — create, get, list campaigns
- `src/server/modules.ts` — generate strategy, generate module, refine, QC approve/reject
- `src/server/runs.ts` — sources, export events, chat messages

**Workflow orchestrator:**

- `src/lib/workflow/campaign-orchestrator.ts` — all handler functions (create, get, list, generate strategy, generate module, refine module, QC approve/reject, chat, get messages, get sources, record export, get export events)
- `src/lib/workflow/campaign-state.ts` — FSM transitions and validation

## Deferred Scope

- Real login, teams, billing, publishing/scheduling integrations, brand kits, reusable templates, and LangGraph-style orchestration are intentionally deferred and are not part of the implemented MVP.
- Run history UI (generation run logs with latency, status, state transitions) — server functions and DB table exist but no UI component yet.
- Module-level QC drill-down — reviews shown at campaign level; per-module filtering is nice-to-have.
- Real-time updates — no WebSocket/SSE infrastructure; UI refreshes via `refreshToken` prop pattern.
