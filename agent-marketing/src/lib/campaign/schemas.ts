import { z } from "zod";

export const CampaignGoalSchema = z.enum(["awareness", "waitlist", "signup", "demo", "launch"]);
export const CampaignModuleSchema = z.enum(["x", "linkedin", "instagram", "calendar", "creative"]);

// Models sometimes return "twitter" instead of "x" for the channel key.
const channelStrategySchema = z.preprocess((val) => {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    if (obj["twitter"] !== undefined && obj["x"] === undefined) {
      return { ...obj, x: obj["twitter"] };
    }
  }
  return val;
}, z.object({ x: z.string(), linkedin: z.string(), instagram: z.string() }));

// Models sometimes return brandVoice as a plain string — split it into tone items and leave avoid empty.
const brandVoiceSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    return { tone: val.split(/[,;]/).map((s) => s.trim()).filter(Boolean), avoid: [] };
  }
  return val;
}, z.object({ tone: z.array(z.string()), avoid: z.array(z.string()) }));

// Models sometimes return messagingPillars as an array of strings — wrap each into a minimal pillar object.
const messagingPillarSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    return { name: val, description: "", proofPoints: [] };
  }
  return val;
}, z.object({ name: z.string(), description: z.string(), proofPoints: z.array(z.string()) }));

export const CampaignStrategySchema = z.object({
  marketSummary: z.string(),
  icp: z.string(),
  painPoints: z.array(z.string()),
  positioningStatement: z.string(),
  messagingPillars: z.array(messagingPillarSchema),
  brandVoice: brandVoiceSchema,
  hooks: z.array(z.string()),
  channelStrategy: channelStrategySchema,
});

export const CampaignModuleOutputSchema = z.object({
  module: CampaignModuleSchema,
  title: z.string(),
  summary: z.string(),
  sections: z.array(
    z.object({
      title: z.string(),
      items: z.array(z.string()),
    }),
  ),
});

export const RefineOutputSchema = z.object({
  revisedText: z.string(),
  changeSummary: z.string(),
});
