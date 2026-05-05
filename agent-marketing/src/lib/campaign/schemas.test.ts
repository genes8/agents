import { describe, it, expect } from "vitest";
import { CampaignWorkflowStateSchema, CampaignEventSchema } from "./schemas";

describe("CampaignWorkflowStateSchema", () => {
  it("accepts all supported states", () => {
    const states = [
      "draft_brief",
      "research_ready",
      "strategy_ready",
      "modules_ready",
      "review_pending",
      "approved",
      "exported",
    ] as const;

    for (const state of states) {
      expect(CampaignWorkflowStateSchema.parse(state)).toBe(state);
    }
  });

  it("rejects unknown states", () => {
    expect(() => CampaignWorkflowStateSchema.parse("done")).toThrow();
    expect(() => CampaignWorkflowStateSchema.parse("published")).toThrow();
    expect(() => CampaignWorkflowStateSchema.parse("")).toThrow();
  });
});

describe("CampaignEventSchema", () => {
  it("accepts all supported events", () => {
    const events = [
      "BRIEF_SAVED",
      "RESEARCH_COMPLETED",
      "STRATEGY_GENERATED",
      "MODULE_GENERATED",
      "QC_REQUESTED",
      "QC_APPROVED",
      "QC_REJECTED",
      "EXPORTED",
      "RESET_TO_DRAFT",
    ] as const;

    for (const event of events) {
      expect(CampaignEventSchema.parse(event)).toBe(event);
    }
  });

  it("rejects unknown events", () => {
    expect(() => CampaignEventSchema.parse("COMPLETED")).toThrow();
    expect(() => CampaignEventSchema.parse("brief_saved")).toThrow();
  });
});
