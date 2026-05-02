# Tech Stack

## Application Stack

- **Frontend / full-stack framework:** TanStack Start
- **Router:** TanStack Router
- **Build tool / dev server:** Vite
- **UI library:** React
- **Language:** TypeScript
- **Styling:** Global CSS
- **State management:** React local state
- **Testing:** Vitest
- **Package manager:** npm

## AI / Agent Stack

- **LLM client:** OpenAI Node SDK
- **Primary LLM provider:** DeepSeek through an OpenAI-compatible API
- **Default model:** `deepseek-v4-flash`
- **Default base URL:** `https://api.deepseek.com/v1`
- **Agent orchestration:** Custom TypeScript subagent runtime

## Subagents

- **Market researcher:** Builds research context and audience/category insights.
- **Positioning strategist:** Converts research into ICP, positioning, pain points, messaging pillars, and hooks.
- **Social copywriter:** Generates platform-native copy for X, LinkedIn, and Instagram.
- **Creative director:** Generates creative direction, carousel outlines, visual briefs, and image prompts.

## MCP Runtime

- **MCP client:** `@modelcontextprotocol/client`
- **Transport:** stdio MCP servers
- **Configuration:** `MCP_STDIO_SERVERS`
- **Purpose:** Optional tool runtime for research/search/scraping-style context before LLM generation.

## Persistence and Export

- **Persistence:** None in v1; campaign state lives in the current browser session.
- **Exports:** Markdown and JSON.

## Backend Shape

The app does have backend code, but it is not a separate Express/Fastify/Nest server. TanStack Start provides server-side functions inside the same full-stack application. In this project, backend logic lives in `src/server/campaign.ts` and calls the custom agent orchestrator, DeepSeek client, and optional MCP runtime from server-only code.
