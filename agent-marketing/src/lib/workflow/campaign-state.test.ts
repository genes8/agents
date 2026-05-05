import { describe, it, expect } from "vitest";
import {
  transitionCampaignState,
  canTransition,
  assertTransition,
  availableEvents,
  CampaignTransitionError,
} from "./campaign-state";

describe("transitionCampaignState", () => {
  it("happy path: draft_brief → research_ready → strategy_ready → modules_ready → review_pending → approved → exported", () => {
    let state = transitionCampaignState("draft_brief", "BRIEF_SAVED");
    expect(state).toBe("research_ready");

    state = transitionCampaignState(state, "STRATEGY_GENERATED");
    expect(state).toBe("strategy_ready");

    state = transitionCampaignState(state, "MODULE_GENERATED");
    expect(state).toBe("modules_ready");

    state = transitionCampaignState(state, "QC_REQUESTED");
    expect(state).toBe("review_pending");

    state = transitionCampaignState(state, "QC_APPROVED");
    expect(state).toBe("approved");

    state = transitionCampaignState(state, "EXPORTED");
    expect(state).toBe("exported");
  });

  it("MODULE_GENERATED keeps modules_ready state for subsequent modules", () => {
    const state = transitionCampaignState("modules_ready", "MODULE_GENERATED");
    expect(state).toBe("modules_ready");
  });

  it("QC_REJECTED returns to modules_ready", () => {
    const state = transitionCampaignState("review_pending", "QC_REJECTED");
    expect(state).toBe("modules_ready");
  });

  it("RESET_TO_DRAFT works from any state", () => {
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
      expect(transitionCampaignState(state, "RESET_TO_DRAFT")).toBe("draft_brief");
    }
  });

  it("rejects invalid transition from draft_brief directly to approved", () => {
    expect(() => transitionCampaignState("draft_brief", "QC_APPROVED")).toThrow(CampaignTransitionError);
  });

  it("rejects MODULE_GENERATED from draft_brief", () => {
    expect(() => transitionCampaignState("draft_brief", "MODULE_GENERATED")).toThrow(CampaignTransitionError);
  });

  it("rejects EXPORTED from review_pending", () => {
    expect(() => transitionCampaignState("review_pending", "EXPORTED")).toThrow(CampaignTransitionError);
  });

  it("error includes current state and event", () => {
    try {
      transitionCampaignState("draft_brief", "EXPORTED");
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(CampaignTransitionError);
      const err = e as CampaignTransitionError;
      expect(err.currentState).toBe("draft_brief");
      expect(err.event).toBe("EXPORTED");
      expect(err.message).toContain("draft_brief");
      expect(err.message).toContain("EXPORTED");
    }
  });
});

describe("canTransition", () => {
  it("returns true for valid transitions", () => {
    expect(canTransition("draft_brief", "BRIEF_SAVED")).toBe(true);
    expect(canTransition("modules_ready", "QC_REQUESTED")).toBe(true);
  });

  it("returns false for invalid transitions", () => {
    expect(canTransition("draft_brief", "EXPORTED")).toBe(false);
    expect(canTransition("strategy_ready", "QC_APPROVED")).toBe(false);
  });
});

describe("assertTransition", () => {
  it("does not throw for valid transitions", () => {
    expect(() => assertTransition("draft_brief", "BRIEF_SAVED")).not.toThrow();
  });

  it("throws CampaignTransitionError for invalid transitions", () => {
    expect(() => assertTransition("approved", "STRATEGY_GENERATED")).toThrow(CampaignTransitionError);
  });
});

describe("availableEvents", () => {
  it("returns correct events for each state", () => {
    expect(availableEvents("draft_brief")).toContain("BRIEF_SAVED");
    expect(availableEvents("draft_brief")).toContain("RESET_TO_DRAFT");
    expect(availableEvents("draft_brief")).not.toContain("QC_APPROVED");
    expect(availableEvents("approved")).toContain("EXPORTED");
    expect(availableEvents("exported")).toEqual(["RESET_TO_DRAFT"]);
  });
});
