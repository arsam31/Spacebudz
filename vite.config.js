import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      buffer: "buffer",
      "node-fetch": resolve("src/polyfills/node-fetch-browser.js"),
    },
  },
  optimizeDeps: {
    exclude: ["lucid-cardano"],
    esbuildOptions: {
      target: "esnext",
    },
  },
  build: {
    target: "esnext",
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        warn(warning);
      },
    },
  },
});
