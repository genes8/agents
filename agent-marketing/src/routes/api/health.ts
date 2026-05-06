import { createFileRoute } from "@tanstack/react-router";
import { getSystemHealth } from "../../server/health";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const health = await getSystemHealth();
        const status = health.status === "ok" ? 200 : 503;

        return Response.json(health, { status });
      },
    },
  },
});
