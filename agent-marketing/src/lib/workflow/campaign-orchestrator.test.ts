import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { createTestDb } from "../db/client";
import { createCampaign, saveStrategy, upsertModule } from "../db/repositories/campaigns";
import { saveSource } from "../db/repositories/sources";
import { saveQcReview } from "../db/repositories/qc-reviews";
import { saveMessage } from "../db/repositories/messages";
import { getRunsByCampaign } from "../db/repositories/runs";
import { exportEvents } from "../db/schema";
import type { CampaignBrief, CampaignStrategy } from "../campaign/types";

// Mock the orchestrator agents so tests don't call real LLM
vi.mock("../agents/orchestrator", () => ({
  generateCampaignStrategy: vi.fn(),
  generateCampaignModule: vi.fn(),
  refineCampaignOutput: vi.fn(),
}));

// Mock LLM client so QC reviewers don't make real API calls
vi.mock("../llm/client", () => ({
  completeStructuredPromptWithRecovery: vi.fn().mockResolvedValue({
    reviewer: "brand_safety",
    verdict: "pass",
    issues: [],
    confidence: 0.9,
  }),
  completeStructuredPrompt: vi.fn(),
  completeJsonPrompt: vi.fn(),
  completeChatPrompt: vi.fn().mockResolvedValue("Generic chat response"),
  getLlmConfig: vi.fn().mockReturnValue({ model: "test", baseURL: "http://localhost", apiKey: "test", temperature: 0.7, maxTokens: 4096 }),
  createLlmClient: vi.fn(),
  checkLlmConfiguration: vi.fn(),
}));

// Mock getDb to use our test DB
import * as clientModule from "../db/client";
import * as llmModule from "../llm/client";
import { generateCampaignStrategy, generateCampaignModule, refineCampaignOutput } from "../agents/orchestrator";
import {
  getCampaignHandler,
  generateStrategyHandler,
  generateModuleHandler,
  approveQcHandler,
  rejectQcHandler,
  getSourcesHandler,
  getQcReviewsHandler,
  getMessagesHandler,
  chatHandler,
  getExportEventsHandler,
  recordExportHandler,
} from "./campaign-orchestrator";

const testBrief: CampaignBrief = {
  startupName: "TestCo",
  productDescription: "Test product",
  targetAudience: "Testers",
  problemSolved: "Testing",
  campaignGoal: "launch",
  competitors: [],
  tone: ["professional"],
};

const testStrategy: CampaignStrategy = {
  marketSummary: "Growing market",
  icp: "B2B founders",
  painPoints: ["slow GTM"],
  positioningStatement: "The fastest GTM",
  messagingPillars: [],
  brandVoice: { tone: ["professional"], avoid: [] },
  hooks: ["10x speed"],
  channelStrategy: { x: "short posts", linkedin: "thought leadership", instagram: "visual" },
};

describe("campaign-orchestrator handlers", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    db = await createTestDb();
    vi.spyOn(clientModule, "getDb").mockReturnValue(db);
  });

  it("generateStrategyHandler persists strategy and creates run log", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });

    vi.mocked(generateCampaignStrategy).mockResolvedValue({
      strategy: testStrategy,
      mcpResults: [],
    });

    const workspace = await generateStrategyHandler(campaign.id);

    expect(workspace.workflowState).toBe("strategy_ready");
    expect(workspace.strategy?.marketSummary).toBe("Growing market");

    const runs = await getRunsByCampaign(db, campaign.id);
    expect(runs).toHaveLength(1);
    expect(runs[0].nodeName).toBe("generate_strategy");
    expect(runs[0].status).toBe("success");
    expect(runs[0].stateAfter).toBe("strategy_ready");
  });

  it("generateStrategyHandler persists structured MCP source metadata", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });

    vi.mocked(generateCampaignStrategy).mockResolvedValue({
      strategy: testStrategy,
      mcpResults: [
        {
          serverName: "firecrawl",
          toolName: "search",
          content: [{ type: "text", text: "source text" }],
          extractedText: "Market evidence snippet",
          sourceUrl: "https://example.com/report",
          title: "Example market report",
          snippet: "Structured source snippet",
          confidence: 0.82,
        },
      ],
    });

    await generateStrategyHandler(campaign.id);
    const sources = await getSourcesHandler(campaign.id);
    const runs = await getRunsByCampaign(db, campaign.id);

    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      runId: runs[0].id,
      sourceUrl: "https://example.com/report",
      title: "Example market report",
      snippet: "Structured source snippet",
      confidence: 0.82,
      usedIn: ["market_researcher"],
      serverName: "firecrawl",
      toolName: "search",
    });
  });

  it("generateStrategyHandler logs failed run on error", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });

    vi.mocked(generateCampaignStrategy).mockRejectedValue(new Error("LLM timeout"));

    await expect(generateStrategyHandler(campaign.id)).rejects.toThrow("LLM timeout");

    const runs = await getRunsByCampaign(db, campaign.id);
    expect(runs[0].status).toBe("failed");
    expect(runs[0].errorMessage).toBe("LLM timeout");
  });

  it("generateStrategyHandler throws user-safe error for unknown campaign", async () => {
    await expect(generateStrategyHandler("non-existent-id")).rejects.toThrow("Campaign not found");
  });

  it("generateModuleHandler persists module and auto-approves all-pass QC", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });
    await saveStrategy(db, campaign.id, testStrategy);

    vi.mocked(generateCampaignModule).mockResolvedValue({
      module: "linkedin",
      title: "LinkedIn Strategy",
      summary: "Enterprise posts",
      sections: [{ title: "Posts", items: ["Post 1"] }],
    });

    const workspace = await generateModuleHandler(campaign.id, "linkedin");

    expect(workspace.modules).toHaveLength(1);
    expect(workspace.modules[0].moduleKind).toBe("linkedin");
    expect(workspace.workflowState).toBe("approved");

    const runs = await getRunsByCampaign(db, campaign.id);
    expect(runs.some((r) => r.nodeName === "generate_module_linkedin")).toBe(true);
    expect(runs.find((r) => r.nodeName === "generate_module_linkedin")?.stateAfter).toBe("approved");
  });

  it("generateModuleHandler throws when no strategy exists", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });
    await expect(generateModuleHandler(campaign.id, "linkedin")).rejects.toThrow("no strategy yet");
  });

  it("generateModuleHandler transitions to review_pending when QC finds issues", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });
    await saveStrategy(db, campaign.id, testStrategy);

    vi.mocked(generateCampaignModule).mockResolvedValue({
      module: "x",
      title: "X Strategy",
      summary: "Posts",
      sections: [{ title: "Posts", items: ["We are #1 in the market!"] }],
    });

    // Make QC reviewers return a fail verdict
    (llmModule.completeStructuredPromptWithRecovery as Mock).mockResolvedValue({
      reviewer: "claim_verifier",
      verdict: "fail",
      issues: [{ severity: "error", message: "Unsupported superlative: #1" }],
      confidence: 0.9,
    });

    const workspace = await generateModuleHandler(campaign.id, "x");

    expect(workspace.workflowState).toBe("review_pending");
  });

  it("generateModuleHandler transitions to review_pending when a QC reviewer rejects", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });
    await saveStrategy(db, campaign.id, testStrategy);

    vi.mocked(generateCampaignModule).mockResolvedValue({
      module: "linkedin",
      title: "LinkedIn Strategy",
      summary: "Posts",
      sections: [{ title: "Posts", items: ["Post 1"] }],
    });

    (llmModule.completeStructuredPromptWithRecovery as Mock)
      .mockResolvedValueOnce({ reviewer: "brand_safety", verdict: "pass", issues: [], confidence: 0.9 })
      .mockRejectedValueOnce(new Error("Claim verifier unavailable"))
      .mockResolvedValue({ reviewer: "platform_compliance", verdict: "pass", issues: [], confidence: 0.9 });

    const workspace = await generateModuleHandler(campaign.id, "linkedin");

    expect(workspace.workflowState).toBe("review_pending");
    const reviews = await getQcReviewsHandler(campaign.id);
    expect(reviews.some((review) => review.reviewer === "claim_verifier" && review.verdict === "fail")).toBe(true);
  });

  it("approveQcHandler transitions campaign to approved", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });
    await saveStrategy(db, campaign.id, testStrategy);

    vi.mocked(generateCampaignModule).mockResolvedValue({
      module: "linkedin",
      title: "LinkedIn",
      summary: "Posts",
      sections: [],
    });

    (llmModule.completeStructuredPromptWithRecovery as Mock).mockResolvedValue({
      reviewer: "brand_safety",
      verdict: "warn",
      issues: [{ severity: "warning", message: "Minor concern" }],
      confidence: 0.8,
    });

    await generateModuleHandler(campaign.id, "linkedin");
    const approved = await approveQcHandler(campaign.id);
    expect(approved.workflowState).toBe("approved");
  });

  it("rejectQcHandler returns campaign to modules_ready", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });
    await saveStrategy(db, campaign.id, testStrategy);

    vi.mocked(generateCampaignModule).mockResolvedValue({
      module: "instagram",
      title: "Instagram",
      summary: "Posts",
      sections: [],
    });

    (llmModule.completeStructuredPromptWithRecovery as Mock).mockResolvedValue({
      reviewer: "tone_consistency",
      verdict: "fail",
      issues: [{ severity: "error", message: "Tone mismatch" }],
      confidence: 0.85,
    });

    await generateModuleHandler(campaign.id, "instagram");
    const rejected = await rejectQcHandler(campaign.id);
    expect(rejected.workflowState).toBe("modules_ready");
  });

  it("ownership: user B cannot read user A sources", async () => {
    const campaign = await createCampaign(db, { brief: testBrief, userId: "user-a" });
    await saveSource(db, {
      campaignId: campaign.id,
      serverName: "firecrawl",
      toolName: "search",
      snippet: "source text",
    });

    await expect(getSourcesHandler(campaign.id, "user-b")).resolves.toEqual([]);
  });

  it("ownership: user B cannot read user A QC reviews", async () => {
    const campaign = await createCampaign(db, { brief: testBrief, userId: "user-a" });
    await saveQcReview(db, campaign.id, {
      reviewer: "brand_safety",
      verdict: "warn",
      issues: [{ severity: "warning", message: "Needs review" }],
      confidence: 0.8,
    });

    await expect(getQcReviewsHandler(campaign.id, "user-b")).resolves.toEqual([]);
  });

  it("ownership: user B cannot read user A messages", async () => {
    const campaign = await createCampaign(db, { brief: testBrief, userId: "user-a" });
    await saveMessage(db, campaign.id, { role: "user", content: "hello" });

    await expect(getMessagesHandler(campaign.id, "user-b")).resolves.toEqual([]);
  });

  it("chat refines the only module and records refinement message metadata", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });
    await saveStrategy(db, campaign.id, testStrategy);
    const module = await upsertModule(db, campaign.id, "linkedin", {
      module: "linkedin",
      title: "LinkedIn Strategy",
      summary: "Founder-led posts",
      sections: [{ title: "Posts", items: ["Post 1"] }],
    });

    vi.mocked(refineCampaignOutput).mockResolvedValue({
      revisedText: "Enterprise-ready LinkedIn narrative",
      changeSummary: "Made the copy more enterprise-ready.",
    });

    const result = await chatHandler(campaign.id, "Make this more enterprise");
    const workspace = await getCampaignHandler(campaign.id);
    const runs = await getRunsByCampaign(db, campaign.id);
    const assistantMessage = result.messages.find((message) => message.role === "assistant" && message.runId === runs[0].id);

    expect(workspace?.modules[0].output.summary).toBe("Enterprise-ready LinkedIn narrative");
    expect(assistantMessage).toMatchObject({
      role: "assistant",
      messageType: "refinement",
      moduleId: module.id,
      runId: runs[0].id,
    });
    expect(runs[0]).toMatchObject({
      nodeName: "chat_refine_linkedin",
      status: "success",
    });
  });

  it("chat clarification asks for target module when refinement intent is ambiguous", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });
    await saveStrategy(db, campaign.id, testStrategy);
    await upsertModule(db, campaign.id, "linkedin", {
      module: "linkedin",
      title: "LinkedIn Strategy",
      summary: "LinkedIn posts",
      sections: [],
    });
    await upsertModule(db, campaign.id, "x", {
      module: "x",
      title: "X Strategy",
      summary: "X posts",
      sections: [],
    });

    const result = await chatHandler(campaign.id, "Rewrite this for NHS buyers");
    const runs = await getRunsByCampaign(db, campaign.id);
    const assistantMessage = result.messages.find((message) => message.role === "assistant");

    expect(assistantMessage?.content).toContain("Which module");
    expect(assistantMessage?.messageType).toBe("chat");
    expect(runs).toHaveLength(0);
  });

  it("chat failed refinement records failed run and assistant response", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });
    await saveStrategy(db, campaign.id, testStrategy);
    const module = await upsertModule(db, campaign.id, "instagram", {
      module: "instagram",
      title: "Instagram Strategy",
      summary: "Visual posts",
      sections: [],
    });

    vi.mocked(refineCampaignOutput).mockRejectedValue(new Error("Refinement timeout"));

    const result = await chatHandler(campaign.id, "Refine this instagram for NHS buyers");
    const runs = await getRunsByCampaign(db, campaign.id);
    const assistantMessage = result.messages.find((message) => message.role === "assistant" && message.runId === runs[0].id);

    expect(runs[0]).toMatchObject({
      nodeName: "chat_refine_instagram",
      status: "failed",
      errorMessage: "Refinement timeout",
    });
    expect(assistantMessage).toMatchObject({
      role: "assistant",
      messageType: "refinement",
      moduleId: module.id,
      runId: runs[0].id,
    });
    expect(assistantMessage?.content).toContain("couldn't refine");
  });

  it("export ownership: user B cannot record export for user A campaign", async () => {
    const campaign = await createCampaign(db, { brief: testBrief, userId: "user-a" });

    await expect(recordExportHandler(campaign.id, "pdf", "user-b")).rejects.toThrow(
      `Campaign not found: ${campaign.id}`,
    );

    const rows = await db.select().from(exportEvents);
    expect(rows).toHaveLength(0);
  });

  it("recordExportHandler requires approval before export", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });

    await expect(recordExportHandler(campaign.id, "markdown")).rejects.toThrow("must be approved before export");

    const rows = await db.select().from(exportEvents);
    expect(rows).toHaveLength(0);
  });

  it("recordExportHandler records export history and transitions approved campaign to exported", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });
    await saveStrategy(db, campaign.id, testStrategy);
    await approveQcHandler(campaign.id);

    const updated = await recordExportHandler(campaign.id, "markdown");
    const events = await getExportEventsHandler(campaign.id);

    expect(updated.workflowState).toBe("exported");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      campaignId: campaign.id,
      userId: "default-user",
      format: "markdown",
    });
  });

  it("roadmap integration: strategy sources, approved export, and chat refinement keep audit history", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });
    vi.mocked(generateCampaignStrategy).mockResolvedValue({
      strategy: testStrategy,
      mcpResults: [
        {
          serverName: "firecrawl",
          toolName: "search",
          content: [{ type: "text", text: "source text" }],
          extractedText: "Evidence snippet",
          sourceUrl: "https://example.com/evidence",
          title: "Evidence report",
          snippet: "Evidence snippet",
          confidence: 0.91,
        },
      ],
    });
    vi.mocked(generateCampaignModule).mockResolvedValue({
      module: "linkedin",
      title: "LinkedIn Strategy",
      summary: "Founder-led posts",
      sections: [{ title: "Posts", items: ["Post 1"] }],
    });
    (llmModule.completeStructuredPromptWithRecovery as Mock).mockResolvedValue({
      reviewer: "brand_safety",
      verdict: "pass",
      issues: [],
      confidence: 0.9,
    });
    vi.mocked(refineCampaignOutput).mockResolvedValue({
      revisedText: "Enterprise-ready LinkedIn narrative",
      changeSummary: "Made LinkedIn more enterprise-ready.",
    });

    const strategyWorkspace = await generateStrategyHandler(campaign.id);
    const moduleWorkspace = await generateModuleHandler(campaign.id, "linkedin");
    const exportedWorkspace = await recordExportHandler(campaign.id, "json");
    const chatResult = await chatHandler(campaign.id, "Make this more enterprise");
    const finalWorkspace = await getCampaignHandler(campaign.id);
    const sources = await getSourcesHandler(campaign.id);
    const exportHistory = await getExportEventsHandler(campaign.id);
    const runs = await getRunsByCampaign(db, campaign.id);

    expect(strategyWorkspace.workflowState).toBe("strategy_ready");
    expect(moduleWorkspace.workflowState).toBe("approved");
    expect(exportedWorkspace.workflowState).toBe("exported");
    expect(sources[0]).toMatchObject({ sourceUrl: "https://example.com/evidence", confidence: 0.91 });
    expect(exportHistory[0]).toMatchObject({ format: "json", userId: "default-user" });
    expect(finalWorkspace?.modules[0].output.summary).toBe("Enterprise-ready LinkedIn narrative");
    expect(chatResult.messages.some((message) => message.messageType === "refinement" && message.runId)).toBe(true);
    expect(runs.some((run) => run.nodeName === "generate_strategy" && run.status === "success")).toBe(true);
    expect(runs.some((run) => run.nodeName === "generate_module_linkedin" && run.status === "success")).toBe(true);
    expect(runs.some((run) => run.nodeName === "chat_refine_linkedin" && run.status === "success")).toBe(true);
  });
});
