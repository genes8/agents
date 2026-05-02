import { defineConfig } from "vitest/config";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [tanstackStart()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
