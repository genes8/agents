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
