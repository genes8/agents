import { describe, expect, it } from "vitest";
import { exportCampaignAsJson, exportCampaignAsMarkdown } from "./export";
import type { CampaignWorkspace } from "./types";

const workspace: CampaignWorkspace = {
  brief: {
    startupName: "SignalForge",
    productDescription: "AI research assistant for B2B sales teams.",
    targetAudience: "B2B SaaS founders and sales leaders",
    problemSolved: "Sales teams waste time researching accounts manually.",
    campaignGoal: "demo",
    landingPageUrl: "https://example.com",
    competitors: ["Clay", "Apollo"],
    tone: ["sharp", "credible"],
  },
  strategy: {
    marketSummary: "Teams need faster account research.",
    icp: "Sales-led B2B SaaS teams.",
    painPoints: ["Manual research", "Low reply rates"],
    positioningStatement: "SignalForge turns account research into ready-to-send outreach context.",
    messagingPillars: [
      {
        name: "Speed",
        description: "Research in minutes, not hours.",
        proofPoints: ["Automated account briefs"],
      },
    ],
    brandVoice: {
      tone: ["clear", "direct"],
      avoid: ["hype"],
    },
    hooks: ["Your reps do not need another tab."],
    channelStrategy: {
      x: "Opinionated founder-led threads.",
      linkedin: "Credibility and pain-led posts.",
      instagram: "Visual explainers and carousels.",
    },
  },
  modules: [
    {
      module: "x",
      title: "X Launch Pack",
      summary: "Posts for launch week.",
      sections: [{ title: "Hooks", items: ["Stop researching accounts manually."] }],
    },
  ],
};

describe("campaign exports", () => {
  it("exports stable JSON", () => {
    const json = exportCampaignAsJson(workspace);
    expect(JSON.parse(json)).toEqual(workspace);
  });

  it("exports readable Markdown", () => {
    const markdown = exportCampaignAsMarkdown(workspace);
    expect(markdown).toContain("# SignalForge Campaign");
    expect(markdown).toContain("## Strategy Core");
    expect(markdown).toContain("SignalForge turns account research");
    expect(markdown).toContain("## X Launch Pack");
  });
});
