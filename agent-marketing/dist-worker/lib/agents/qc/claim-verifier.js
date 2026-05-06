import { completeStructuredPromptWithRecovery } from "../../llm/client";
import { QcReviewResultSchema } from "../../campaign/schemas";
const SCHEMA = `{
  "reviewer": "claim_verifier",
  "verdict": "pass | warn | fail",
  "issues": [{ "severity": "error | warning | info", "message": "string" }],
  "suggestedEdits": ["string"],
  "confidence": 0.0,
  "linkedSourceIds": ["source-id-string"]
}`;
export async function runClaimVerifier(input) {
    const sourceList = input.sources.length > 0
        ? input.sources
            .map((s) => `ID: ${s.id} | ${s.title ?? ""} | ${s.snippet ?? ""} | ${s.sourceUrl ?? ""}`)
            .join("\n")
        : "No sources available.";
    const prompt = [
        "Return only valid JSON matching this exact schema:",
        SCHEMA,
        "You are a claim-verification reviewer. Identify factual claims in the module content and check each against the provided sources.",
        "Rules:",
        "- Superlatives like '#1', 'best', 'fastest', 'most trusted', 'market leader' require source evidence. Flag as error if unsupported.",
        "- Quantitative claims (percentages, statistics, growth figures) require source evidence. Flag as error if unsupported.",
        "- General positioning statements that are subjective opinions do not require sources (flag as info at most).",
        "- If a claim IS supported by a source, include that source's ID in linkedSourceIds.",
        "- Set verdict to 'fail' if any unsupported factual claim with error severity exists, 'warn' for warnings, 'pass' if all claims are supported or subjective.",
        "Campaign brief:",
        JSON.stringify(input.brief, null, 2),
        "Module to review:",
        JSON.stringify(input.moduleOutput, null, 2),
        "Available sources (use IDs for linkedSourceIds):",
        sourceList,
    ].join("\n\n");
    return completeStructuredPromptWithRecovery(QcReviewResultSchema, {
        prompt,
        systemPrompt: "You are a claim-verification QC reviewer. Return only valid JSON.",
    });
}
