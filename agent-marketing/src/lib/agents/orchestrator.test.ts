import { describe, expect, it, vi } from "vitest";
import { generateCampaignModule, generateCampaignStrategy, refineCampaignOutput } from "./orchestrator";
import type { CampaignAgents } from "./types";
import type { CampaignBrief, CampaignStrategy } from "../campaign/types";

const brief: CampaignBrief = {
  startupName: "SignalForge",
  productDescription: "AI research assistant for sales teams.",
  targetAudience: "B2B SaaS sales leaders",
  problemSolved: "Manual account research.",
  campaignGoal: "demo",
  competitors: [],
  tone: ["clear"],
};

const strategy: CampaignStrategy = {
  marketSummary: "summary",
  icp: "icp",
  painPoints: ["pain"],
  positioningStatement: "positioning",
  messagingPillars: [],
  brandVoice: { tone: ["clear"], avoid: ["hype"] },
  hooks: ["hook"],
  channelStrategy: { x: "x", linkedin: "li", instagram: "ig" },
};

describe("campaign orchestrator", () => {
  it("runs research before strategy", async () => {
    const agents: CampaignAgents = {
      research: vi.fn().mockResolvedValue({ summary: "research", audienceInsights: [], competitorPatterns: [], marketOpportunities: [], sourceNotes: [] }),
      strategy: vi.fn().mockResolvedValue(strategy),
      module: vi.fn(),
      refine: vi.fn(),
    };

    const result = await generateCampaignStrategy(brief, agents);
    expect(result).toBe(strategy);
    expect(agents.research).toHaveBeenCalledOnce();
    expect(agents.strategy).toHaveBeenCalledOnce();
  });

  it("delegates module generation to the module agent", async () => {
    const agents: CampaignAgents = {
      research: vi.fn(),
      strategy: vi.fn(),
      module: vi.fn().mockResolvedValue({ module: "x", title: "X", summary: "S", sections: [] }),
      refine: vi.fn(),
    };

    const result = await generateCampaignModule({ brief, strategy, module: "x" }, agents);
    expect(result.title).toBe("X");
    expect(agents.module).toHaveBeenCalledOnce();
  });

  it("delegates refinement to the refine agent", async () => {
    const agents: CampaignAgents = {
      research: vi.fn(),
      strategy: vi.fn(),
      module: vi.fn(),
      refine: vi.fn().mockResolvedValue({ revisedText: "Better", changeSummary: "Reduced sales tone" }),
    };

    const result = await refineCampaignOutput({ strategy, originalText: "Buy now", instruction: "less salesy" }, agents);
    expect(result.revisedText).toBe("Better");
    expect(agents.refine).toHaveBeenCalledOnce();
  });
});
