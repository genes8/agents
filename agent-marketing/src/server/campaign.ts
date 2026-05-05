import { createServerFn } from "@tanstack/react-start";
import { checkLlmConfiguration } from "../lib/llm/client";

export const checkModelConfiguration = createServerFn({ method: "GET" }).handler(async () => checkLlmConfiguration());
