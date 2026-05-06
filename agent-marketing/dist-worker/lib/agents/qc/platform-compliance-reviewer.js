import { completeStructuredPromptWithRecovery } from "../../llm/client";
import { QcReviewResultSchema } from "../../campaign/schemas";
const SCHEMA = `{
  "reviewer": "platform_compliance",
  "verdict": "pass | warn | fail",
  "issues": [{ "severity": "error | warning | info", "message": "string" }],
  "suggestedEdits": ["string"],
  "confidence": 0.0,
  "linkedSourceIds": []
}`;
const PLATFORM_RULES = `Platform-specific rules:
- X (Twitter): posts should be concise (ideally under 280 chars for main copy); avoid excessive hashtags (max 2-3); no engagement bait ("RT to win").
- LinkedIn: professional tone; no excessive exclamation marks; sponsored content must be clearly labeled if paid; no misleading headlines.
- Instagram: visual-first; captions can be longer but should start with a hook; hashtags up to 30 allowed but 5-10 is best practice; no link bait.
- Content calendar: ensure cadence is realistic (no more than 2x/day across channels).
- Creative/image prompts: must not request depiction of real people, logos of competitors, or copyrighted characters.`;
export async function runPlatformComplianceReviewer(input) {
    const prompt = [
        "Return only valid JSON matching this exact schema:",
        SCHEMA,
        "You are a platform-compliance reviewer. Check the campaign module against platform content policies and best practices.",
        PLATFORM_RULES,
        "Set verdict to 'fail' for policy violations, 'warn' for best-practice misses, 'pass' if compliant.",
        "Campaign brief:",
        JSON.stringify(input.brief, null, 2),
        "Module to review:",
        JSON.stringify(input.moduleOutput, null, 2),
    ].join("\n\n");
    return completeStructuredPromptWithRecovery(QcReviewResultSchema, {
        prompt,
        systemPrompt: "You are a platform-compliance QC reviewer. Return only valid JSON.",
    });
}
