export class CampaignTransitionError extends Error {
    currentState;
    event;
    constructor(currentState, event) {
        super(`Invalid transition: cannot apply "${event}" to state "${currentState}"`);
        this.currentState = currentState;
        this.event = event;
        this.name = "CampaignTransitionError";
    }
}
const TRANSITIONS = {
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
export function transitionCampaignState(current, event) {
    const next = TRANSITIONS[current][event];
    if (next === undefined) {
        throw new CampaignTransitionError(current, event);
    }
    return next;
}
export function canTransition(current, event) {
    return TRANSITIONS[current][event] !== undefined;
}
export function assertTransition(current, event) {
    if (!canTransition(current, event)) {
        throw new CampaignTransitionError(current, event);
    }
}
export function availableEvents(state) {
    return Object.keys(TRANSITIONS[state]);
}
