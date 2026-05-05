import { completeStructuredPromptWithRecovery } from "../../llm/client";
import { QcReviewResultSchema } from "../../campaign/schemas";
import type { QcReviewResult } from "../../campaign/types";
import type { QcReviewerInput } from "../types";

const SCHEMA = `{
  "reviewer": "conversion",
  "verdict": "pass | warn | fail",
  "issues": [{ "severity": "error | warning | info", "message": "string" }],
  "suggestedEdits": ["string"],
  "confidence": 0.0,
  "linkedSourceIds": []
}`;

export async function runConversionReviewer(input: QcReviewerInput): Promise<QcReviewResult> {
  const goal = input.brief.campaignGoal;

  const prompt = [
    "Return only valid JSON matching this exact schema:",
    SCHEMA,
    `You are a conversion reviewer. Evaluate the campaign module for its ability to drive the campaign goal: "${goal}".`,
    "Check for:",
    "- Presence of a clear call-to-action appropriate to the goal",
    "- Value proposition clarity — does the audience immediately understand the benefit?",
    "- Friction in the conversion path (e.g., asking for too much commitment too early)",
    "- Missing urgency or specificity for conversion-focused goals (signup, demo, launch)",
    "- Weak hooks that won't stop the scroll for awareness/waitlist goals",
    "Set verdict to 'fail' if no CTA exists for conversion goals, 'warn' for weak conversion signals, 'pass' if the module is well-optimized for the goal.",
    "Campaign brief:",
    JSON.stringify(input.brief, null, 2),
    "Module to review:",
    JSON.stringify(input.moduleOutput, null, 2),
  ].join("\n\n");

  return completeStructuredPromptWithRecovery(QcReviewResultSchema, {
    prompt,
    systemPrompt: "You are a conversion QC reviewer. Return only valid JSON.",
  });
}
