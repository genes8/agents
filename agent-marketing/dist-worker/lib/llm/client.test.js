import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { completeJsonPrompt, completeStructuredPrompt, completeStructuredPromptWithRecovery, getLlmConfig, LlmRecoveryError, } from "./client";
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
        const fakeClient = {
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
        const fakeClient = {
            chat: {
                completions: {
                    create: vi.fn().mockResolvedValue({ choices: [{ message: { content: null } }] }),
                },
            },
        };
        await expect(completeJsonPrompt({ prompt: "Return JSON", client: fakeClient })).rejects.toThrow("LLM returned an empty response");
    });
});
describe("completeStructuredPrompt", () => {
    it("parses and validates JSON against the schema", async () => {
        process.env.OPENAI_API_KEY = "test-key";
        const schema = z.object({ name: z.string(), count: z.number() });
        const fakeClient = {
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
        const fakeClient = {
            chat: {
                completions: {
                    create: vi.fn().mockResolvedValue({
                        choices: [{ message: { content: '{"name":"acme"}' } }],
                    }),
                },
            },
        };
        await expect(completeStructuredPrompt(schema, { prompt: "Return JSON", client: fakeClient })).rejects.toThrow("count");
    });
});
describe("completeStructuredPromptWithRecovery", () => {
    const schema = z.object({ name: z.string(), count: z.number() });
    it("succeeds on first attempt when JSON and schema are valid", async () => {
        process.env.OPENAI_API_KEY = "test-key";
        const fakeClient = {
            chat: {
                completions: {
                    create: vi.fn().mockResolvedValue({
                        choices: [{ message: { content: '{"name":"acme","count":3}' } }],
                    }),
                },
            },
        };
        const result = await completeStructuredPromptWithRecovery(schema, { prompt: "Return JSON", client: fakeClient });
        expect(result).toEqual({ name: "acme", count: 3 });
        expect(fakeClient.chat.completions.create).toHaveBeenCalledTimes(1);
    });
    it("repairs invalid JSON with a second call and succeeds", async () => {
        process.env.OPENAI_API_KEY = "test-key";
        const fakeClient = {
            chat: {
                completions: {
                    create: vi
                        .fn()
                        .mockResolvedValueOnce({ choices: [{ message: { content: 'broken json{' } }] })
                        .mockResolvedValueOnce({ choices: [{ message: { content: '{"name":"fixed","count":1}' } }] }),
                },
            },
        };
        const result = await completeStructuredPromptWithRecovery(schema, { prompt: "Return JSON", client: fakeClient });
        expect(result).toEqual({ name: "fixed", count: 1 });
        expect(fakeClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });
    it("corrects schema mismatch with a second call and succeeds", async () => {
        process.env.OPENAI_API_KEY = "test-key";
        const fakeClient = {
            chat: {
                completions: {
                    create: vi
                        .fn()
                        .mockResolvedValueOnce({ choices: [{ message: { content: '{"name":"acme"}' } }] })
                        .mockResolvedValueOnce({ choices: [{ message: { content: '{"name":"acme","count":5}' } }] }),
                },
            },
        };
        const result = await completeStructuredPromptWithRecovery(schema, { prompt: "Return JSON", client: fakeClient });
        expect(result).toEqual({ name: "acme", count: 5 });
        expect(fakeClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });
    it("throws LlmRecoveryError with schema_validation_exhausted when all attempts fail", async () => {
        process.env.OPENAI_API_KEY = "test-key";
        const fakeClient = {
            chat: {
                completions: {
                    create: vi.fn().mockResolvedValue({ choices: [{ message: { content: '{"name":"acme"}' } }] }),
                },
            },
        };
        await expect(completeStructuredPromptWithRecovery(schema, { prompt: "Return JSON", client: fakeClient })).rejects.toThrow(LlmRecoveryError);
        try {
            await completeStructuredPromptWithRecovery(schema, { prompt: "Return JSON", client: fakeClient });
        }
        catch (e) {
            expect(e).toBeInstanceOf(LlmRecoveryError);
            expect(e.errorType).toBe("schema_validation_exhausted");
            const message = e.message;
            expect(message).not.toContain("test-key");
        }
    });
});
