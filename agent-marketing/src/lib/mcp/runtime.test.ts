import { describe, expect, it, vi } from "vitest";
import { formatMcpToolResults, runMcpResearchTools, type McpRuntimeClient } from "./runtime";

describe("MCP runtime", () => {
  it("formats text tool results for prompt context", () => {
    const context = formatMcpToolResults([
      {
        serverName: "search",
        toolName: "web_search",
        content: [{ type: "text", text: "Competitor A focuses on enterprise." }],
        extractedText: "Competitor A focuses on enterprise.",
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
    expect(results[0].extractedText).toBe("Market result");
    expect(fakeClient.callTool).toHaveBeenCalledWith({
      name: "web_search",
      arguments: { query: "Research SignalForge competitors" },
    });
  });

  it("extracts source metadata from JSON text tool results", async () => {
    const fakeClient: McpRuntimeClient = {
      listTools: vi.fn().mockResolvedValue({
        tools: [{ name: "web_search", description: "Search the web" }],
      }),
      callTool: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              url: "https://example.com/report",
              title: "Market Report",
              snippet: "Enterprise buyers are increasing AI GTM spend.",
              confidence: 0.82,
            }),
          },
        ],
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    const results = await runMcpResearchTools({
      briefText: "Research enterprise GTM",
      clients: [{ serverName: "search", client: fakeClient }],
    });

    expect(results[0]).toMatchObject({
      sourceUrl: "https://example.com/report",
      title: "Market Report",
      snippet: "Enterprise buyers are increasing AI GTM spend.",
      confidence: 0.82,
    });
    expect(results[0].extractedText).toContain("Enterprise buyers are increasing AI GTM spend.");
  });

  it("falls back to text snippets when metadata is malformed", async () => {
    const fakeClient: McpRuntimeClient = {
      listTools: vi.fn().mockResolvedValue({
        tools: [{ name: "web_search", description: "Search the web" }],
      }),
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "{not-valid-json" }],
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    const results = await runMcpResearchTools({
      briefText: "Research malformed output",
      clients: [{ serverName: "search", client: fakeClient }],
    });

    expect(results[0].extractedText).toBe("{not-valid-json");
    expect(results[0].snippet).toBe("{not-valid-json");
    expect(results[0].sourceUrl).toBeUndefined();
    expect(results[0].title).toBeUndefined();
    expect(results[0].confidence).toBeUndefined();
  });
});
