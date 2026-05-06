import { completeStructuredPromptWithRecovery } from "../../llm/client";
import { QcReviewResultSchema } from "../../campaign/schemas";
const SCHEMA = `{
  "reviewer": "brand_safety",
  "verdict": "pass | warn | fail",
  "issues": [{ "severity": "error | warning | info", "message": "string" }],
  "suggestedEdits": ["string"],
  "confidence": 0.0,
  "linkedSourceIds": []
}`;
export async function runBrandSafetyReviewer(input) {
    const sourceTitles = input.sources.map((s) => s.title ?? s.sourceUrl ?? s.id).join(", ") || "none";
    const prompt = [
        "Return only valid JSON matching this exact schema:",
        SCHEMA,
        "You are a brand-safety reviewer. Evaluate the campaign module for:",
        "- Hate speech, discrimination, or offensive language",
        "- Misleading or deceptive framing",
        "- Controversial political or social content",
        "- Content that could embarrass the brand or violate platform policies",
        "Set verdict to 'fail' if any error-severity issue exists, 'warn' for warnings only, 'pass' if clean.",
        "Campaign brief:",
        JSON.stringify(input.brief, null, 2),
        "Module to review:",
        JSON.stringify(input.moduleOutput, null, 2),
        "Available sources:",
        sourceTitles,
    ].join("\n\n");
    return completeStructuredPromptWithRecovery(QcReviewResultSchema, {
        prompt,
        systemPrompt: "You are a brand-safety QC reviewer. Return only valid JSON.",
    });
}
