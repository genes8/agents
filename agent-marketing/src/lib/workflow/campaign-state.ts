import type { CampaignEvent, CampaignWorkflowState } from "../campaign/types";

export class CampaignTransitionError extends Error {
  constructor(
    public readonly currentState: CampaignWorkflowState,
    public readonly event: CampaignEvent,
  ) {
    super(`Invalid transition: cannot apply "${event}" to state "${currentState}"`);
    this.name = "CampaignTransitionError";
  }
}

const TRANSITIONS: Record<CampaignWorkflowState, Partial<Record<CampaignEvent, CampaignWorkflowState>>> = {
  draft_brief: {
    BRIEF_SAVED: "research_ready",
    RESET_TO_DRAFT: "draft_brief",
  },
  research_ready: {
    RESEARCH_COMPLETED: "research_ready",
    STRATEGY_GENERATED: "strategy_ready",
    RESET_TO_DRAFT: "draft_brief",
  },
  strategy_ready: {
    MODULE_GENERATED: "modules_ready",
    RESET_TO_DRAFT: "draft_brief",
  },
  modules_ready: {
    MODULE_GENERATED: "modules_ready",
    QC_REQUESTED: "review_pending",
    RESET_TO_DRAFT: "draft_brief",
  },
  review_pending: {
    QC_APPROVED: "approved",
    QC_REJECTED: "modules_ready",
    RESET_TO_DRAFT: "draft_brief",
  },
  approved: {
    EXPORTED: "exported",
    RESET_TO_DRAFT: "draft_brief",
  },
  exported: {
    RESET_TO_DRAFT: "draft_brief",
  },
};

export function transitionCampaignState(
  current: CampaignWorkflowState,
  event: CampaignEvent,
): CampaignWorkflowState {
  const next = TRANSITIONS[current][event];
  if (next === undefined) {
    throw new CampaignTransitionError(current, event);
  }
  return next;
}

export function canTransition(current: CampaignWorkflowState, event: CampaignEvent): boolean {
  return TRANSITIONS[current][event] !== undefined;
}

export function assertTransition(current: CampaignWorkflowState, event: CampaignEvent): void {
  if (!canTransition(current, event)) {
    throw new CampaignTransitionError(current, event);
  }
}

export function availableEvents(state: CampaignWorkflowState): CampaignEvent[] {
  return Object.keys(TRANSITIONS[state]) as CampaignEvent[];
}
