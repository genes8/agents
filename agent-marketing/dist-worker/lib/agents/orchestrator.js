import { formatMcpToolResults, runMcpResearchTools } from "../mcp/runtime";
import { runCreativeDirector } from "./creative-director";
import { runMarketResearcher } from "./market-researcher";
import { runPositioningStrategist } from "./positioning-strategist";
import { runCopyRefiner, runSocialCopywriter } from "./social-copywriter";
const defaultAgents = {
    research: runMarketResearcher,
    strategy: runPositioningStrategist,
    module: async (input) => (input.module === "creative" ? runCreativeDirector(input) : runSocialCopywriter(input)),
    refine: runCopyRefiner,
};
export async function generateCampaignStrategy(brief, agents = defaultAgents) {
    const mcpResults = await runMcpResearchTools({ briefText: buildBriefText(brief) });
    const mcpContext = formatMcpToolResults(mcpResults);
    const research = await agents.research({ brief, mcpContext });
    const strategy = await agents.strategy({ brief, mcpContext, research });
    return { strategy, mcpResults };
}
export async function generateCampaignModule(input, agents = defaultAgents) {
    return agents.module(input);
}
export async function refineCampaignOutput(input, agents = defaultAgents) {
    return agents.refine(input);
}
function buildBriefText(brief) {
    return [
        brief.startupName,
        brief.productDescription,
        brief.targetAudience,
        brief.problemSolved,
        brief.landingPageUrl ?? "",
        brief.competitors.join(", "),
        brief.extraContext ?? "",
    ].filter(Boolean).join("\n");
}
