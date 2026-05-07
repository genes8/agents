export type McpStdioServerConfig = {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
};

export type McpHttpServerConfig = {
  name: string;
  url: string;
};

export type McpServerConfig = McpStdioServerConfig | McpHttpServerConfig;

function isHttpConfig(config: McpServerConfig): config is McpHttpServerConfig {
  return "url" in config;
}

export function getMcpServers(): McpServerConfig[] {
  const rawStdio = process.env.MCP_STDIO_SERVERS ?? "[]";
  const rawHttp = process.env.MCP_HTTP_SERVERS ?? "[]";

  const stdioServers = (JSON.parse(rawStdio) as McpStdioServerConfig[]).map((server) => ({
    name: server.name,
    command: server.command,
    args: server.args ?? [],
    env: server.env,
    cwd: server.cwd,
  }));

  const httpServers = (JSON.parse(rawHttp) as McpHttpServerConfig[]).map((server) => ({
    name: server.name,
    url: server.url,
  }));

  return [...stdioServers, ...httpServers];
}

export { isHttpConfig };
