# Changelog

All notable changes to the Marketing Campaign Agent project.

---

## 2026-05-06 — Sprint 5: Observability + Safety

### Audit Log

- Added `audit_logs` table (append-only, no foreign key constraints so audit writes never fail in error paths).
- Events wired: `campaign.created`, `job.enqueued`, `job.started`, `job.succeeded`, `job.failed`, `job.cancelled`, `node.completed`, `human.approved`, `export.downloaded`.
- `src/lib/audit/events.ts` — typed event names.
- `src/lib/audit/logger.ts` — INSERT-only `writeAuditEvent(db, input)` function.

### Structured Logger

- `src/lib/logging/logger.ts` — zero-dependency JSON-line logger (`logger.info/warn/error/debug`).
- Worker emits structured logs for `worker.starting`, `worker.ready`, `job.started`, `job.succeeded`, `job.failed`, `job.skipped.cancelled` with `jobId`, `campaignId`, `type`, `latencyMs`.

### Sentry

- Installed `@sentry/node`.
- `src/lib/observability/sentry.ts` — `initSentry()` reads `SENTRY_DSN` env var (no-op if unset), `captureException(error, context)` wraps Sentry scope.
- Worker calls `initSentry()` on startup; job failures call `captureException` with job context.

### Token + Cost Tracking

- `src/lib/llm/usage-context.ts` — `AsyncLocalStorage`-based accumulator. `runWithUsageTracking(fn)` wraps any async call tree; `recordApiUsage(usage)` is called inside `completeJsonPrompt` / `completeChatPrompt` automatically — no threading required.
- `estimateCostUsd(usage, model)` uses a built-in rate table (DeepSeek default: $0.27/M input, $1.10/M output). Overridable via `MODEL_COST_INPUT_PER_M` / `MODEL_COST_OUTPUT_PER_M` env vars.
- `agent_runs` table: added `prompt_tokens`, `completion_tokens`, `total_tokens`, `estimated_cost_usd` columns.
- `completeRun` updated to persist token and cost data.
- `generateStrategyHandler` and `generateModuleHandler` wrap execution in `runWithUsageTracking` and store results on run completion.

### Admin Job Controls

- `src/lib/jobs/repository.ts` — `cancelAgentJob(db, jobId)`: marks `queued` or `running` jobs as `cancelled`. Worker skips cancelled jobs on pickup.
- `src/server/admin/jobs.ts` — three server functions:
  - `adminListJobsFn` — list all jobs for a campaign.
  - `adminRetryJobFn` — creates a new job from a failed job's params (preserves failed job for audit).
  - `adminCancelJobFn` — cancels job + writes `job.cancelled` audit event.

### Database Migration

- `drizzle/0002_brown_inhumans.sql` — adds `audit_logs` table and token columns to `agent_runs`.

### Documentation

- `docs/operations.md` — manual + automated backup, 30-day retention, restore steps, PITR note, structured log reference, audit query examples, token cost config, admin control usage.

### Files Created

- `src/lib/audit/events.ts`
- `src/lib/audit/logger.ts`
- `src/lib/logging/logger.ts`
- `src/lib/observability/sentry.ts`
- `src/lib/llm/usage-context.ts`
- `src/server/admin/jobs.ts`
- `docs/operations.md`
- `drizzle/0002_brown_inhumans.sql`

---

## 2026-05-04 — Frontend Visibility + Backend Bugfixes

### Frontend

- **Workflow state indicator:** Colored state pill below status banners showing current campaign state (green for approved/exported, amber for review_pending, muted for draft).
- **Chat message type badges:** Refinement messages show amber "Refinement" badge, system events show dim "System" badge. Visual distinction for different message types.
- **Module status in workbench:** Generated modules show active style + ✓ checkmark. New modules appear as default buttons.
- **ReviewPanel for exported state:** QC reviews remain visible after export (read-only, no approve/reject buttons). Updated description text for exported campaigns.
- **Source panel + chat refresh:** Both components now accept `refreshToken` prop and re-fetch data after strategy/module generation and export events.

### Backend Bugfixes

- **Export lockout fix:** Export buttons were permanently disabled after first export (`workflowState` became `"exported"`, check was `=== "approved"` only). Fixed both backend (`recordExportHandler`) and UI (`ExportActions`) to accept `"exported"` state for re-export.
- **Refinement regex fix:** Overzealous pattern `for\s+[a-z0-9 -]+\s+buyers` caused false refinement triggers on questions like "What is the strategy for b2b buyers?". Tightened to require action verbs: `rewrite this`, `refine this`, `make this more`, `turn this into`.
- **Zero-module refinement fix:** When no modules exist, asking "refine this" returned `ambiguous` and prompted "Which module should I refine?". Now returns `none` and falls through to generic chat.
- **Chat memory fix:** LLM treated every message as standalone (no conversation history). Now fetches last 20 messages and passes them as the `messages` array to the LLM API.
- **Exported state regression fix:** Re-generating a module on an already-exported campaign would reset state from `exported` to `approved`. Now preserves `exported` state when QC passes.

### Database

- Applied pending `0001_qc_reviews` migration to local SQLite database. The migration SQL existed but was never applied to `local.db`, causing `no such table: qc_reviews` errors on module generation.

### Files Changed

- `src/routes/index.tsx` — state pill, generatedKinds tracking, refreshToken wiring
- `src/components/CampaignChat.tsx` — message type badges, refreshToken prop
- `src/components/ModuleWorkbench.tsx` — generatedKinds prop, active button style
- `src/components/ReviewPanel.tsx` — exported state visibility
- `src/components/SourcePanel.tsx` — refreshToken prop
- `src/components/ExportActions.tsx` — exported state acceptance
- `src/lib/workflow/campaign-orchestrator.ts` — 5 bugfixes (export lockout, regex, zero-module, chat memory, state regression)
- `src/lib/workflow/campaign-orchestrator.test.ts` — updated test for tightened regex
- `src/styles.css` — state pill, chat badges, active button styles

---

## 2026-05-03 — Roadmap Completion (Tasks 7-12)

### Export History + Exported Transition (Task 7)

- `getExportEventsHandler` — fetches export events for a campaign.
- `recordExportHandler` — records export event, transitions campaign to `exported` state. Rate-limited.
- `ExportActions` component — Markdown/JSON download buttons + export history list.
- `getExportEventsFn` / `recordExportFn` server functions with rate limiting.
- Backend enforces approved-only export gate (must be `approved` or `exported`).

### Structured MCP Source Metadata (Task 8)

- `generateStrategyHandler` now persists MCP results into `mcp_sources` with structured fields: `sourceUrl`, `title`, `snippet`, `confidence`, `usedIn` (JSON array), `runId`.
- `SourcePanel` component renders source metadata with tool attribution, confidence %, URL links.

### Chat Refinement Loop (Task 9)

- `chatHandler` in `campaign-orchestrator.ts` — full chat refinement implementation:
  - `isRefinementIntent` regex detects refinement requests.
  - `resolveRefinementTarget` resolves target module (single → auto, named → target, ambiguous → clarification).
  - Creates generation run logs for refinement attempts.
  - Calls `refineCampaignOutput` for targeted refinements.
  - Updates module via `upsertModule`.
  - Saves assistant messages with `messageType: "refinement"`, `moduleId`, `runId`.
  - Failed refinements create failed run logs and return error messages.

### Legacy Raw API Cleanup (Task 10)

- Removed `generateStrategy`, `generateModule`, `refineOutput` from `src/server/campaign.ts`.
- Route uses only ID-based functions: `generateStrategyByCampaignId`, `generateModuleByCampaignId`.

### Cross-Feature Integration Tests + Docs Sync (Task 11)

- Lifecycle integration test: strategy → sources → module → QC approval → export → chat refinement with full audit trail.
- Updated `docs/tech-stack.md` with deferred scope section, ownership boundaries, source metadata docs.
- Fixed `.env.example` (removed `OPENAI_FALLBACK_MODEL` placeholder, added `DATABASE_URL`).

### Final Roadmap Evidence (Task 12)

- Created `.sisyphus/evidence/roadmap-completion-summary.md` with gap → file → evidence mapping.

### Files Created

- `src/components/CampaignChat.tsx`
- `src/components/SourcePanel.tsx`
- `src/components/ExportActions.tsx`
- `src/components/ReviewPanel.tsx`

### Verification

- 94 tests pass (14 files)
- TypeScript typecheck clean
- Production build succeeds

---

## 2026-05-02 — Direct DeepSeek + Custom Agents + MCP Runtime

### Major Architecture Change

- Replaced Cursor SDK (`@cursor/sdk`) with direct DeepSeek/OpenAI-compatible LLM calls.
- Implemented custom TypeScript subagent layer: market researcher, positioning strategist, social copywriter, creative director.
- Implemented MCP client runtime using `@modelcontextprotocol/client` with stdio transport.
- Created `src/lib/llm/client.ts` — OpenAI-compatible client with JSON completion, config, and recovery.
- Created `src/lib/mcp/config.ts` + `src/lib/mcp/runtime.ts` — MCP stdio server connection, tool listing, research tool calling.
- Created `src/lib/agents/` — orchestrator and 4 subagents with typed input/output contracts.
- Deleted `src/lib/cursor/` — removed Cursor-specific agent factory and model check.

### Persistence Layer

- Added SQLite + Drizzle ORM with migrations.
- Created `src/lib/db/client.ts` — database connection, test DB factory, migration runner.
- Created `src/lib/db/schema.ts` — Drizzle table definitions for all 9 tables.
- Created `src/lib/db/repositories/` — typed query functions for campaigns, modules, strategies, runs, sources, messages, exports, QC reviews.
- Migration `0000_noisy_rage` — core tables (users, campaigns, strategies, modules, runs, sources, messages, exports).
- Migration `0001_qc_reviews` — QC review storage.

### QC Review System

- 5 parallel QC reviewers: brand safety, claim verification, platform compliance, tone consistency, conversion.
- `src/lib/agents/qc/` — each reviewer as a typed function.
- QC results persisted to `qc_reviews` table with verdict, issues, suggested edits, confidence.
- Auto-approve on all-pass; `review_pending` on warn/fail.

### Workflow State Machine

- `src/lib/workflow/campaign-state.ts` — FSM with 7 states and 8 events.
- `src/lib/workflow/campaign-orchestrator.ts` — all workflow handler functions.

### Server Functions

- `src/server/campaign.ts` — model config check.
- `src/server/campaigns.ts` — create, get, list campaigns.
- `src/server/modules.ts` — generate strategy, generate module, refine, QC approve/reject, get QC reviews.
- `src/server/runs.ts` — sources, export events, chat messages.

---

## 2026-04-30 — Initial Project

### Foundation

- TanStack Start + React + Vite + TypeScript project setup.
- Campaign brief form (8 fields) with Zod validation.
- Strategy Core generation via Cursor SDK.
- Module generation for X, LinkedIn, Instagram, Calendar, Creative.
- Markdown and JSON client-side export.
- Dark editorial CSS theme (Fraunces + Space Mono).
- `src/lib/campaign/types.ts` — shared TypeScript types.
- `src/lib/campaign/schemas.ts` — Zod schemas for LLM output validation.
- `src/lib/campaign/prompts.ts` — prompt builders.
- `src/lib/campaign/export.ts` — Markdown/JSON export helpers.
