import OpenAI from "openai";
import type { z } from "zod";

export type LlmConfig = {
  apiKey: string;
  baseURL: string;
  model: string;
  temperature: number;
  maxTokens: number;
};

export type ChatCompletionClient = {
  chat: {
    completions: {
      create: (params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming) => Promise<OpenAI.Chat.ChatCompletion>;
    };
  };
};

type CompleteJsonPromptInput = {
  prompt: string;
  systemPrompt?: string;
  client?: ChatCompletionClient;
};

export function getLlmConfig(): LlmConfig {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Add your DeepSeek API key to .env.local.");
  }

  return {
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL ?? "https://api.deepseek.com/v1",
    model: process.env.OPENAI_DEFAULT_MODEL ?? "deepseek-v4-flash",
    temperature: Number(process.env.OPENAI_TEMPERATURE ?? "0.7"),
    maxTokens: Number(process.env.OPENAI_MAX_TOKENS ?? "4096"),
  };
}

export function createLlmClient(config = getLlmConfig()): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}

export async function completeJsonPrompt(input: CompleteJsonPromptInput): Promise<string> {
  const config = getLlmConfig();
  const client = input.client ?? createLlmClient(config);
  const response = await client.chat.completions.create({
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: input.systemPrompt ?? "Return only valid JSON. Do not wrap JSON in Markdown." },
      { role: "user", content: input.prompt },
    ],
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("LLM returned an empty response.");
  }

  return content;
}

export async function completeStructuredPrompt<T>(
  schema: z.ZodSchema<T>,
  input: CompleteJsonPromptInput,
): Promise<T> {
  const raw = await completeJsonPrompt(input);
  const parsed = JSON.parse(raw) as unknown;
  return schema.parse(parsed);
}

export function checkLlmConfiguration(): { ok: boolean; message: string } {
  try {
    const config = getLlmConfig();
    return { ok: true, message: `Using ${config.model} via ${config.baseURL}.` };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}
