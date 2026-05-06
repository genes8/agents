import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adminListAllJobsFn, adminRetryJobFn, adminCancelJobFn } from "../server/admin/jobs";
import type { AgentJob, AgentJobStatus } from "../lib/jobs/types";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const STATUS_CLASS: Record<AgentJobStatus, string> = {
  queued: "qc-badge qc-badge--warn",
  running: "qc-badge qc-badge--warn",
  succeeded: "qc-badge qc-badge--pass",
  failed: "qc-badge qc-badge--fail",
  cancelled: "qc-badge",
};

function AdminPage() {
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const rows = await adminListAllJobsFn();
      setJobs(rows as AgentJob[]);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleRetry(jobId: string) {
    setStatus("Retrying...");
    setError("");
    try {
      await adminRetryJobFn({ data: { jobId } });
      setStatus("Job retried.");
      await load();
    } catch (e) {
      setError((e as Error).message);
      setStatus("");
    }
  }

  async function handleCancel(jobId: string) {
    setStatus("Cancelling...");
    setError("");
    try {
      await adminCancelJobFn({ data: { jobId } });
      setStatus("Job cancelled.");
      await load();
    } catch (e) {
      setError((e as Error).message);
      setStatus("");
    }
  }

  return (
    <main className="page-shell">
      <header className="hero-panel">
        <p className="eyebrow">Operations</p>
        <h1>Job Admin</h1>
        <p>Monitor and manage agent jobs. Last 100 jobs, newest first.</p>
      </header>

      {status && <div className="status-banner">{status}</div>}
      {error && <div className="error-banner">{error}</div>}

      <button className="secondary-button" onClick={() => void load()} type="button">
        Refresh
      </button>

      <div style={{ marginTop: "14px", display: "grid", gap: "8px" }}>
        {jobs.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.77rem" }}>No jobs found.</p>
        ) : (
          jobs.map((job) => (
            <div className="output-card" key={job.id}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ display: "grid", gap: "4px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={STATUS_CLASS[job.status]}>{job.status}</span>
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)" }}>
                      {job.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.66rem", color: "var(--text-muted)", margin: 0 }}>
                    Campaign: <code style={{ color: "var(--text)" }}>{job.campaignId.slice(0, 8)}…</code>
                    {" · "}
                    Attempts: {job.attempts}
                    {" · "}
                    {new Date(job.createdAt).toLocaleString()}
                  </p>
                  {job.error && (
                    <p style={{ fontSize: "0.66rem", color: "var(--err-text)", margin: 0 }}>
                      {job.error.message}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  {job.status === "failed" && (
                    <button className="secondary-button" onClick={() => void handleRetry(job.id)} type="button">
                      Retry
                    </button>
                  )}
                  {(job.status === "queued" || job.status === "running") && (
                    <button className="secondary-button" onClick={() => void handleCancel(job.id)} type="button">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
