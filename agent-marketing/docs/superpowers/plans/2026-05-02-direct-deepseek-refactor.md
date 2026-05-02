# Direct DeepSeek + Custom Agents + MCP Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Cursor SDK with direct DeepSeek/OpenAI-compatible LLM calls while preserving agentic behavior through custom TypeScript subagents and an optional MCP tool runtime.

**Architecture:** The app removes Cursor as a required control plane. Server functions call a local campaign orchestrator that runs specialized TypeScript subagents (`market-researcher`, `positioning-strategist`, `social-copywriter`, `creative-director`) through a shared OpenAI-compatible DeepSeek client. MCP support is retained by adding our own MCP client layer using `@modelcontextprotocol/client`, `StdioClientTransport`, `listTools()`, and `callTool()`; available tool results are gathered before LLM generation and injected into prompts as structured context.

**Tech Stack:** TanStack Start, React, Vite, TypeScript, OpenAI Node SDK, DeepSeek OpenAI-compatible API, MCP TypeScript client SDK, Vitest.

---

## Decision Summary

`@cursor/sdk` is not useful without Cursor's API/runtime because Cursor SDK is the agent runtime, not just an OpenAI-compatible client. If we want direct DeepSeek API usage without Cursor as a control plane, we must own the orchestration ourselves.

This plan keeps the important parts conceptually:

- **Subagents:** implemented as typed TypeScript functions with dedicated system prompts and response contracts.
- **MCP runtime:** implemented as our own optional MCP client layer, initially for stdio servers.
- **Direct billing/control:** DeepSeek is called through `OPENAI_BASE_URL=https://api.deepseek.com/v1` and `OPENAI_DEFAULT_MODEL=deepseek-v4-flash`.

What changes: Cursor-specific durable runs, Cursor MCP loading, and Cursor subagent definitions are removed. We replace them with explicit code we control.

---

## File Structure Changes

- Modify: `package.json` — remove `@cursor/sdk`; add `openai` and `@modelcontextprotocol/client`.
- Create or modify: `.env.example` — document DeepSeek and optional MCP server configuration.
- Delete: `src/lib/cursor/agent.ts` — Cursor-specific agent factory.
- Delete: `src/lib/cursor/model-check.ts` — Cursor-specific model validation.
- Create: `src/lib/llm/client.ts` — OpenAI-compatible LLM client and JSON completion helper.
- Create: `src/lib/llm/client.test.ts` — LLM config and fake completion tests.
- Create: `src/lib/mcp/config.ts` — parses optional MCP stdio server configuration from env.
- Create: `src/lib/mcp/runtime.ts` — connects to MCP stdio servers, lists tools, calls tools, closes clients.
- Create: `src/lib/mcp/runtime.test.ts` — tests tool-result formatting using a fake MCP client.
- Create: `src/lib/agents/types.ts` — shared subagent context/result types.
- Create: `src/lib/agents/market-researcher.ts` — gathers MCP research context and produces research brief JSON.
- Create: `src/lib/agents/positioning-strategist.ts` — turns brief + research into `CampaignStrategy`.
- Create: `src/lib/agents/social-copywriter.ts` — creates platform module outputs.
- Create: `src/lib/agents/creative-director.ts` — creates creative module outputs and image prompts.
- Create: `src/lib/agents/orchestrator.ts` — coordinates subagents for strategy, modules, and refinement.
- Create: `src/lib/agents/orchestrator.test.ts` — verifies orchestration order with fake subagent functions.
- Modify: `src/server/campaign.ts` — replace Cursor runs with orchestrator calls.
- Modify: `src/routes/index.tsx` — update UI label and diagnostics from Cursor to DeepSeek/MCP.
- Modify: `docs/superpowers/specs/2026-04-30-marketing-campaign-agent-prd.md` — update architecture from Cursor SDK to direct DeepSeek + custom agents + MCP.
- Modify: `docs/superpowers/plans/2026-04-30-marketing-campaign-agent.md` — mark original Cursor plan superseded.

Files that should remain functionally stable:

- `src/lib/campaign/types.ts`
- `src/lib/campaign/prompts.ts`, except optional prompt helper additions if needed
- `src/lib/campaign/export.ts`
- `src/components/*`

---

### Task 1: Replace Dependencies and Environment Contract

**Files:**
- Modify: `package.json`
- Create or modify: `.env.example`

- [ ] **Step 1: Replace runtime dependencies**

Modify `package.json` dependencies from:

```json
"dependencies": {
  "@cursor/sdk": "latest",
  "@tanstack/react-router": "latest",
  "@tanstack/react-start": "latest",
  "vite": "latest",
  "react": "latest",
  "react-dom": "latest"
}
```

to:

```json
"dependencies": {
  "@modelcontextprotocol/client": "latest",
  "@tanstack/react-router": "latest",
  "@tanstack/react-start": "latest",
  "openai": "latest",
  "vite": "latest",
  "react": "latest",
  "react-dom": "latest"
}
```

- [ ] **Step 2: Update environment example**

Create or replace `.env.example` with:

```env
# OpenAI-compatible provider config. Defaults target DeepSeek.
OPENAI_API_KEY=your_deepseek_api_key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_DEFAULT_MODEL=deepseek-v4-flash

# Optional generation tuning.
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=4096

# Optional MCP stdio servers as JSON. Leave empty to run without MCP tools.
# Example:
# MCP_STDIO_SERVERS=[{"name":"filesystem","command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/Users/enes/Desktop/Dev/agent-marketing"]}]
MCP_STDIO_SERVERS=[]
```

- [ ] **Step 3: Install dependency changes**

Run:

```bash
npm install --cache ./.npm-cache
```

Expected: install completes, `openai` and `@modelcontextprotocol/client` are installed, and `@cursor/sdk` is removed from `package-lock.json` dependencies.

---

### Task 2: Add OpenAI-Compatible DeepSeek Client

**Files:**
- Create: `src/lib/llm/client.ts`
- Create: `src/lib/llm/client.test.ts`

- [ ] **Step 1: Write LLM client tests**

Create `src/lib/llm/client.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { completeJsonPrompt, getLlmConfig, type ChatCompletionClient } from "./client";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("llm config", () => {
  it("uses DeepSeek defaults", () => {
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_DEFAULT_MODEL;

    expect(getLlmConfig()).toEqual({
      apiKey: "test-key",
      baseURL: "https://api.deepseek.com/v1",
      model: "deepseek-v4-flash",
      temperature: 0.7,
      maxTokens: 4096,
    });
  });

  it("throws when OPENAI_API_KEY is missing", () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => getLlmConfig()).toThrow("Missing OPENAI_API_KEY");
  });
});

describe("completeJsonPrompt", () => {
  it("calls the OpenAI-compatible API with JSON response format", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fakeClient: ChatCompletionClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: "{\"ok\":true}" } }],
          }),
        },
      },
    };

    const result = await completeJsonPrompt({
      prompt: "Return JSON",
      client: fakeClient,
      systemPrompt: "You are a JSON API.",
    });

    expect(result).toBe("{\"ok\":true}");
    expect(fakeClient.chat.completions.create).toHaveBeenCalledWith({
      model: "deepseek-v4-flash",
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a JSON API." },
        { role: "user", content: "Return JSON" },
      ],
    });
  });

  it("throws when the provider returns no content", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fakeClient: ChatCompletionClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({ choices: [{ message: { content: null } }] }),
        },
      },
    };

    await expect(completeJsonPrompt({ prompt: "Return JSON", client: fakeClient })).rejects.toThrow(
      "LLM returned an empty response",
    );
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- src/lib/llm/client.test.ts
```

Expected: FAIL because `src/lib/llm/client.ts` does not exist.

- [ ] **Step 3: Implement LLM client**

Create `src/lib/llm/client.ts`:

```ts
import OpenAI from "openai";

export type LlmConfig = {
  apiKey: string;
  baseURL: string;
  model: string;
  temperature: number;
  maxTokens: number;
};

export type ChatCompletionClient = Pick<OpenAI, "chat">;

type CompleteJsonPromptInput = {
  prompt: string;
  systemPrompt?: string;
  client?: ChatCompletionClient;
};

export function getLlmConfig(): LlmConfig {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Add your DeepSeek API key to .env.local.");
  }

  return {
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL ?? "https://api.deepseek.com/v1",
    model: process.env.OPENAI_DEFAULT_MODEL ?? "deepseek-v4-flash",
    temperature: Number(process.env.OPENAI_TEMPERATURE ?? "0.7"),
    maxTokens: Number(process.env.OPENAI_MAX_TOKENS ?? "4096"),
  };
}

export function createLlmClient(config = getLlmConfig()): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}

export async function completeJsonPrompt(input: CompleteJsonPromptInput): Promise<string> {
  const config = getLlmConfig();
  const client = input.client ?? createLlmClient(config);
  const response = await client.chat.completions.create({
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: input.systemPrompt ?? "Return only valid JSON. Do not wrap JSON in Markdown." },
      { role: "user", content: input.prompt },
    ],
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("LLM returned an empty response.");
  }

  return content;
}

export function checkLlmConfiguration(): { ok: boolean; message: string } {
  try {
    const config = getLlmConfig();
    return { ok: true, message: `Using ${config.model} via ${config.baseURL}.` };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm run test -- src/lib/llm/client.test.ts
```

Expected: PASS.

---

### Task 3: Add MCP Configuration and Runtime

**Files:**
- Create: `src/lib/mcp/config.ts`
- Create: `src/lib/mcp/runtime.ts`
- Create: `src/lib/mcp/runtime.test.ts`

- [ ] **Step 1: Create MCP config parser**

Create `src/lib/mcp/config.ts`:

```ts
export type McpStdioServerConfig = {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
};

export function getMcpStdioServers(): McpStdioServerConfig[] {
  const rawConfig = process.env.MCP_STDIO_SERVERS ?? "[]";
  const parsed = JSON.parse(rawConfig) as McpStdioServerConfig[];

  return parsed.map((server) => ({
    name: server.name,
    command: server.command,
    args: server.args ?? [],
    env: server.env,
    cwd: server.cwd,
  }));
}
```

- [ ] **Step 2: Write MCP runtime tests with fake clients**

Create `src/lib/mcp/runtime.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { formatMcpToolResults, runMcpResearchTools, type McpRuntimeClient } from "./runtime";

describe("MCP runtime", () => {
  it("formats text tool results for prompt context", () => {
    const context = formatMcpToolResults([
      {
        serverName: "search",
        toolName: "web_search",
        content: [{ type: "text", text: "Competitor A focuses on enterprise." }],
      },
    ]);

    expect(context).toContain("MCP Research Context");
    expect(context).toContain("search.web_search");
    expect(context).toContain("Competitor A focuses on enterprise.");
  });

  it("lists tools and calls research-like tools", async () => {
    const fakeClient: McpRuntimeClient = {
      listTools: vi.fn().mockResolvedValue({
        tools: [
          { name: "web_search", description: "Search the web" },
          { name: "unrelated", description: "Ignore me" },
        ],
      }),
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "Market result" }],
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    const results = await runMcpResearchTools({
      briefText: "Research SignalForge competitors",
      clients: [{ serverName: "search", client: fakeClient }],
    });

    expect(results).toHaveLength(1);
    expect(fakeClient.callTool).toHaveBeenCalledWith({
      name: "web_search",
      arguments: { query: "Research SignalForge competitors" },
    });
  });
});
```

- [ ] **Step 3: Implement MCP runtime**

Create `src/lib/mcp/runtime.ts`:

```ts
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { getMcpStdioServers, type McpStdioServerConfig } from "./config";

type McpContent = { type: string; text?: string };

export type McpToolResult = {
  serverName: string;
  toolName: string;
  content: McpContent[];
};

export type McpRuntimeClient = {
  listTools: (input?: { cursor?: string }) => Promise<{ tools: Array<{ name: string; description?: string }>; nextCursor?: string }>;
  callTool: (input: { name: string; arguments?: Record<string, unknown> }) => Promise<{ content: McpContent[]; isError?: boolean }>;
  close: () => Promise<void>;
};

type ConnectedMcpClient = {
  serverName: string;
  client: McpRuntimeClient;
};

type RunMcpResearchToolsInput = {
  briefText: string;
  clients?: ConnectedMcpClient[];
};

const researchToolPattern = /search|web|crawl|scrape|fetch|browser|url/i;

export async function connectConfiguredMcpClients(configs = getMcpStdioServers()): Promise<ConnectedMcpClient[]> {
  const connectedClients: ConnectedMcpClient[] = [];

  for (const config of configs) {
    connectedClients.push(await connectStdioMcpClient(config));
  }

  return connectedClients;
}

async function connectStdioMcpClient(config: McpStdioServerConfig): Promise<ConnectedMcpClient> {
  const client = new Client({ name: `agent-marketing-${config.name}`, version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args ?? [],
    env: config.env,
    cwd: config.cwd,
  });

  await client.connect(transport);

  return { serverName: config.name, client };
}

export async function runMcpResearchTools(input: RunMcpResearchToolsInput): Promise<McpToolResult[]> {
  const clients = input.clients ?? (await connectConfiguredMcpClients());
  const results: McpToolResult[] = [];

  try {
    for (const { serverName, client } of clients) {
      const tools = await listAllTools(client);
      const researchTools = tools.filter((tool) => researchToolPattern.test(`${tool.name} ${tool.description ?? ""}`));

      for (const tool of researchTools.slice(0, 3)) {
        const result = await client.callTool({
          name: tool.name,
          arguments: { query: input.briefText },
        });

        if (!result.isError) {
          results.push({ serverName, toolName: tool.name, content: result.content });
        }
      }
    }
  } finally {
    await Promise.all(clients.map(({ client }) => client.close()));
  }

  return results;
}

async function listAllTools(client: McpRuntimeClient): Promise<Array<{ name: string; description?: string }>> {
  const allTools: Array<{ name: string; description?: string }> = [];
  let cursor: string | undefined;

  do {
    const page = await client.listTools(cursor ? { cursor } : undefined);
    allTools.push(...page.tools);
    cursor = page.nextCursor;
  } while (cursor);

  return allTools;
}

export function formatMcpToolResults(results: McpToolResult[]): string {
  if (results.length === 0) {
    return "MCP Research Context: No MCP research tools returned context.";
  }

  return [
    "MCP Research Context:",
    ...results.flatMap((result) => [
      `Source: ${result.serverName}.${result.toolName}`,
      ...result.content.map((item) => (item.type === "text" ? item.text ?? "" : JSON.stringify(item))),
    ]),
  ].join("\n");
}
```

- [ ] **Step 4: Run MCP tests**

Run:

```bash
npm run test -- src/lib/mcp/runtime.test.ts
```

Expected: PASS.

---

### Task 4: Add Custom Subagent Layer

**Files:**
- Create: `src/lib/agents/types.ts`
- Create: `src/lib/agents/market-researcher.ts`
- Create: `src/lib/agents/positioning-strategist.ts`
- Create: `src/lib/agents/social-copywriter.ts`
- Create: `src/lib/agents/creative-director.ts`
- Create: `src/lib/agents/orchestrator.ts`
- Create: `src/lib/agents/orchestrator.test.ts`

- [ ] **Step 1: Create shared agent types**

Create `src/lib/agents/types.ts`:

```ts
import type { CampaignBrief, CampaignModule, CampaignModuleOutput, CampaignStrategy, RefineOutput } from "../campaign/types";

export type ResearchBrief = {
  summary: string;
  audienceInsights: string[];
  competitorPatterns: string[];
  marketOpportunities: string[];
  sourceNotes: string[];
};

export type AgentContext = {
  brief: CampaignBrief;
  mcpContext: string;
};

export type StrategyAgentInput = AgentContext & {
  research: ResearchBrief;
};

export type ModuleAgentInput = {
  brief: CampaignBrief;
  strategy: CampaignStrategy;
  module: CampaignModule;
  instructions?: string;
};

export type RefineAgentInput = {
  strategy: CampaignStrategy;
  originalText: string;
  instruction: string;
};

export type CampaignAgents = {
  research: (context: AgentContext) => Promise<ResearchBrief>;
  strategy: (input: StrategyAgentInput) => Promise<CampaignStrategy>;
  module: (input: ModuleAgentInput) => Promise<CampaignModuleOutput>;
  refine: (input: RefineAgentInput) => Promise<RefineOutput>;
};
```

- [ ] **Step 2: Implement market researcher**

Create `src/lib/agents/market-researcher.ts`:

```ts
import { completeJsonPrompt } from "../llm/client";
import type { AgentContext, ResearchBrief } from "./types";

export async function runMarketResearcher(context: AgentContext): Promise<ResearchBrief> {
  const prompt = [
    "Return only valid JSON matching ResearchBrief: summary, audienceInsights, competitorPatterns, marketOpportunities, sourceNotes.",
    "Analyze the startup brief and MCP context. If MCP context is empty, state assumptions in sourceNotes.",
    "Startup brief:",
    JSON.stringify(context.brief, null, 2),
    "MCP context:",
    context.mcpContext,
  ].join("\n\n");

  return JSON.parse(await completeJsonPrompt({ prompt, systemPrompt: "You are a market-research subagent for startup GTM campaigns." })) as ResearchBrief;
}
```

- [ ] **Step 3: Implement positioning strategist**

Create `src/lib/agents/positioning-strategist.ts`:

```ts
import { buildStrategyPrompt } from "../campaign/prompts";
import type { CampaignStrategy } from "../campaign/types";
import { completeJsonPrompt } from "../llm/client";
import type { StrategyAgentInput } from "./types";

export async function runPositioningStrategist(input: StrategyAgentInput): Promise<CampaignStrategy> {
  const prompt = [
    buildStrategyPrompt(input.brief),
    "Research brief:",
    JSON.stringify(input.research, null, 2),
    "MCP context:",
    input.mcpContext,
  ].join("\n\n");

  return JSON.parse(await completeJsonPrompt({ prompt, systemPrompt: "You are a positioning strategist for founder-led startup campaigns." })) as CampaignStrategy;
}
```

- [ ] **Step 4: Implement social copywriter**

Create `src/lib/agents/social-copywriter.ts`:

```ts
import { buildModulePrompt, buildRefinePrompt } from "../campaign/prompts";
import type { CampaignModuleOutput, RefineOutput } from "../campaign/types";
import { completeJsonPrompt } from "../llm/client";
import type { ModuleAgentInput, RefineAgentInput } from "./types";

export async function runSocialCopywriter(input: ModuleAgentInput): Promise<CampaignModuleOutput> {
  return JSON.parse(
    await completeJsonPrompt({
      prompt: buildModulePrompt(input),
      systemPrompt: "You are a platform-native social copywriting subagent for X, LinkedIn, and Instagram.",
    }),
  ) as CampaignModuleOutput;
}

export async function runCopyRefiner(input: RefineAgentInput): Promise<RefineOutput> {
  return JSON.parse(
    await completeJsonPrompt({
      prompt: buildRefinePrompt(input),
      systemPrompt: "You refine campaign copy while preserving strategy and brand voice.",
    }),
  ) as RefineOutput;
}
```

- [ ] **Step 5: Implement creative director**

Create `src/lib/agents/creative-director.ts`:

```ts
import { buildModulePrompt } from "../campaign/prompts";
import type { CampaignModuleOutput } from "../campaign/types";
import { completeJsonPrompt } from "../llm/client";
import type { ModuleAgentInput } from "./types";

export async function runCreativeDirector(input: ModuleAgentInput): Promise<CampaignModuleOutput> {
  return JSON.parse(
    await completeJsonPrompt({
      prompt: buildModulePrompt({ ...input, module: "creative" }),
      systemPrompt: "You are a creative director. Produce visual direction, carousel briefs, and image prompts. Do not generate images.",
    }),
  ) as CampaignModuleOutput;
}
```

- [ ] **Step 6: Implement orchestrator**

Create `src/lib/agents/orchestrator.ts`:

```ts
import type { CampaignBrief, CampaignModule, CampaignModuleOutput, CampaignStrategy, RefineOutput } from "../campaign/types";
import { formatMcpToolResults, runMcpResearchTools } from "../mcp/runtime";
import { runCreativeDirector } from "./creative-director";
import { runMarketResearcher } from "./market-researcher";
import { runPositioningStrategist } from "./positioning-strategist";
import { runCopyRefiner, runSocialCopywriter } from "./social-copywriter";
import type { CampaignAgents } from "./types";

const defaultAgents: CampaignAgents = {
  research: runMarketResearcher,
  strategy: runPositioningStrategist,
  module: async (input) => (input.module === "creative" ? runCreativeDirector(input) : runSocialCopywriter(input)),
  refine: runCopyRefiner,
};

export async function generateCampaignStrategy(brief: CampaignBrief, agents = defaultAgents): Promise<CampaignStrategy> {
  const mcpResults = await runMcpResearchTools({ briefText: buildBriefText(brief) });
  const mcpContext = formatMcpToolResults(mcpResults);
  const research = await agents.research({ brief, mcpContext });
  return agents.strategy({ brief, mcpContext, research });
}

export async function generateCampaignModule(input: {
  brief: CampaignBrief;
  strategy: CampaignStrategy;
  module: CampaignModule;
  instructions?: string;
}, agents = defaultAgents): Promise<CampaignModuleOutput> {
  return agents.module(input);
}

export async function refineCampaignOutput(input: {
  strategy: CampaignStrategy;
  originalText: string;
  instruction: string;
}, agents = defaultAgents): Promise<RefineOutput> {
  return agents.refine(input);
}

function buildBriefText(brief: CampaignBrief): string {
  return [
    brief.startupName,
    brief.productDescription,
    brief.targetAudience,
    brief.problemSolved,
    brief.landingPageUrl ?? "",
    brief.competitors.join(", "),
    brief.extraContext ?? "",
  ].filter(Boolean).join("\n");
}
```

- [ ] **Step 7: Test orchestrator order**

Create `src/lib/agents/orchestrator.test.ts`:

```ts
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
```

- [ ] **Step 8: Run agent tests**

Run:

```bash
npm run test -- src/lib/agents/orchestrator.test.ts
```

Expected: PASS.

---

### Task 5: Replace Server Campaign Calls

**Files:**
- Modify: `src/server/campaign.ts`
- Delete: `src/lib/cursor/agent.ts`
- Delete: `src/lib/cursor/model-check.ts`

- [ ] **Step 1: Rewrite server imports**

Change the top of `src/server/campaign.ts` from:

```ts
import { createServerFn } from "@tanstack/react-start";
import { checkConfiguredCursorModel } from "../lib/cursor/model-check";
import { createCampaignAgent } from "../lib/cursor/agent";
import { buildModulePrompt, buildRefinePrompt, buildStrategyPrompt } from "../lib/campaign/prompts";
```

to:

```ts
import { createServerFn } from "@tanstack/react-start";
import { checkLlmConfiguration } from "../lib/llm/client";
import { generateCampaignModule, generateCampaignStrategy, refineCampaignOutput } from "../lib/agents/orchestrator";
```

- [ ] **Step 2: Replace strategy endpoint**

Replace `generateStrategy` with:

```ts
export const generateStrategy = createServerFn({ method: "POST" })
  .inputValidator((input: CampaignBrief) => input)
  .handler(async ({ data }) => generateCampaignStrategy(data));
```

- [ ] **Step 3: Replace module endpoint**

Replace `generateModule` with:

```ts
export const generateModule = createServerFn({ method: "POST" })
  .inputValidator((input: GenerateModuleInput) => input)
  .handler(async ({ data }) => generateCampaignModule(data));
```

- [ ] **Step 4: Replace refine endpoint**

Replace `refineOutput` with:

```ts
export const refineOutput = createServerFn({ method: "POST" })
  .inputValidator((input: RefineInput) => input)
  .handler(async ({ data }) => refineCampaignOutput(data));
```

- [ ] **Step 5: Replace diagnostic endpoint**

Replace `checkModelConfiguration` with:

```ts
export const checkModelConfiguration = createServerFn({ method: "GET" }).handler(async () => checkLlmConfiguration());
```

- [ ] **Step 6: Remove obsolete JSON parser**

Delete `parseJsonResult` from `src/server/campaign.ts`; JSON parsing now lives inside typed subagents.

- [ ] **Step 7: Delete Cursor-specific files**

Delete:

```text
src/lib/cursor/agent.ts
src/lib/cursor/model-check.ts
```

---

### Task 6: Update UI and Docs Language

**Files:**
- Modify: `src/routes/index.tsx`
- Modify: `src/routes/__root.tsx`
- Modify: `docs/superpowers/specs/2026-04-30-marketing-campaign-agent-prd.md`
- Modify: `docs/superpowers/plans/2026-04-30-marketing-campaign-agent.md`

- [ ] **Step 1: Update UI label**

In `src/routes/index.tsx`, replace:

```tsx
<p className="eyebrow">Cursor SDK GTM Copilot</p>
```

with:

```tsx
<p className="eyebrow">DeepSeek + MCP GTM Copilot</p>
```

- [ ] **Step 2: Update root metadata if metadata is present**

If `src/routes/__root.tsx` contains title/meta configuration, replace Cursor wording with `DeepSeek + MCP GTM Copilot`. If it only renders `<Outlet />`, leave it unchanged.

- [ ] **Step 3: Update PRD architecture sections**

In `docs/superpowers/specs/2026-04-30-marketing-campaign-agent-prd.md`, update technical stack bullets to:

```md
- **Framework:** TanStack Start + React + Vite
- **Language:** TypeScript
- **LLM client:** OpenAI Node SDK
- **Primary provider:** DeepSeek through OpenAI-compatible API
- **Default base URL:** `https://api.deepseek.com/v1`
- **Default model:** `deepseek-v4-flash`
- **Agent runtime:** Custom TypeScript subagent orchestrator
- **MCP runtime:** Optional stdio MCP clients through `@modelcontextprotocol/client`
- **Styling:** Simple CSS modules or global CSS for v1
- **State:** React state only
- **Export:** Markdown and JSON generated client-side from current state
```

- [ ] **Step 4: Mark old Cursor plan superseded**

At the top of `docs/superpowers/plans/2026-04-30-marketing-campaign-agent.md`, add below the title:

```md
> **Superseded:** The Cursor SDK architecture in this plan has been replaced by `docs/superpowers/plans/2026-05-02-direct-deepseek-refactor.md`, which calls DeepSeek directly and implements custom TypeScript subagents plus optional MCP stdio tools.
```

---

### Task 7: Final Verification

**Files:**
- All changed files

- [ ] **Step 1: Install dependencies**

Run:

```bash
npm install --cache ./.npm-cache
```

Expected: install completes without using the broken global npm cache.

- [ ] **Step 2: Run tests**

Run:

```bash
npm run test
```

Expected: all tests pass, including LLM, MCP, and orchestrator tests.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: zero TypeScript errors.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: client and SSR builds complete successfully.

- [ ] **Step 5: Search for removed Cursor dependency in active source**

Run:

```bash
grep -R "@cursor/sdk\|CURSOR_API_KEY\|CURSOR_MODEL\|createCampaignAgent\|src/lib/cursor" src package.json .env.example --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.npm-cache
```

Expected: no matches.

- [ ] **Step 6: Manual DeepSeek smoke test**

Create `.env.local` with:

```env
OPENAI_API_KEY=your_deepseek_api_key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_DEFAULT_MODEL=deepseek-v4-flash
MCP_STDIO_SERVERS=[]
```

Run:

```bash
npm run dev
```

Expected: app starts, diagnostic banner says it is using `deepseek-v4-flash`, and Strategy Core generation works without Cursor.

- [ ] **Step 7: Manual MCP smoke test**

Install or reference one MCP stdio server and set:

```env
MCP_STDIO_SERVERS=[{"name":"filesystem","command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/Users/enes/Desktop/Dev/agent-marketing"]}]
```

Run:

```bash
npm run dev
```

Expected: Strategy Core generation still works. If the configured MCP server exposes research-like tools, its text tool results appear inside the research subagent context; if it does not expose research-like tools, generation continues with `No MCP research tools returned context.`

---

## Self-Review

- Spec coverage: The plan removes Cursor SDK while preserving agentic decomposition through custom subagents and preserving MCP capability through our own MCP client runtime.
- Placeholder scan: No unresolved placeholders remain; real secrets are represented only as `.env.local` values that must not be committed.
- Type consistency: `completeJsonPrompt`, `runMcpResearchTools`, `formatMcpToolResults`, `generateCampaignStrategy`, `generateCampaignModule`, and `refineCampaignOutput` are defined before server code imports them.
- Risk note: MCP tool schemas vary by server. V1 only auto-calls research-like tools with a `{ query }` argument. More advanced schema-aware tool calling should be a follow-up feature after the direct DeepSeek refactor is stable.
