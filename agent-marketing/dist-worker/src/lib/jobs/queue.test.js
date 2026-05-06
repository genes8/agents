import { describe, expect, it, vi } from "vitest";
import { registerJobWorkers } from "./queue";
describe("job queue worker registration", () => {
    it("registers workers for strategy and module queues", async () => {
        const callbacks = [];
        const boss = {
            createQueue: vi.fn().mockResolvedValue(undefined),
            work: vi.fn().mockImplementation(async (_name, handler) => {
                callbacks.push(handler);
                return "worker-id";
            }),
        };
        const process = vi.fn().mockResolvedValue(undefined);
        await registerJobWorkers(boss, process);
        expect(boss.createQueue).toHaveBeenCalledTimes(2);
        expect(boss.work).toHaveBeenCalledTimes(2);
        await callbacks[0]([{ data: { agentJobId: "job-1" } }]);
        expect(process).toHaveBeenCalledWith("job-1");
    });
});
