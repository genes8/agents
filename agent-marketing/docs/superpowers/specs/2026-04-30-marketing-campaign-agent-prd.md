# Marketing Campaign Agent PRD

> **Last updated:** 2026-05-04. This PRD has been significantly updated to reflect the current implemented state. Original v1 non-goals (no database, no campaign history) have been superseded by the working implementation which includes SQLite persistence, campaign history, QC reviews, chat refinement, and export tracking. See `docs/CHANGELOG.md` for the full history of changes.

**Date:** 2026-04-30  
**Product:** Startup marketing campaign generator  
**Primary user:** Startup founder or in-house startup team  
**Primary outcome:** Turn a product/startup brief into a focused go-to-market campaign for X, LinkedIn, and Instagram.

---

## 1. Problem

Early-stage startups need to create market awareness quickly, but founders often move from “we need posts” directly to disconnected content. The missing step is usually a clear campaign strategy: ICP, positioning, pain points, hooks, channel-specific narrative, and visual direction.

This product should act as a GTM copilot, not a generic copy generator. It should help the founder define the campaign direction first, then generate modular social deliverables that stay consistent with that direction.

---

## 2. Goals

- Create a full-stack web app with a guided campaign workflow.
- Use DeepSeek (via OpenAI-compatible API) with custom TypeScript subagents for strategy and content generation.
- Support `deepseek-v4-flash` model via `OPENAI_BASE_URL` and `OPENAI_API_KEY` environment variables.
- Prioritize X, LinkedIn, and Instagram in v1.
- Generate strategy, social copy, content calendar, creative briefs, and image prompts.
- Persist campaigns in SQLite with Drizzle ORM, including campaign history, QC reviews, chat messages, and export tracking.
- Keep v1 exportable: users can download Markdown/JSON exports after QC approval.

---

## 3. Non-Goals for v1

- No real user accounts (single `DEFAULT_USER_ID` placeholder).
- No direct image generation.
- No social scheduling/publishing integrations.
- No analytics ingestion.
- No multi-tenant SaaS infrastructure.
- No payment flow.
- No real-time updates (no WebSocket/SSE).

---

## 4. Target User

The v1 user is a startup founder who wants to break into the market. They need fast campaign strategy and platform-specific content without hiring a full marketing team.

The tool should assume the user may know the product deeply but may not know how to translate that product into positioning, hooks, and repeatable content pillars.

---

## 5. Product Shape

The app uses a **Guided Wizard + Results Workbench** interface.

The wizard guides the user through campaign creation. The workbench displays generated strategy and deliverables, with actions to copy, refine, export, and generate additional modules.

### Primary Workflow

1. User enters startup/campaign brief.
2. Backend creates a Cursor SDK agent run.
3. Agent produces Strategy Core.
4. User selects one or more modules.
5. Agent generates selected module output using the Strategy Core as context.
6. User refines individual blocks or exports the result.

---

## 6. V1 Modules

### 6.1 Strategy Core

Strategy Core is required before module generation.

Output:

- market summary
- ICP / buyer persona
- core pain points
- positioning statement
- messaging pillars
- proof points
- brand voice guidelines
- hooks
- channel strategy for X, LinkedIn, and Instagram

### 6.2 X Campaign Module

Output:

- single-post ideas
- thread outlines
- launch posts
- authority/opinion posts
- engagement prompts
- CTA variations

### 6.3 LinkedIn Campaign Module

Output:

- founder-led posts
- thought-leadership posts
- educational problem/solution posts
- launch announcement variants
- carousel outline copy
- demo/signup/waitlist CTA variants

### 6.4 Instagram Campaign Module

Output:

- captions
- carousel slide outlines
- reel/script ideas
- visual direction brief
- image prompts for covers, carousel scenes, and branded creatives

### 6.5 Calendar Module

Output:

- 7-day or 14-day content calendar
- cross-platform adaptation of core campaign ideas
- recommended posting sequence

### 6.6 Creative Module

Output:

- creative direction
- visual principles
- image prompts
- carousel art direction
- format-specific creative briefs

---

## 7. Technical Stack

- **Framework:** TanStack Start + React + Vite
- **Language:** TypeScript
- **LLM client:** OpenAI Node SDK
- **Primary provider:** DeepSeek through OpenAI-compatible API
- **Default base URL:** `https://api.deepseek.com/v1`
- **Default model:** `deepseek-v4-flash`
- **Agent runtime:** Custom TypeScript subagent orchestrator (market researcher, positioning strategist, social copywriter, creative director)
- **QC system:** 5 parallel reviewers (brand safety, claim verifier, platform compliance, tone consistency, conversion)
- **MCP runtime:** Optional stdio MCP clients through `@modelcontextprotocol/client`
- **Database:** SQLite via `better-sqlite3` + Drizzle ORM
- **Styling:** Global CSS (dark editorial theme)
- **State:** Persisted SQLite campaign state + React presentation state
- **Export:** Markdown and JSON downloads gated behind QC approval
- **Testing:** Vitest (94 tests, 14 files)

---

## 8. Model and Provider Requirements

The app must not assume Cursor SDK accepts `OPENAI_BASE_URL` directly in `Agent.create()`. The primary path is Cursor SDK model selection:

```ts
model: { id: process.env.CURSOR_MODEL ?? "deepseek-v4-flash" }
```

The Cursor account must have a custom model named `deepseek-v4-flash` configured with:

- DeepSeek API key
- OpenAI-compatible base URL: `https://api.deepseek.com/v1`
- matching model name/provider configuration in Cursor settings

Optional direct OpenAI-compatible fallback env vars may exist, but they are not required for v1 agent orchestration:

```env
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_API_KEY=...
OPENAI_DEFAULT_MODEL=deepseek-v4-flash
```

---

## 9. MCP and Research Behavior

The app should load project and user MCP settings for local Cursor SDK agents:

```ts
local: {
  cwd: process.cwd(),
  settingSources: ["project", "user"],
}
```

Research behavior must be honest:

- If web/search/scraping MCP tools are configured, the agent should use them for market and competitor research.
- If no research tools are available, the agent should work from the user-provided brief, URLs, competitors, and pasted context.
- The UI should tell the user that research quality improves when MCP search tools or relevant URLs are provided.

---

## 10. Backend API Contract

The backend exposes server-only functions or API routes for three operations.

### Generate Strategy

Input:

```ts
type CampaignBrief = {
  startupName: string;
  productDescription: string;
  targetAudience: string;
  problemSolved: string;
  campaignGoal: "awareness" | "waitlist" | "signup" | "demo" | "launch";
  landingPageUrl?: string;
  competitors?: string[];
  tone?: string[];
  extraContext?: string;
};
```

Output:

```ts
type CampaignStrategy = {
  marketSummary: string;
  icp: string;
  painPoints: string[];
  positioningStatement: string;
  messagingPillars: Array<{
    name: string;
    description: string;
    proofPoints: string[];
  }>;
  brandVoice: {
    tone: string[];
    avoid: string[];
  };
  hooks: string[];
  channelStrategy: {
    x: string;
    linkedin: string;
    instagram: string;
  };
};
```

### Generate Module

Input:

```ts
type ModuleRequest = {
  brief: CampaignBrief;
  strategy: CampaignStrategy;
  module: "x" | "linkedin" | "instagram" | "calendar" | "creative";
  instructions?: string;
};
```

Output:

```ts
type CampaignModuleOutput = {
  module: ModuleRequest["module"];
  title: string;
  summary: string;
  sections: Array<{
    title: string;
    items: string[];
  }>;
};
```

### Refine Output

Input:

```ts
type RefineRequest = {
  strategy: CampaignStrategy;
  originalText: string;
  instruction: string;
};
```

Output:

```ts
type RefineOutput = {
  revisedText: string;
  changeSummary: string;
};
```

---

## 11. UX Requirements

- The first screen should clearly explain that the app builds a campaign strategy before generating content.
- The brief form should be short enough to complete quickly but specific enough to produce useful output.
- The workbench should display Strategy Core first.
- Module buttons should stay disabled until Strategy Core exists.
- Already-generated modules should be visually distinct (active style + checkmark).
- Each generated section should have copy controls.
- Export should support Markdown and JSON, gated behind QC approval.
- Loading states should explain what the agent is doing: researching, positioning, generating copy, or refining.
- Errors should be actionable, especially missing `OPENAI_API_KEY`.
- Campaign state should be visible as a colored pill at all times (draft, approved, exported, etc.).
- QC review panel should show reviewer verdicts, issues, and suggested edits with Approve/Reject actions.
- Chat should support freeform questions and refinement requests with conversation memory.
- Campaign history sidebar should list all past campaigns with their workflow state.
- Source panel should show MCP research attribution with confidence scores and URLs.

---

## 12. Success Criteria

V1 is successful when a user can:

1. Start the dev server.
2. Enter a startup brief.
3. Generate Strategy Core through DeepSeek using `deepseek-v4-flash`.
4. Generate at least one module for X, LinkedIn, or Instagram.
5. See automated QC review results with verdicts and issues.
6. Approve or request revisions on QC review.
7. Chat with the assistant about the campaign (with conversation memory).
8. Export the campaign as Markdown or JSON after approval.
9. Re-export from the exported state without issues.
10. See clear errors if API key configuration is missing.
11. Browse campaign history and reload past campaigns.

---

## 13. Open Decisions Deferred After V1

- Which image generation provider to use.
- Whether to add real login and multi-user support (replacing `DEFAULT_USER_ID`).
- Whether to support scheduling/publishing integrations.
- Whether to add analytics feedback loops.
- Whether to add run history UI (generation run logs with latency and state transitions).
- Whether to add per-module QC drill-down.
- Whether to add WebSocket/SSE for real-time updates.
