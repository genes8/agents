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
