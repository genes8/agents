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

export type CompleteJsonPromptInput = {
  prompt: string;
  systemPrompt?: string;
  client?: ChatCompletionClient;
  model?: string;
};

export type LlmErrorType =
  | "empty_response"
  | "invalid_json"
  | "schema_validation"
  | "schema_validation_exhausted"
  | "provider_error";

export class LlmRecoveryError extends Error {
  constructor(
    public readonly errorType: LlmErrorType,
    public readonly rawResponse: string | null,
    cause?: unknown,
  ) {
    super(`LLM recovery exhausted: ${errorType}`);
    this.name = "LlmRecoveryError";
    if (cause) this.cause = cause;
  }
}

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
    model: input.model ?? config.model,
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

export async function completeChatPrompt(input: CompleteJsonPromptInput): Promise<string> {
  const config = getLlmConfig();
  const client = input.client ?? createLlmClient(config);
  const response = await client.chat.completions.create({
    model: input.model ?? config.model,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    messages: [
      { role: "system", content: input.systemPrompt ?? "You are a helpful assistant." },
      { role: "user", content: input.prompt },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

export async function completeStructuredPrompt<T>(
  schema: z.ZodSchema<T>,
  input: CompleteJsonPromptInput,
): Promise<T> {
  const raw = await completeJsonPrompt(input);
  const parsed = JSON.parse(raw) as unknown;
  return schema.parse(parsed);
}

export async function completeStructuredPromptWithRecovery<T>(
  schema: z.ZodSchema<T>,
  input: CompleteJsonPromptInput,
  options: { fallbackModel?: string } = {},
): Promise<T> {
  const config = getLlmConfig();
  const client = input.client ?? createLlmClient(config);
  const model = input.model ?? config.model;

  const attempt = async (useClient: ChatCompletionClient, useModel: string): Promise<T> => {
    // Step 1: get raw response
    const raw = await completeJsonPrompt({ ...input, client: useClient, model: useModel });

    // Step 2: parse JSON — repair once if needed
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const repairRaw = await completeJsonPrompt({
        prompt: `Fix this invalid JSON. Return only valid JSON, no explanation:\n\n${raw}`,
        systemPrompt: "Return only valid JSON.",
        client: useClient,
        model: useModel,
      });
      try {
        parsed = JSON.parse(repairRaw);
      } catch {
        throw new LlmRecoveryError("invalid_json", raw);
      }
    }

    // Step 3: validate schema — correct once if needed
    const first = schema.safeParse(parsed);
    if (first.success) return first.data;

    const errorSummary = first.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    const correctionRaw = await completeJsonPrompt({
      prompt: `Fix this JSON to match the expected schema. Validation errors: ${errorSummary}\n\nCurrent JSON:\n${JSON.stringify(parsed)}`,
      systemPrompt: "Return only corrected JSON.",
      client: useClient,
      model: useModel,
    });

    try {
      const corrected = JSON.parse(correctionRaw) as unknown;
      const second = schema.safeParse(corrected);
      if (second.success) return second.data;
    } catch {
      // fall through to exhausted error
    }

    throw new LlmRecoveryError("schema_validation_exhausted", raw);
  };

  try {
    return await attempt(client, model);
  } catch (e) {
    if (e instanceof LlmRecoveryError && options.fallbackModel) {
      const fallbackClient = createLlmClient({ ...config, model: options.fallbackModel });
      return attempt(fallbackClient, options.fallbackModel);
    }
    throw e;
  }
}

export function checkLlmConfiguration(): { ok: boolean; message: string } {
  try {
    const config = getLlmConfig();
    return { ok: true, message: `Using ${config.model} via ${config.baseURL}.` };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}
