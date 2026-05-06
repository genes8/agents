import { beforeEach, describe, expect, it, vi } from "vitest";
import * as dbClient from "../lib/db/client";
import * as queueModule from "../lib/jobs/queue";
import { getSystemHealth } from "./health";

describe("system health", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("reports healthy web, db, and queue status", async () => {
    vi.spyOn(dbClient, "getDb").mockReturnValue({ execute: vi.fn().mockResolvedValue([]) } as never);
    vi.spyOn(queueModule, "getJobQueue").mockResolvedValue({
      isInstalled: vi.fn().mockResolvedValue(true),
      schemaVersion: vi.fn().mockResolvedValue(1),
    } as never);

    const health = await getSystemHealth();

    expect(health.status).toBe("ok");
    expect(health.services.web).toBe("ok");
    expect(health.services.db).toBe("ok");
    expect(health.services.queue).toBe("ok");
  });

  it("degrades when queue is unavailable", async () => {
    vi.spyOn(dbClient, "getDb").mockReturnValue({ execute: vi.fn().mockResolvedValue([]) } as never);
    vi.spyOn(queueModule, "getJobQueue").mockRejectedValue(new Error("queue unavailable"));

    const health = await getSystemHealth();

    expect(health.status).toBe("degraded");
    expect(health.services.db).toBe("ok");
    expect(health.services.queue).toBe("error");
  });
});
