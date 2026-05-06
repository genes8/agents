import { AsyncLocalStorage } from "node:async_hooks";

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

type UsageStore = { tokens: TokenUsage };

const storage = new AsyncLocalStorage<UsageStore>();

export async function runWithUsageTracking<T>(fn: () => Promise<T>): Promise<{ result: T; usage: TokenUsage }> {
  const acc: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  const result = await storage.run({ tokens: acc }, fn);
  return { result, usage: { ...acc } };
}

export function recordApiUsage(usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null | undefined): void {
  if (!usage) return;
  const store = storage.getStore();
  if (!store) return;
  store.tokens.promptTokens += usage.prompt_tokens ?? 0;
  store.tokens.completionTokens += usage.completion_tokens ?? 0;
  store.tokens.totalTokens += usage.total_tokens ?? 0;
}

export function estimateCostUsd(usage: TokenUsage, model: string): number {
  const inputRatePerM = Number(process.env.MODEL_COST_INPUT_PER_M ?? costTable[model]?.inputPerM ?? "0.27");
  const outputRatePerM = Number(process.env.MODEL_COST_OUTPUT_PER_M ?? costTable[model]?.outputPerM ?? "1.10");
  return (usage.promptTokens * inputRatePerM + usage.completionTokens * outputRatePerM) / 1_000_000;
}

const costTable: Record<string, { inputPerM: number; outputPerM: number }> = {
  "deepseek-v4-flash": { inputPerM: 0.27, outputPerM: 1.10 },
  "deepseek-chat": { inputPerM: 0.27, outputPerM: 1.10 },
  "gpt-4o": { inputPerM: 2.50, outputPerM: 10.00 },
  "gpt-4o-mini": { inputPerM: 0.15, outputPerM: 0.60 },
};
