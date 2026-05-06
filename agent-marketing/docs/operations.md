# Operations Guide

## Database Backups

### Configuration

Backups are managed via `pg_dump` on a cron schedule. Set the following environment variable:

```
DATABASE_URL=postgres://user:pass@host:5432/dbname
```

### Manual Backup

```bash
pg_dump "$DATABASE_URL" --format=custom --no-acl --no-owner -f "backup-$(date +%Y%m%d-%H%M%S).dump"
```

### Automated Backup (daily at 02:00 UTC)

Add to crontab on the backup host or a CI schedule:

```cron
0 2 * * * pg_dump "$DATABASE_URL" --format=custom --no-acl --no-owner -f "/backups/agent-marketing-$(date +\%Y\%m\%d).dump" && find /backups -name "*.dump" -mtime +30 -delete
```

This keeps 30 days of daily backups.

### Restore Process

1. Stop the worker and web processes to prevent writes during restore.
2. Restore into a fresh database:
   ```bash
   createdb agent_marketing_restore
   pg_restore --dbname=agent_marketing_restore --no-acl --no-owner backup-20260101-020000.dump
   ```
3. Verify row counts:
   ```sql
   SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables ORDER BY tablename;
   ```
4. Point `DATABASE_URL` at the restored database and restart services.
5. Run migrations to ensure schema is current:
   ```bash
   npm run db:migrate
   ```

### Point-in-Time Recovery (PITR)

For managed Postgres (Supabase, RDS, Neon), enable continuous WAL archiving in the provider console. This allows restoring to any second within the retention window.

---

## Observability

### Structured Logs

All worker logs emit JSON lines to stdout:

```json
{ "level": "info", "message": "job.started", "ts": "2026-05-06T21:00:00.000Z", "jobId": "...", "campaignId": "...", "type": "generate_strategy" }
```

Key log messages:

| Message | Fields |
|---|---|
| `worker.starting` | — |
| `worker.ready` | — |
| `job.started` | `jobId`, `campaignId`, `type` |
| `job.succeeded` | `jobId`, `campaignId`, `type`, `latencyMs` |
| `job.failed` | `jobId`, `campaignId`, `type`, `latencyMs`, `error` |
| `job.skipped.cancelled` | `jobId`, `campaignId` |

Ingest into Datadog, Loki, or CloudWatch by piping worker stdout.

### Sentry

Set `SENTRY_DSN` to enable error capture. Exceptions in job processing are captured with `jobId`, `campaignId`, and `type` as context.

```
SENTRY_DSN=https://xxx@o0.ingest.sentry.io/0
```

### Audit Log

All state-changing actions write append-only rows to `audit_logs`. No rows are ever updated or deleted.

Query recent events for a campaign:

```sql
SELECT event, user_id, job_id, run_id, meta, created_at
FROM audit_logs
WHERE campaign_id = 'your-campaign-id'
ORDER BY created_at DESC
LIMIT 50;
```

Audited events: `campaign.created`, `job.enqueued`, `job.started`, `job.succeeded`, `job.failed`, `job.cancelled`, `node.completed`, `human.approved`, `export.downloaded`.

### Token Usage & Cost

Token counts and estimated cost are stored on `agent_runs` after each LLM call:

```sql
SELECT node_name, model, total_tokens, estimated_cost_usd, latency_ms
FROM agent_runs
WHERE campaign_id = 'your-campaign-id'
ORDER BY created_at DESC;
```

Cost rates default to DeepSeek pricing ($0.27/M input, $1.10/M output). Override via:

```
MODEL_COST_INPUT_PER_M=0.27
MODEL_COST_OUTPUT_PER_M=1.10
```

---

## Admin Job Controls

### Retry a Failed Job

Use the `adminRetryJobFn` server function (or call directly):

```ts
await adminRetryJobFn({ jobId: "..." });
```

This creates a new job with the same parameters, preserving the failed job for audit.

### Cancel a Queued or Running Job

```ts
await adminCancelJobFn({ jobId: "..." });
```

- **Queued jobs**: marked `cancelled` immediately; the worker skips them on pickup.
- **Running jobs**: marked `cancelled` in the DB; the current execution completes but no retry occurs.

Cancellation is recorded in `audit_logs` with event `job.cancelled`.
