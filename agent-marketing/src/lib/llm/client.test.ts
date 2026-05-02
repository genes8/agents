import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { completeJsonPrompt, completeStructuredPrompt, getLlmConfig, type ChatCompletionClient } from "./client";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("llm config", () => {
  it("uses DeepSeek defaults", () => {
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_DEFAULT_MODEL;

    expect(getLlmConfig()).toEqual({
      apiKey: "test-key",
      baseURL: "https://api.deepseek.com/v1",
      model: "deepseek-v4-flash",
      temperature: 0.7,
      maxTokens: 4096,
    });
  });

  it("throws when OPENAI_API_KEY is missing", () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => getLlmConfig()).toThrow("Missing OPENAI_API_KEY");
  });
});

describe("completeJsonPrompt", () => {
  it("calls the OpenAI-compatible API with JSON response format", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fakeClient: ChatCompletionClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: '{"ok":true}' } }],
          }),
        },
      },
    };

    const result = await completeJsonPrompt({
      prompt: "Return JSON",
      client: fakeClient,
      systemPrompt: "You are a JSON API.",
    });

    expect(result).toBe('{"ok":true}');
    expect(fakeClient.chat.completions.create).toHaveBeenCalledWith({
      model: "deepseek-v4-flash",
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a JSON API." },
        { role: "user", content: "Return JSON" },
      ],
    });
  });

  it("throws when the provider returns no content", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fakeClient: ChatCompletionClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({ choices: [{ message: { content: null } }] }),
        },
      },
    };

    await expect(completeJsonPrompt({ prompt: "Return JSON", client: fakeClient })).rejects.toThrow(
      "LLM returned an empty response",
    );
  });
});

describe("completeStructuredPrompt", () => {
  it("parses and validates JSON against the schema", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const schema = z.object({ name: z.string(), count: z.number() });
    const fakeClient: ChatCompletionClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: '{"name":"acme","count":3}' } }],
          }),
        },
      },
    };

    const result = await completeStructuredPrompt(schema, { prompt: "Return JSON", client: fakeClient });
    expect(result).toEqual({ name: "acme", count: 3 });
  });

  it("throws a ZodError when the response does not match the schema", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const schema = z.object({ name: z.string(), count: z.number() });
    const fakeClient: ChatCompletionClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: '{"name":"acme"}' } }],
          }),
        },
      },
    };

    await expect(completeStructuredPrompt(schema, { prompt: "Return JSON", client: fakeClient })).rejects.toThrow(
      "count",
    );
  });
});
