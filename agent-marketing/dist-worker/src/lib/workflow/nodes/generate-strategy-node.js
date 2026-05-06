import { generateCampaignStrategy } from "../../agents/orchestrator";
import { saveStrategy } from "../../db/repositories/campaigns";
import { saveSource } from "../../db/repositories/sources";
export async function executeGenerateStrategyNode(db, input) {
    const { strategy, mcpResults } = await generateCampaignStrategy(input.brief);
    const sources = [];
    for (const result of mcpResults) {
        if (!result.extractedText)
            continue;
        sources.push(await saveSource(db, {
            campaignId: input.campaignId,
            runId: input.runId,
            sourceUrl: result.sourceUrl,
            title: result.title,
            snippet: (result.snippet ?? result.extractedText).slice(0, 500),
            confidence: result.confidence,
            serverName: result.serverName,
            toolName: result.toolName,
            usedIn: ["market_researcher"],
        }));
    }
    await saveStrategy(db, input.campaignId, strategy);
    return { strategy, sources };
}
