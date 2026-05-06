import { completeStructuredPromptWithRecovery } from "../../llm/client";
import { QcReviewResultSchema } from "../../campaign/schemas";
const SCHEMA = `{
  "reviewer": "tone_consistency",
  "verdict": "pass | warn | fail",
  "issues": [{ "severity": "error | warning | info", "message": "string" }],
  "suggestedEdits": ["string"],
  "confidence": 0.0,
  "linkedSourceIds": []
}`;
export async function runToneConsistencyReviewer(input) {
    const desiredTone = input.brief.tone.join(", ") || "not specified";
    const prompt = [
        "Return only valid JSON matching this exact schema:",
        SCHEMA,
        "You are a tone-consistency reviewer. Evaluate whether the campaign module matches the desired brand tone.",
        `Desired tone: ${desiredTone}`,
        "Check for:",
        "- Passages that contradict the desired tone (e.g., overly casual when 'professional' is required)",
        "- Inconsistent voice across sections within the module",
        "- Mismatches between the module's channel (X/LinkedIn/Instagram) and its tone",
        "Set verdict to 'fail' for severe tone mismatches, 'warn' for minor drift, 'pass' if consistent.",
        "Campaign brief:",
        JSON.stringify(input.brief, null, 2),
        "Module to review:",
        JSON.stringify(input.moduleOutput, null, 2),
    ].join("\n\n");
    return completeStructuredPromptWithRecovery(QcReviewResultSchema, {
        prompt,
        systemPrompt: "You are a tone-consistency QC reviewer. Return only valid JSON.",
    });
}
