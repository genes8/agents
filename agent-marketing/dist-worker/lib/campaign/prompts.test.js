import { describe, expect, it } from "vitest";
import { buildModulePrompt, buildRefinePrompt, buildStrategyPrompt } from "./prompts";
const brief = {
    startupName: "SignalForge",
    productDescription: "AI research assistant for B2B sales teams.",
    targetAudience: "B2B SaaS founders and sales leaders",
    problemSolved: "Sales teams waste time researching accounts manually.",
    campaignGoal: "demo",
    landingPageUrl: "https://example.com",
    competitors: ["Clay", "Apollo"],
    tone: ["sharp", "credible"],
};
const strategy = {
    marketSummary: "Teams need faster account research.",
    icp: "Sales-led B2B SaaS teams.",
    painPoints: ["Manual research"],
    positioningStatement: "SignalForge turns account research into ready-to-send outreach context.",
    messagingPillars: [],
    brandVoice: { tone: ["clear"], avoid: ["hype"] },
    hooks: ["Your reps do not need another tab."],
    channelStrategy: { x: "Threads", linkedin: "Founder posts", instagram: "Carousels" },
};
describe("campaign prompts", () => {
    it("builds a strategy prompt with strict JSON instruction", () => {
        const prompt = buildStrategyPrompt(brief);
        expect(prompt).toContain("SignalForge");
        expect(prompt).toContain("Return only valid JSON");
        expect(prompt).toContain("marketSummary");
    });
    it("builds a module prompt scoped to selected module", () => {
        const prompt = buildModulePrompt({ brief, strategy, module: "linkedin" });
        expect(prompt).toContain("linkedin");
        expect(prompt).toContain("CampaignModuleOutput");
        expect(prompt).toContain("SignalForge turns account research");
    });
    it("builds a refinement prompt preserving strategy context", () => {
        const prompt = buildRefinePrompt({
            strategy,
            originalText: "Book a demo today.",
            instruction: "Make it less salesy.",
        });
        expect(prompt).toContain("Make it less salesy");
        expect(prompt).toContain("RefineOutput");
    });
});
