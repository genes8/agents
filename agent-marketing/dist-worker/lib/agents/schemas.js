import { z } from "zod";
// LLMs occasionally return a newline/comma-separated string instead of a JSON array.
// This preprocessor normalises both shapes so Zod validation still passes.
const stringArray = z.preprocess((val) => (typeof val === "string" ? val.split(/\n|,/).map((s) => s.trim()).filter(Boolean) : val), z.array(z.string()));
export const ResearchBriefSchema = z.object({
    summary: z.string(),
    audienceInsights: stringArray,
    competitorPatterns: stringArray,
    marketOpportunities: stringArray,
    sourceNotes: stringArray,
});
