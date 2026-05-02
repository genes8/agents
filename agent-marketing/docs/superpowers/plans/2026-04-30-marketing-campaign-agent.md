# Marketing Campaign Agent Implementation Plan

> **Superseded:** The Cursor SDK architecture in this plan has been replaced by `docs/superpowers/plans/2026-05-02-direct-deepseek-refactor.md`, which calls DeepSeek directly and implements custom TypeScript subagents plus optional MCP stdio tools.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TanStack Start web app that uses Cursor SDK to generate startup GTM campaign strategy and modular social content for X, LinkedIn, and Instagram.

**Architecture:** The app is a full-stack TypeScript project. React renders a Guided Wizard + Results Workbench UI, while server-only functions create Cursor SDK agents using the local runtime and a custom Cursor model named `deepseek-v4-flash`. V1 stores all campaign state in the browser session and supports Markdown/JSON export instead of database persistence.

**Tech Stack:** TanStack Start, React, Vite, TypeScript, `@cursor/sdk`, Vitest, CSS.

---

## File Structure

Create the project from an empty workspace.

- `package.json` — scripts and dependencies.
- `tsconfig.json` — strict TypeScript config.
- `vite.config.ts` — Vite/Vitest config for TanStack Start.
- `.gitignore` — ignore dependencies, env files, build outputs, and visual brainstorming artifacts.
- `.env.example` — required Cursor/DeepSeek configuration documentation.
- `src/router.tsx` — TanStack router setup.
- `src/routes/__root.tsx` — root layout.
- `src/routes/index.tsx` — main campaign app page.
- `src/styles.css` — global UI styling.
- `src/lib/campaign/types.ts` — shared campaign request/response types.
- `src/lib/campaign/export.ts` — Markdown/JSON export helpers.
- `src/lib/campaign/prompts.ts` — prompt builders for strategy, modules, and refinement.
- `src/lib/cursor/model-check.ts` — verifies Cursor model availability.
- `src/lib/cursor/agent.ts` — creates Cursor SDK campaign agents.
- `src/server/campaign.ts` — server functions/actions for strategy, modules, and refinement.
- `src/components/BriefForm.tsx` — campaign brief input.
- `src/components/StrategyPanel.tsx` — Strategy Core renderer.
- `src/components/ModuleWorkbench.tsx` — module generation and rendering.
- `src/components/ExportActions.tsx` — copy/download controls.
- `src/lib/campaign/export.test.ts` — export helper tests.
- `src/lib/campaign/prompts.test.ts` — prompt builder tests.

---

### Task 1: Scaffold TanStack Start TypeScript Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/router.tsx`
- Create: `src/routes/__root.tsx`
- Create: `src/routes/index.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Create package manifest**

Create `package.json`:

```json
{
  "name": "agent-marketing",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@cursor/sdk": "latest",
    "@tanstack/react-router": "latest",
    "@tanstack/react-start": "latest",
    "vite": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Create strict TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 3: Create Vite config**

Create `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [tanstackStart()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create ignore and env examples**

Create `.gitignore`:

```gitignore
node_modules/
dist/
.vinxi/
.output/
.tanstack/
.env
.env.local
.superpowers/
coverage/
```

Create `.env.example`:

```env
CURSOR_API_KEY=your_cursor_api_key
CURSOR_MODEL=deepseek-v4-flash

# Optional direct OpenAI-compatible fallback, not required by Cursor SDK agent orchestration.
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_API_KEY=your_deepseek_api_key
OPENAI_DEFAULT_MODEL=deepseek-v4-flash
```

- [ ] **Step 5: Create minimal app routes**

Create `src/router.tsx`:

```tsx
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
```

Create `src/routes/__root.tsx`:

```tsx
import { Outlet, createRootRoute } from "@tanstack/react-router";
import "../styles.css";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return <Outlet />;
}
```

Create `src/routes/index.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Cursor SDK GTM Copilot</p>
        <h1>Build a campaign strategy before generating content.</h1>
        <p>
          Turn a startup brief into positioning, hooks, social copy, content calendars,
          and creative briefs for X, LinkedIn, and Instagram.
        </p>
      </section>
    </main>
  );
}
```

Create `src/styles.css`:

```css
:root {
  color: #111827;
  background: #f7f3ee;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button,
input,
textarea,
select {
  font: inherit;
}

.page-shell {
  min-height: 100vh;
  padding: 48px;
}

.hero-panel {
  border: 1px solid #e5d8c8;
  border-radius: 28px;
  background: #fffaf4;
  padding: 40px;
  box-shadow: 0 24px 80px rgb(31 23 13 / 8%);
}

.eyebrow {
  margin: 0 0 12px;
  color: #a85512;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h1 {
  max-width: 780px;
  margin: 0 0 16px;
  font-size: clamp(2.4rem, 5vw, 5rem);
  line-height: 0.95;
}

p {
  max-width: 720px;
  color: #57483a;
  font-size: 1.08rem;
  line-height: 1.7;
}
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 7: Verify scaffold**

Run: `npm run typecheck`

Expected: TypeScript completes without errors.

Run: `npm run build`

Expected: Vite/TanStack build completes without errors.

---

### Task 2: Define Campaign Domain Types and Export Helpers

**Files:**
- Create: `src/lib/campaign/types.ts`
- Create: `src/lib/campaign/export.ts`
- Create: `src/lib/campaign/export.test.ts`

- [ ] **Step 1: Create shared types**

Create `src/lib/campaign/types.ts`:

```ts
export type CampaignGoal = "awareness" | "waitlist" | "signup" | "demo" | "launch";

export type CampaignModule = "x" | "linkedin" | "instagram" | "calendar" | "creative";

export type CampaignBrief = {
  startupName: string;
  productDescription: string;
  targetAudience: string;
  problemSolved: string;
  campaignGoal: CampaignGoal;
  landingPageUrl?: string;
  competitors: string[];
  tone: string[];
  extraContext?: string;
};

export type CampaignStrategy = {
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

export type CampaignModuleOutput = {
  module: CampaignModule;
  title: string;
  summary: string;
  sections: Array<{
    title: string;
    items: string[];
  }>;
};

export type CampaignWorkspace = {
  brief: CampaignBrief;
  strategy: CampaignStrategy;
  modules: CampaignModuleOutput[];
};

export type RefineOutput = {
  revisedText: string;
  changeSummary: string;
};
```

- [ ] **Step 2: Write failing export tests**

Create `src/lib/campaign/export.test.ts`:

```ts
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
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npm run test -- src/lib/campaign/export.test.ts`

Expected: FAIL because `src/lib/campaign/export.ts` does not exist.

- [ ] **Step 4: Implement export helpers**

Create `src/lib/campaign/export.ts`:

```ts
import type { CampaignModuleOutput, CampaignWorkspace } from "./types";

export function exportCampaignAsJson(workspace: CampaignWorkspace): string {
  return JSON.stringify(workspace, null, 2);
}

export function exportCampaignAsMarkdown(workspace: CampaignWorkspace): string {
  const { brief, strategy, modules } = workspace;
  const lines: string[] = [
    `# ${brief.startupName} Campaign`,
    "",
    `**Goal:** ${brief.campaignGoal}`,
    `**Audience:** ${brief.targetAudience}`,
    "",
    "## Brief",
    "",
    brief.productDescription,
    "",
    `**Problem:** ${brief.problemSolved}`,
    "",
    "## Strategy Core",
    "",
    `### Market Summary`,
    strategy.marketSummary,
    "",
    `### ICP`,
    strategy.icp,
    "",
    `### Positioning`,
    strategy.positioningStatement,
    "",
    `### Pain Points`,
    ...toBulletList(strategy.painPoints),
    "",
    `### Messaging Pillars`,
    ...strategy.messagingPillars.flatMap((pillar) => [
      `- **${pillar.name}:** ${pillar.description}`,
      ...pillar.proofPoints.map((proofPoint) => `  - ${proofPoint}`),
    ]),
    "",
    `### Hooks`,
    ...toBulletList(strategy.hooks),
    "",
    `### Channel Strategy`,
    `- **X:** ${strategy.channelStrategy.x}`,
    `- **LinkedIn:** ${strategy.channelStrategy.linkedin}`,
    `- **Instagram:** ${strategy.channelStrategy.instagram}`,
  ];

  for (const moduleOutput of modules) {
    lines.push("", ...formatModule(moduleOutput));
  }

  return `${lines.join("\n")}\n`;
}

function formatModule(moduleOutput: CampaignModuleOutput): string[] {
  return [
    `## ${moduleOutput.title}`,
    "",
    moduleOutput.summary,
    "",
    ...moduleOutput.sections.flatMap((section) => [
      `### ${section.title}`,
      ...toBulletList(section.items),
      "",
    ]),
  ];
}

function toBulletList(items: string[]): string[] {
  return items.map((item) => `- ${item}`);
}
```

- [ ] **Step 5: Verify export tests pass**

Run: `npm run test -- src/lib/campaign/export.test.ts`

Expected: PASS.

---

### Task 3: Build Prompt Contracts for Cursor Agent Runs

**Files:**
- Create: `src/lib/campaign/prompts.ts`
- Create: `src/lib/campaign/prompts.test.ts`

- [ ] **Step 1: Write failing prompt tests**

Create `src/lib/campaign/prompts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildModulePrompt, buildRefinePrompt, buildStrategyPrompt } from "./prompts";
import type { CampaignBrief, CampaignStrategy } from "./types";

const brief: CampaignBrief = {
  startupName: "SignalForge",
  productDescription: "AI research assistant for B2B sales teams.",
  targetAudience: "B2B SaaS founders and sales leaders",
  problemSolved: "Sales teams waste time researching accounts manually.",
  campaignGoal: "demo",
  landingPageUrl: "https://example.com",
  competitors: ["Clay", "Apollo"],
  tone: ["sharp", "credible"],
};

const strategy: CampaignStrategy = {
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
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/lib/campaign/prompts.test.ts`

Expected: FAIL because `src/lib/campaign/prompts.ts` does not exist.

- [ ] **Step 3: Implement prompt builders**

Create `src/lib/campaign/prompts.ts`:

```ts
import type { CampaignBrief, CampaignModule, CampaignStrategy } from "./types";

type ModulePromptInput = {
  brief: CampaignBrief;
  strategy: CampaignStrategy;
  module: CampaignModule;
  instructions?: string;
};

type RefinePromptInput = {
  strategy: CampaignStrategy;
  originalText: string;
  instruction: string;
};

export function buildStrategyPrompt(brief: CampaignBrief): string {
  return [
    "You are a startup go-to-market campaign strategist.",
    "Use available web/search/MCP tools for research when they exist. If no tools are available, work from the supplied brief and state practical assumptions inside the JSON fields without adding prose outside JSON.",
    "Create Strategy Core before any social content.",
    "Return only valid JSON matching CampaignStrategy. Do not wrap in Markdown.",
    "CampaignStrategy fields: marketSummary, icp, painPoints, positioningStatement, messagingPillars, brandVoice, hooks, channelStrategy.",
    "Brief:",
    JSON.stringify(brief, null, 2),
  ].join("\n\n");
}

export function buildModulePrompt(input: ModulePromptInput): string {
  return [
    "You are a platform-specific social campaign producer.",
    `Generate the ${input.module} module for this startup campaign.`,
    "Use the Strategy Core as the source of truth. Keep copy specific, non-generic, and suitable for a startup founder.",
    "Return only valid JSON matching CampaignModuleOutput. Do not wrap in Markdown.",
    "CampaignModuleOutput fields: module, title, summary, sections. Each section has title and items.",
    input.instructions ? `Additional user instructions: ${input.instructions}` : "No additional user instructions.",
    "Brief:",
    JSON.stringify(input.brief, null, 2),
    "Strategy Core:",
    JSON.stringify(input.strategy, null, 2),
  ].join("\n\n");
}

export function buildRefinePrompt(input: RefinePromptInput): string {
  return [
    "You are refining one campaign content block while preserving the campaign strategy.",
    "Return only valid JSON matching RefineOutput. Do not wrap in Markdown.",
    "RefineOutput fields: revisedText, changeSummary.",
    `Instruction: ${input.instruction}`,
    "Original text:",
    input.originalText,
    "Strategy Core:",
    JSON.stringify(input.strategy, null, 2),
  ].join("\n\n");
}
```

- [ ] **Step 4: Verify prompt tests pass**

Run: `npm run test -- src/lib/campaign/prompts.test.ts`

Expected: PASS.

---

### Task 4: Implement Cursor SDK Agent Layer

**Files:**
- Create: `src/lib/cursor/model-check.ts`
- Create: `src/lib/cursor/agent.ts`

- [ ] **Step 1: Create model availability check**

Create `src/lib/cursor/model-check.ts`:

```ts
import { Cursor } from "@cursor/sdk";

export type ModelCheckResult = {
  configuredModel: string;
  available: boolean;
  availableModels: string[];
};

export async function checkConfiguredCursorModel(): Promise<ModelCheckResult> {
  const configuredModel = process.env.CURSOR_MODEL ?? "deepseek-v4-flash";
  const models = await Cursor.models.list();
  const availableModels = models.map((model) => model.id);

  return {
    configuredModel,
    available: availableModels.includes(configuredModel),
    availableModels,
  };
}
```

- [ ] **Step 2: Create agent factory**

Create `src/lib/cursor/agent.ts`:

```ts
import { Agent } from "@cursor/sdk";

export function getCursorModelId(): string {
  return process.env.CURSOR_MODEL ?? "deepseek-v4-flash";
}

export async function createCampaignAgent() {
  const apiKey = process.env.CURSOR_API_KEY;

  if (!apiKey) {
    throw new Error("Missing CURSOR_API_KEY. Add it to .env.local before generating campaigns.");
  }

  return Agent.create({
    apiKey,
    model: { id: getCursorModelId() },
    local: {
      cwd: process.cwd(),
      settingSources: ["project", "user"],
    },
    agents: {
      "market-researcher": {
        description: "Researches markets, audiences, competitors, and category narratives for startup campaigns.",
        prompt: "Use available research tools and provided URLs to produce concise, source-aware market insight for startup positioning.",
        model: "inherit",
      },
      "positioning-strategist": {
        description: "Turns research into ICP, positioning, pain points, messaging pillars, and hooks.",
        prompt: "Create sharp startup positioning that is specific, differentiated, and practical for founder-led distribution.",
        model: "inherit",
      },
      "social-copywriter": {
        description: "Writes platform-native copy for X, LinkedIn, and Instagram.",
        prompt: "Write concise, non-generic social copy with strong hooks, clear narrative, and platform-specific formatting.",
        model: "inherit",
      },
      "creative-director": {
        description: "Creates creative briefs, visual directions, carousel outlines, and image prompts.",
        prompt: "Define visual direction and image prompts. Do not call image generation APIs unless explicitly added later.",
        model: "inherit",
      },
    },
  });
}
```

- [ ] **Step 3: Typecheck Cursor layer**

Run: `npm run typecheck`

Expected: PASS.

---

### Task 5: Implement Server Campaign Actions

**Files:**
- Create: `src/server/campaign.ts`

- [ ] **Step 1: Create server action helpers**

Create `src/server/campaign.ts`:

```ts
import { createServerFn } from "@tanstack/react-start";
import { createCampaignAgent } from "../lib/cursor/agent";
import { buildModulePrompt, buildRefinePrompt, buildStrategyPrompt } from "../lib/campaign/prompts";
import type {
  CampaignBrief,
  CampaignModule,
  CampaignModuleOutput,
  CampaignStrategy,
  RefineOutput,
} from "../lib/campaign/types";

type GenerateModuleInput = {
  brief: CampaignBrief;
  strategy: CampaignStrategy;
  module: CampaignModule;
  instructions?: string;
};

type RefineInput = {
  strategy: CampaignStrategy;
  originalText: string;
  instruction: string;
};

export const generateStrategy = createServerFn({ method: "POST" })
  .validator((input: CampaignBrief) => input)
  .handler(async ({ data }) => {
    const agent = await createCampaignAgent();
    try {
      const run = await agent.send(buildStrategyPrompt(data));
      const result = await run.wait();
      return parseJsonResult<CampaignStrategy>(result.result, "CampaignStrategy");
    } finally {
      await agent[Symbol.asyncDispose]();
    }
  });

export const generateModule = createServerFn({ method: "POST" })
  .validator((input: GenerateModuleInput) => input)
  .handler(async ({ data }) => {
    const agent = await createCampaignAgent();
    try {
      const run = await agent.send(buildModulePrompt(data));
      const result = await run.wait();
      return parseJsonResult<CampaignModuleOutput>(result.result, "CampaignModuleOutput");
    } finally {
      await agent[Symbol.asyncDispose]();
    }
  });

export const refineOutput = createServerFn({ method: "POST" })
  .validator((input: RefineInput) => input)
  .handler(async ({ data }) => {
    const agent = await createCampaignAgent();
    try {
      const run = await agent.send(buildRefinePrompt(data));
      const result = await run.wait();
      return parseJsonResult<RefineOutput>(result.result, "RefineOutput");
    } finally {
      await agent[Symbol.asyncDispose]();
    }
  });

function parseJsonResult<T>(rawResult: string | undefined, label: string): T {
  if (!rawResult) {
    throw new Error(`${label} generation returned an empty response.`);
  }

  const cleaned = rawResult.trim().replace(/^```json\s*/u, "").replace(/```$/u, "").trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    throw new Error(`Could not parse ${label} JSON from agent response: ${(error as Error).message}`);
  }
}
```

- [ ] **Step 2: Typecheck server actions**

Run: `npm run typecheck`

Expected: PASS.

---

### Task 6: Build Guided Wizard + Workbench UI

**Files:**
- Create: `src/components/BriefForm.tsx`
- Create: `src/components/StrategyPanel.tsx`
- Create: `src/components/ModuleWorkbench.tsx`
- Create: `src/components/ExportActions.tsx`
- Modify: `src/routes/index.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Create brief form component**

Create `src/components/BriefForm.tsx`:

```tsx
import type { CampaignBrief, CampaignGoal } from "../lib/campaign/types";

type BriefFormProps = {
  brief: CampaignBrief;
  disabled: boolean;
  onChange: (brief: CampaignBrief) => void;
  onSubmit: () => void;
};

const campaignGoals: CampaignGoal[] = ["awareness", "waitlist", "signup", "demo", "launch"];

export function BriefForm({ brief, disabled, onChange, onSubmit }: BriefFormProps) {
  return (
    <form
      className="card form-card"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <p className="eyebrow">Step 1</p>
        <h2>Startup brief</h2>
        <p>Give the agent enough context to build a campaign strategy before it writes posts.</p>
      </div>

      <label>
        Startup name
        <input
          required
          value={brief.startupName}
          onChange={(event) => onChange({ ...brief, startupName: event.target.value })}
        />
      </label>

      <label>
        What does the product do?
        <textarea
          required
          rows={4}
          value={brief.productDescription}
          onChange={(event) => onChange({ ...brief, productDescription: event.target.value })}
        />
      </label>

      <label>
        Target audience
        <input
          required
          value={brief.targetAudience}
          onChange={(event) => onChange({ ...brief, targetAudience: event.target.value })}
        />
      </label>

      <label>
        Problem solved
        <textarea
          required
          rows={3}
          value={brief.problemSolved}
          onChange={(event) => onChange({ ...brief, problemSolved: event.target.value })}
        />
      </label>

      <label>
        Campaign goal
        <select
          value={brief.campaignGoal}
          onChange={(event) => onChange({ ...brief, campaignGoal: event.target.value as CampaignGoal })}
        >
          {campaignGoals.map((goal) => (
            <option key={goal} value={goal}>
              {goal}
            </option>
          ))}
        </select>
      </label>

      <label>
        Landing page URL
        <input
          value={brief.landingPageUrl ?? ""}
          onChange={(event) => onChange({ ...brief, landingPageUrl: event.target.value })}
        />
      </label>

      <label>
        Competitors, comma separated
        <input
          value={brief.competitors.join(", ")}
          onChange={(event) =>
            onChange({
              ...brief,
              competitors: event.target.value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
        />
      </label>

      <label>
        Tone, comma separated
        <input
          value={brief.tone.join(", ")}
          onChange={(event) =>
            onChange({
              ...brief,
              tone: event.target.value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
        />
      </label>

      <label>
        Extra context
        <textarea
          rows={4}
          value={brief.extraContext ?? ""}
          onChange={(event) => onChange({ ...brief, extraContext: event.target.value })}
        />
      </label>

      <button className="primary-button" disabled={disabled} type="submit">
        Generate Strategy Core
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create strategy panel**

Create `src/components/StrategyPanel.tsx`:

```tsx
import type { CampaignStrategy } from "../lib/campaign/types";

type StrategyPanelProps = {
  strategy: CampaignStrategy | null;
};

export function StrategyPanel({ strategy }: StrategyPanelProps) {
  if (!strategy) {
    return (
      <section className="card muted-card">
        <p className="eyebrow">Step 2</p>
        <h2>Strategy Core</h2>
        <p>Generate the strategy first. Social modules unlock after positioning is clear.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <p className="eyebrow">Step 2</p>
      <h2>Strategy Core</h2>
      <h3>Market summary</h3>
      <p>{strategy.marketSummary}</p>
      <h3>ICP</h3>
      <p>{strategy.icp}</p>
      <h3>Positioning</h3>
      <p>{strategy.positioningStatement}</p>
      <h3>Pain points</h3>
      <ul>{strategy.painPoints.map((point) => <li key={point}>{point}</li>)}</ul>
      <h3>Hooks</h3>
      <ul>{strategy.hooks.map((hook) => <li key={hook}>{hook}</li>)}</ul>
    </section>
  );
}
```

- [ ] **Step 3: Create module workbench**

Create `src/components/ModuleWorkbench.tsx`:

```tsx
import type { CampaignModule, CampaignModuleOutput, CampaignStrategy } from "../lib/campaign/types";

type ModuleWorkbenchProps = {
  strategy: CampaignStrategy | null;
  modules: CampaignModuleOutput[];
  disabled: boolean;
  onGenerate: (module: CampaignModule) => void;
};

const modules: Array<{ id: CampaignModule; label: string }> = [
  { id: "x", label: "X Campaign" },
  { id: "linkedin", label: "LinkedIn Campaign" },
  { id: "instagram", label: "Instagram Campaign" },
  { id: "calendar", label: "7/14-Day Calendar" },
  { id: "creative", label: "Creative Briefs" },
];

export function ModuleWorkbench({ strategy, modules: outputs, disabled, onGenerate }: ModuleWorkbenchProps) {
  return (
    <section className="card">
      <p className="eyebrow">Step 3</p>
      <h2>Module workbench</h2>
      <div className="module-grid">
        {modules.map((module) => (
          <button
            className="secondary-button"
            disabled={!strategy || disabled}
            key={module.id}
            onClick={() => onGenerate(module.id)}
            type="button"
          >
            {module.label}
          </button>
        ))}
      </div>

      <div className="output-stack">
        {outputs.map((output) => (
          <article className="output-card" key={`${output.module}-${output.title}`}>
            <h3>{output.title}</h3>
            <p>{output.summary}</p>
            {output.sections.map((section) => (
              <div key={section.title}>
                <h4>{section.title}</h4>
                <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create export actions**

Create `src/components/ExportActions.tsx`:

```tsx
import { exportCampaignAsJson, exportCampaignAsMarkdown } from "../lib/campaign/export";
import type { CampaignWorkspace } from "../lib/campaign/types";

type ExportActionsProps = {
  workspace: CampaignWorkspace | null;
};

export function ExportActions({ workspace }: ExportActionsProps) {
  const disabled = !workspace;

  return (
    <section className="card export-card">
      <p className="eyebrow">Step 4</p>
      <h2>Export</h2>
      <div className="module-grid">
        <button disabled={disabled} onClick={() => download("campaign.md", exportCampaignAsMarkdown(workspace!))} type="button">
          Download Markdown
        </button>
        <button disabled={disabled} onClick={() => download("campaign.json", exportCampaignAsJson(workspace!))} type="button">
          Download JSON
        </button>
      </div>
    </section>
  );
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 5: Wire main route to server functions**

Replace `src/routes/index.tsx` with:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BriefForm } from "../components/BriefForm";
import { ExportActions } from "../components/ExportActions";
import { ModuleWorkbench } from "../components/ModuleWorkbench";
import { StrategyPanel } from "../components/StrategyPanel";
import type { CampaignBrief, CampaignModule, CampaignModuleOutput, CampaignStrategy } from "../lib/campaign/types";
import { generateModule, generateStrategy } from "../server/campaign";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const initialBrief: CampaignBrief = {
  startupName: "",
  productDescription: "",
  targetAudience: "",
  problemSolved: "",
  campaignGoal: "awareness",
  landingPageUrl: "",
  competitors: [],
  tone: ["clear", "credible", "founder-led"],
  extraContext: "",
};

function HomePage() {
  const [brief, setBrief] = useState<CampaignBrief>(initialBrief);
  const [strategy, setStrategy] = useState<CampaignStrategy | null>(null);
  const [modules, setModules] = useState<CampaignModuleOutput[]>([]);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  const workspace = useMemo(() => {
    if (!strategy) return null;
    return { brief, strategy, modules };
  }, [brief, modules, strategy]);

  async function handleGenerateStrategy() {
    setError("");
    setStatus("Researching and building Strategy Core...");
    try {
      const result = await generateStrategy({ data: brief });
      setStrategy(result);
      setModules([]);
      setStatus("Strategy Core generated.");
    } catch (caught) {
      setError((caught as Error).message);
      setStatus("");
    }
  }

  async function handleGenerateModule(module: CampaignModule) {
    if (!strategy) return;
    setError("");
    setStatus(`Generating ${module} module...`);
    try {
      const result = await generateModule({ data: { brief, strategy, module } });
      setModules((current) => [...current, result]);
      setStatus(`${result.title} generated.`);
    } catch (caught) {
      setError((caught as Error).message);
      setStatus("");
    }
  }

  const busy = status.includes("...");

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Cursor SDK GTM Copilot</p>
        <h1>Build the campaign strategy before generating content.</h1>
        <p>
          A guided workspace for startup founders: research direction, positioning, X posts,
          LinkedIn campaigns, Instagram briefs, calendars, and image prompts.
        </p>
      </section>

      {status ? <div className="status-banner">{status}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="app-grid">
        <BriefForm brief={brief} disabled={busy} onChange={setBrief} onSubmit={handleGenerateStrategy} />
        <div className="workbench-stack">
          <StrategyPanel strategy={strategy} />
          <ModuleWorkbench disabled={busy} modules={modules} onGenerate={handleGenerateModule} strategy={strategy} />
          <ExportActions workspace={workspace} />
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Expand styles for full UI**

Append to `src/styles.css`:

```css
.app-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.85fr) minmax(420px, 1.35fr);
  gap: 24px;
  margin-top: 24px;
}

.workbench-stack,
.form-card {
  display: grid;
  gap: 18px;
}

.card {
  border: 1px solid #e5d8c8;
  border-radius: 24px;
  background: #fffaf4;
  padding: 24px;
  box-shadow: 0 16px 48px rgb(31 23 13 / 6%);
}

.muted-card {
  background: #f4eadf;
}

label {
  display: grid;
  gap: 8px;
  color: #2f251c;
  font-weight: 700;
}

input,
textarea,
select {
  width: 100%;
  border: 1px solid #dbc7b3;
  border-radius: 14px;
  background: #fff;
  color: #111827;
  padding: 12px 14px;
}

.primary-button,
.secondary-button,
.export-card button {
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 800;
  padding: 12px 16px;
}

.primary-button {
  background: #111827;
  color: #fffaf4;
}

.secondary-button,
.export-card button {
  background: #ead8c4;
  color: #261b12;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.module-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.output-stack {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.output-card {
  border: 1px solid #ead8c4;
  border-radius: 18px;
  background: #fff;
  padding: 18px;
}

.status-banner,
.error-banner {
  border-radius: 18px;
  margin-top: 20px;
  padding: 14px 18px;
  font-weight: 800;
}

.status-banner {
  background: #ecfdf5;
  color: #065f46;
}

.error-banner {
  background: #fef2f2;
  color: #991b1b;
}

@media (max-width: 980px) {
  .page-shell {
    padding: 24px;
  }

  .app-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 7: Verify UI typecheck and build**

Run: `npm run typecheck`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

---

### Task 7: Add Model Configuration Diagnostics

**Files:**
- Modify: `src/server/campaign.ts`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Add server diagnostic function**

Modify `src/server/campaign.ts` to import and expose model check:

```ts
import { checkConfiguredCursorModel } from "../lib/cursor/model-check";
```

Add this export below existing server functions:

```ts
export const checkModelConfiguration = createServerFn({ method: "GET" }).handler(async () => {
  if (!process.env.CURSOR_API_KEY) {
    return {
      ok: false,
      message: "Missing CURSOR_API_KEY. Add it to .env.local.",
    };
  }

  const result = await checkConfiguredCursorModel();

  if (!result.available) {
    return {
      ok: false,
      message: `Cursor model '${result.configuredModel}' is not available. Add DeepSeek custom model '${result.configuredModel}' in Cursor or change CURSOR_MODEL.`,
    };
  }

  return {
    ok: true,
    message: `Using Cursor model '${result.configuredModel}'.`,
  };
});
```

- [ ] **Step 2: Surface diagnostics in UI**

Modify `src/routes/index.tsx` imports:

```tsx
import { useEffect, useMemo, useState } from "react";
import { checkModelConfiguration, generateModule, generateStrategy } from "../server/campaign";
```

Add state inside `HomePage`:

```tsx
const [modelStatus, setModelStatus] = useState<string>("");
```

Add effect inside `HomePage`:

```tsx
useEffect(() => {
  void checkModelConfiguration()
    .then((result) => setModelStatus(result.message))
    .catch((caught) => setModelStatus((caught as Error).message));
}, []);
```

Render below the hero panel:

```tsx
{modelStatus ? <div className="status-banner">{modelStatus}</div> : null}
```

- [ ] **Step 3: Verify diagnostics compile**

Run: `npm run typecheck`

Expected: PASS.

---

### Task 8: Final Verification

**Files:**
- All project files

- [ ] **Step 1: Run tests**

Run: `npm run test`

Expected: all Vitest tests pass.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: TypeScript passes with zero errors.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: production build completes successfully.

- [ ] **Step 4: Run local app smoke test**

Run: `npm run dev`

Expected: app starts on a local Vite URL. Open the app and confirm the Guided Wizard + Workbench renders. If `CURSOR_API_KEY` is missing, the app should show an actionable configuration error instead of crashing.

- [ ] **Step 5: Real Cursor SDK smoke test**

Create `.env.local` with:

```env
CURSOR_API_KEY=your_cursor_api_key
CURSOR_MODEL=deepseek-v4-flash
```

Run: `npm run dev`

Expected: model diagnostic says `Using Cursor model 'deepseek-v4-flash'.` Generate Strategy Core for a short startup brief and confirm a Strategy Core appears in the workbench.

---

## Self-Review

- Spec coverage: The plan covers TanStack Start scaffold, Cursor SDK agent creation, DeepSeek custom model configuration, MCP setting sources, Strategy Core, platform modules, export, and diagnostics.
- Placeholder scan: No unresolved placeholders remain; every task includes concrete files, code, commands, and expected outcomes.
- Type consistency: Shared types are defined before use and reused by prompts, server functions, UI, and export helpers.
