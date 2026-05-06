# Marketing Agent Production Roadmap

> **Status:** Planned  
> **Decision:** Continue with the existing custom TypeScript orchestrator. Do **not** add LangGraph in this production hardening track.  
> **Goal:** Move the marketing agent from a blocking MVP runtime to a production-ready architecture with Postgres, async jobs, separated workers, deployable infrastructure, and observability.

---

## Guiding Principles

- Keep changes incremental and verifiable.
- Do not rewrite the agent from scratch.
- Keep the current custom orchestrator unless workflow complexity clearly requires a graph framework later.
- Each sprint must leave the app in a working state.
- Prefer simple production primitives first: Postgres, job queue, worker process, Docker deployment.

---

## Sprint Status Summary

| Sprint | Name | Status | Deliverable |
|---|---|---|---|
| 1 | Postgres foundation | Complete | App runs on Postgres, still blocking |
| 2 | Job model + queue | Complete | User click returns immediately, job runs async |
| 3 | Worker extraction | Complete | Web and worker are separate processes |
| 4 | Production deployment | Ready for staging | Staging production-like environment |
| 5 | Observability + safety | Not started | Real production-readiness |

---

## Sprint 1 — Postgres Foundation

**Objective:** Replace SQLite production persistence with Postgres while keeping the current blocking runtime intact.

### Tasks

- [x] Add Postgres dependencies.
- [x] Convert Drizzle schema from SQLite to Postgres.
- [x] Update `src/lib/db/client.ts`.
- [x] Update `drizzle.config.ts`.
- [x] Update repository tests.
- [x] Run migration locally against Postgres. Docker CLI is installed, but Docker daemon was not running locally, so verification used the available local Postgres service on `localhost:5432`.

### Expected File Areas

- `package.json`
- `drizzle.config.ts`
- `src/lib/db/client.ts`
- `src/lib/db/schema.ts`
- `src/lib/db/repositories/*.ts`
- `src/lib/db/repositories/*.test.ts`
- `drizzle/`

### Acceptance Criteria

- [x] `better-sqlite3` is no longer a direct production runtime dependency.
- [x] Drizzle uses Postgres dialect.
- [x] `DATABASE_URL` points to Postgres.
- [x] Migrations run successfully against local Postgres.
- [x] Repository tests pass.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.

### Deliverable

The app works with Postgres and keeps the current blocking request/response behavior.

---

## Sprint 2 — Job Model + Queue

**Objective:** Introduce async job tracking and queueing while keeping execution initially compatible with existing workflow logic.

### Tasks

- [x] Add `agent_jobs` table.
- [x] Add `src/lib/jobs/*`.
- [x] Add `pg-boss` setup.
- [x] Change generate server functions to enqueue jobs.
- [x] Add job status server function.
- [x] Add UI polling.

### Expected File Areas

- `src/lib/db/schema.ts`
- `src/lib/jobs/types.ts`
- `src/lib/jobs/queue.ts`
- `src/lib/jobs/repository.ts`
- `src/lib/jobs/handlers.ts`
- `src/server/modules.ts`
- `src/server/runs.ts`
- `src/routes/index.tsx`
- `src/components/*`

### Job Types

- `generate_strategy`
- `generate_module`
- `refine_module`
- `chat_refine`

### Job States

- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`

### Acceptance Criteria

- [x] Generate Strategy returns a `jobId` immediately.
- [x] Generate Module returns a `jobId` immediately.
- [x] Job status can be queried by the UI.
- [x] UI displays queued/running/succeeded/failed states.
- [x] Successful job refreshes campaign workspace.
- [x] Failed job surfaces a user-readable error.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.

### Deliverable

The user click returns immediately, and the job runs asynchronously.

---

## Sprint 3 — Worker Extraction

**Objective:** Move long-running agent execution out of the web server and into a separate worker process.

### Tasks

- [x] Create `src/worker/index.ts`.
- [x] Move long-running orchestration into worker handlers.
- [x] Split `campaign-orchestrator.ts` into workflow nodes.
- [x] Add job progress updates.
- [x] Add retry/failure behavior.

### Expected File Areas

- `src/worker/index.ts`
- `src/lib/jobs/processing.ts`
- `src/lib/jobs/queue.ts`
- `src/lib/workflow/nodes/*`
- `src/lib/workflow/campaign-orchestrator.ts`
- `package.json`
- `tsconfig.worker.json`

### Workflow Node Candidates

- `generate-strategy-node`
- `generate-module-node`
- `run-qc-node`
- `refine-module-node`
- `chat-node`
- `state-transition-node`

### Acceptance Criteria

- [x] Web process does not execute long-running LLM generation directly.
- [x] Worker process can run jobs independently.
- [x] Restarting the web process does not kill active worker execution.
- [x] Job progress is persisted.
- [x] Failed jobs are marked as failed with structured error details.
- [x] Retry behavior is deterministic and bounded.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.

### Deliverable

The web server and worker are separate processes.

---

## Sprint 4 — Production Deployment

**Objective:** Package and deploy the app into a production-like staging environment.

### Tasks

- [x] Add `Dockerfile`.
- [x] Add `docker-compose.production.yml`.
- [x] Add Caddy or Nginx config.
- [x] Add migration-on-deploy step.
- [x] Add system health endpoint.
- [ ] Deploy to Hetzner staging.

### Expected File Areas

- `Dockerfile`
- `docker-compose.production.yml`
- `Caddyfile` or `nginx.conf`
- `scripts/migrate-prod.ts` or equivalent migration command
- `src/server/health.ts`
- `.env.production.example`
- `docs/deployment.md`

### Acceptance Criteria

- [x] Web container starts successfully.
- [x] Worker container starts successfully.
- [x] Postgres container or managed Postgres is reachable.
- [x] Migrations run during deploy or as a documented deploy step.
- [ ] HTTPS reverse proxy works.
- [x] Health endpoint reports web, DB, and queue status.
- [ ] Staging URL can generate a campaign end-to-end.

### Deliverable

A production-like staging environment is running on Hetzner.

---

## Sprint 5 — Observability + Safety

**Objective:** Add the operational controls needed for real production usage.

### Tasks

- [ ] Add `audit_logs` table.
- [ ] Add structured logger.
- [ ] Add Sentry.
- [ ] Add model token/cost tracking.
- [ ] Add admin job retry/cancel controls.
- [ ] Add backups.

### Expected File Areas

- `src/lib/db/schema.ts`
- `src/lib/audit/*`
- `src/lib/logging/*`
- `src/lib/observability/*`
- `src/lib/jobs/*`
- `src/server/admin/*`
- `docs/operations.md`

### Audit Event Candidates

- `campaign.created`
- `job.enqueued`
- `job.started`
- `node.started`
- `node.completed`
- `qc.completed`
- `human.approved`
- `export.downloaded`
- `job.failed`
- `job.cancelled`

### Acceptance Criteria

- [ ] Audit events are append-only.
- [ ] Worker logs include job ID, campaign ID, node name, and latency.
- [ ] LLM token usage is stored when provider returns usage data.
- [ ] Estimated model cost is visible in run metadata.
- [ ] Admin can retry failed jobs.
- [ ] Admin can cancel queued/running jobs where supported.
- [ ] Backups are configured and restore process is documented.

### Deliverable

The system has production-grade observability, auditability, and operational controls.

---

## Current Production Risks To Remove

- [ ] Blocking server functions for long-running LLM calls.
- [x] SQLite local file as production database.
- [ ] No job queue.
- [ ] No separate worker process.
- [ ] No durable job progress model.
- [ ] No retry/cancel semantics.
- [ ] Limited operational observability.
- [ ] No production deployment manifest.
- [ ] No backup/restore process.

---

## Verification Policy

Before marking any sprint complete:

- [ ] Relevant unit/integration tests pass.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] Manual smoke test for the sprint deliverable passes.
- [ ] This roadmap file is updated with completed tasks and notes.

---

## Notes

- LangGraph is intentionally excluded from this track.
- If workflow complexity later grows beyond the custom orchestrator, revisit graph/checkpoint frameworks as a separate architecture decision.
- Keep each sprint independently shippable.
