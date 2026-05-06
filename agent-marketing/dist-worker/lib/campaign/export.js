export function exportCampaignAsJson(workspace) {
    return JSON.stringify(workspace, null, 2);
}
export function exportCampaignAsMarkdown(workspace) {
    const { brief, strategy, modules } = workspace;
    const lines = [
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
function formatModule(moduleOutput) {
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
function toBulletList(items) {
    return items.map((item) => `- ${item}`);
}
