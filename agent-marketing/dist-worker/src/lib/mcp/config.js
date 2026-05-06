export function getMcpStdioServers() {
    const rawConfig = process.env.MCP_STDIO_SERVERS ?? "[]";
    const parsed = JSON.parse(rawConfig);
    return parsed.map((server) => ({
        name: server.name,
        command: server.command,
        args: server.args ?? [],
        env: server.env,
        cwd: server.cwd,
    }));
}
