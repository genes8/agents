import { getMcpStdioServers, type McpStdioServerConfig } from "./config";

type McpContent = { type: string; text?: string } & Record<string, unknown>;

export type McpToolResult = {
  serverName: string;
  toolName: string;
  content: McpContent[];
  extractedText: string;
  sourceUrl?: string;
  title?: string;
  snippet?: string;
  confidence?: number;
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
    try {
      connectedClients.push(await connectStdioMcpClient(config));
    } catch (error) {
      await Promise.allSettled(connectedClients.map(({ client }) => client.close()));
      throw error;
    }
  }

  return connectedClients;
}

async function connectStdioMcpClient(config: McpStdioServerConfig): Promise<ConnectedMcpClient> {
  const { Client, StdioClientTransport } = await import("@modelcontextprotocol/client");
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
          const metadata = extractMcpMetadata(result.content);

          results.push({ serverName, toolName: tool.name, content: result.content, ...metadata });
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

function extractMcpMetadata(content: McpContent[]): Pick<
  McpToolResult,
  "extractedText" | "sourceUrl" | "title" | "snippet" | "confidence"
> {
  const textItems = content
    .filter((item) => item.type === "text")
    .map((item) => item.text ?? "")
    .filter(Boolean);
  const text = textItems.join("\n").trim();

  for (const item of textItems) {
    const parsed = tryParseJsonObject(item);
    if (parsed) {
      const snippet = stringField(parsed, "snippet") ?? stringField(parsed, "text") ?? text;
      return {
        extractedText: snippet,
        sourceUrl: stringField(parsed, "sourceUrl") ?? stringField(parsed, "url"),
        title: stringField(parsed, "title"),
        snippet,
        confidence: numberField(parsed, "confidence"),
      };
    }
  }

  for (const item of content) {
    if (item.type === "text") continue;
    const parsed = objectFields(item);
    const snippet = stringField(parsed, "snippet") ?? stringField(parsed, "text") ?? JSON.stringify(parsed);
    return {
      extractedText: snippet,
      sourceUrl: stringField(parsed, "sourceUrl") ?? stringField(parsed, "url"),
      title: stringField(parsed, "title"),
      snippet,
      confidence: numberField(parsed, "confidence"),
    };
  }

  return { extractedText: text, snippet: text || undefined };
}

function tryParseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function objectFields(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "type"));
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  return typeof field === "string" && field.trim() ? field : undefined;
}

function numberField(value: Record<string, unknown>, key: string): number | undefined {
  const field = value[key];
  return typeof field === "number" && Number.isFinite(field) ? field : undefined;
}

export function formatMcpToolResults(results: McpToolResult[]): string {
  if (results.length === 0) {
    return "MCP Research Context: No MCP research tools returned context.";
  }

  return [
    "MCP Research Context:",
    ...results.flatMap((result) => [
      `Source: ${result.serverName}.${result.toolName}`,
      result.extractedText || result.content.map((item) => (item.type === "text" ? item.text ?? "" : JSON.stringify(item))).join("\n"),
    ]),
  ].join("\n");
}
