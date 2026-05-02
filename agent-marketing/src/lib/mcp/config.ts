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
