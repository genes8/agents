import { describe, expect, it, vi, beforeEach } from "vitest";
import { runClaimVerifier } from "./claim-verifier";
import { runBrandSafetyReviewer } from "./brand-safety-reviewer";
import { runPlatformComplianceReviewer } from "./platform-compliance-reviewer";
import { runToneConsistencyReviewer } from "./tone-consistency-reviewer";
import { runConversionReviewer } from "./conversion-reviewer";
vi.mock("../../llm/client", () => ({
    completeStructuredPromptWithRecovery: vi.fn(),
}));
import { completeStructuredPromptWithRecovery } from "../../llm/client";
const brief = {
    startupName: "Acme",
    productDescription: "AI tool for sales",
    targetAudience: "Sales teams",
    problemSolved: "Manual research",
    campaignGoal: "demo",
    competitors: [],
    tone: ["clear", "credible"],
};
const moduleOutput = {
    module: "x",
    title: "X Campaign",
    summary: "Posts for X",
    sections: [
        {
            title: "Main posts",
            items: ["We are #1 in the market for AI sales tools."],
        },
    ],
};
const moduleOutputClean = {
    ...moduleOutput,
    sections: [
        {
            title: "Main posts",
            items: ["Helping sales teams research accounts 10x faster — backed by third-party benchmarks."],
        },
    ],
};
const sources = [
    {
        id: "src-1",
        campaignId: "camp-1",
        serverName: "brave",
        toolName: "search",
        title: "Benchmark report: AI sales tools 2024",
        snippet: "Acme ranked #1 in G2 Q4 2024 report.",
        createdAt: new Date(),
    },
];
const mockFn = completeStructuredPromptWithRecovery;
const getPrompt = () => {
    const [, callInput] = mockFn.mock.calls[0];
    return callInput.prompt;
};
beforeEach(() => {
    mockFn.mockReset();
});
describe("claim-verifier", () => {
    it("returns fail verdict when '#1' claim has no sources", async () => {
        mockFn.mockResolvedValueOnce({
            reviewer: "claim_verifier",
            verdict: "fail",
            issues: [{ severity: "error", message: "'#1 in the market' is an unsupported superlative." }],
            confidence: 0.9,
            linkedSourceIds: [],
        });
        const result = await runClaimVerifier({ brief, moduleOutput, sources: [] });
        expect(result.reviewer).toBe("claim_verifier");
        expect(result.verdict).toBe("fail");
        expect(result.issues.some((i) => i.severity === "error")).toBe(true);
    });
    it("returns pass verdict when claim is supported by a source", async () => {
        mockFn.mockResolvedValueOnce({
            reviewer: "claim_verifier",
            verdict: "pass",
            issues: [],
            confidence: 0.95,
            linkedSourceIds: ["src-1"],
        });
        const result = await runClaimVerifier({ brief, moduleOutput: moduleOutputClean, sources });
        expect(result.verdict).toBe("pass");
        expect(result.issues).toHaveLength(0);
        expect(result.linkedSourceIds).toContain("src-1");
    });
    it("passes the module content and sources to the LLM prompt", async () => {
        mockFn.mockResolvedValueOnce({
            reviewer: "claim_verifier",
            verdict: "pass",
            issues: [],
            confidence: 0.8,
        });
        await runClaimVerifier({ brief, moduleOutput, sources });
        const prompt = getPrompt();
        expect(prompt).toContain("#1 in the market");
        expect(prompt).toContain("src-1");
        expect(prompt).toContain("Benchmark report: AI sales tools 2024");
        expect(prompt).toContain("Acme ranked #1 in G2 Q4 2024 report.");
    });
});
describe("brand-safety-reviewer", () => {
    it("returns the brand_safety reviewer name", async () => {
        mockFn.mockResolvedValueOnce({
            reviewer: "brand_safety",
            verdict: "pass",
            issues: [],
            confidence: 0.85,
        });
        const result = await runBrandSafetyReviewer({ brief, moduleOutput, sources: [] });
        expect(result.reviewer).toBe("brand_safety");
    });
    it("passes startup, brief, and module context to the prompt", async () => {
        mockFn.mockResolvedValueOnce({
            reviewer: "brand_safety",
            verdict: "pass",
            issues: [],
            confidence: 0.85,
        });
        await runBrandSafetyReviewer({ brief, moduleOutput, sources: [] });
        const prompt = getPrompt();
        expect(prompt).toContain("Acme");
        expect(prompt).toContain("AI tool for sales");
        expect(prompt).toContain("X Campaign");
        expect(prompt).toContain("We are #1 in the market for AI sales tools.");
    });
    it("returns fail for content with offensive language", async () => {
        mockFn.mockResolvedValueOnce({
            reviewer: "brand_safety",
            verdict: "fail",
            issues: [{ severity: "error", message: "Contains language that may be considered discriminatory." }],
            confidence: 0.92,
        });
        const result = await runBrandSafetyReviewer({ brief, moduleOutput, sources: [] });
        expect(result.verdict).toBe("fail");
        expect(result.issues[0]?.severity).toBe("error");
    });
});
describe("platform-compliance-reviewer", () => {
    it("returns the platform_compliance reviewer name", async () => {
        mockFn.mockResolvedValueOnce({
            reviewer: "platform_compliance",
            verdict: "pass",
            issues: [],
            confidence: 0.84,
        });
        const result = await runPlatformComplianceReviewer({ brief, moduleOutput, sources: [] });
        expect(result.reviewer).toBe("platform_compliance");
    });
    it("passes startup, audience, and module context to the prompt", async () => {
        mockFn.mockResolvedValueOnce({
            reviewer: "platform_compliance",
            verdict: "pass",
            issues: [],
            confidence: 0.84,
        });
        await runPlatformComplianceReviewer({ brief, moduleOutput, sources: [] });
        const prompt = getPrompt();
        expect(prompt).toContain("Acme");
        expect(prompt).toContain("Sales teams");
        expect(prompt).toContain("X Campaign");
        expect(prompt).toContain("We are #1 in the market for AI sales tools.");
    });
});
describe("tone-consistency-reviewer", () => {
    it("returns the tone_consistency reviewer name", async () => {
        mockFn.mockResolvedValueOnce({
            reviewer: "tone_consistency",
            verdict: "pass",
            issues: [],
            confidence: 0.83,
        });
        const result = await runToneConsistencyReviewer({ brief, moduleOutput, sources: [] });
        expect(result.reviewer).toBe("tone_consistency");
    });
    it("passes desired tone, brief, and module context to the prompt", async () => {
        mockFn.mockResolvedValueOnce({
            reviewer: "tone_consistency",
            verdict: "pass",
            issues: [],
            confidence: 0.83,
        });
        await runToneConsistencyReviewer({ brief, moduleOutput, sources: [] });
        const prompt = getPrompt();
        expect(prompt).toContain("clear, credible");
        expect(prompt).toContain("Acme");
        expect(prompt).toContain("X Campaign");
        expect(prompt).toContain("We are #1 in the market for AI sales tools.");
    });
});
describe("conversion-reviewer", () => {
    it("returns the conversion reviewer name", async () => {
        mockFn.mockResolvedValueOnce({
            reviewer: "conversion",
            verdict: "pass",
            issues: [],
            confidence: 0.82,
        });
        const result = await runConversionReviewer({ brief, moduleOutput, sources: [] });
        expect(result.reviewer).toBe("conversion");
    });
    it("passes campaign goal, brief, and module context to the prompt", async () => {
        mockFn.mockResolvedValueOnce({
            reviewer: "conversion",
            verdict: "pass",
            issues: [],
            confidence: 0.82,
        });
        await runConversionReviewer({ brief, moduleOutput, sources: [] });
        const prompt = getPrompt();
        expect(prompt).toContain("demo");
        expect(prompt).toContain("Acme");
        expect(prompt).toContain("X Campaign");
        expect(prompt).toContain("We are #1 in the market for AI sales tools.");
    });
});
