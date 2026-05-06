import { completeStructuredPrompt } from "../llm/client";
import { ResearchBriefSchema } from "./schemas";
const RESEARCH_BRIEF_SCHEMA = `{
  "summary": "string — one paragraph overview of the market",
  "audienceInsights": ["string", "..."],
  "competitorPatterns": ["string", "..."],
  "marketOpportunities": ["string", "..."],
  "sourceNotes": ["string", "..."]
}`;
export async function runMarketResearcher(context) {
    const prompt = [
        "Return only valid JSON matching this exact schema (all array fields must be JSON arrays of strings, not a single string):",
        RESEARCH_BRIEF_SCHEMA,
        "Analyze the startup brief and MCP context. If MCP context is empty, state assumptions in sourceNotes.",
        "Startup brief:",
        JSON.stringify(context.brief, null, 2),
        "MCP context:",
        context.mcpContext,
    ].join("\n\n");
    return completeStructuredPrompt(ResearchBriefSchema, {
        prompt,
        systemPrompt: "You are a market-research subagent for startup GTM campaigns.",
    });
}
