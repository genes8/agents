import { sql } from "drizzle-orm";
import { getDb } from "../lib/db/client";
import { getJobQueue } from "../lib/jobs/queue";

type ServiceStatus = "ok" | "error";

export type SystemHealth = {
  status: "ok" | "degraded";
  services: {
    web: ServiceStatus;
    db: ServiceStatus;
    queue: ServiceStatus;
  };
  timestamp: string;
};

export async function getSystemHealth(): Promise<SystemHealth> {
  const services: SystemHealth["services"] = {
    web: "ok",
    db: "error",
    queue: "error",
  };

  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    services.db = "ok";
  } catch {
    services.db = "error";
  }

  try {
    const boss = await getJobQueue();
    const installed = await boss.isInstalled();
    const version = await boss.schemaVersion();
    services.queue = installed && version !== null ? "ok" : "error";
  } catch {
    services.queue = "error";
  }

  return {
    status: services.db === "ok" && services.queue === "ok" ? "ok" : "degraded",
    services,
    timestamp: new Date().toISOString(),
  };
}
