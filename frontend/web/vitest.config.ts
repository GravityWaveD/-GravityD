import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

export default defineConfig({
  define: {
    __APP_INFO__: JSON.stringify({
      pkg: { name: "gravityd", version: "3.0.0" },
      buildTimestamp: 0,
    }),
  },
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@views": path.resolve(__dirname, "src/views"),
      "@imgs": path.resolve(__dirname, "src/assets/images"),
      "@icons": path.resolve(__dirname, "src/assets/images/svg"),
      "@utils": path.resolve(__dirname, "src/utils"),
      "@stores": path.resolve(__dirname, "src/store"),
      "@plugins": path.resolve(__dirname, "src/plugins"),
      "@styles": path.resolve(__dirname, "src/styles"),
      "@api": path.resolve(__dirname, "src/api"),
      "@fa_imgs": path.resolve(__dirname, "src/assets/fa_imgs"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,js}", "tests/**/*.{test,spec}.{ts,js}"],
    setupFiles: ["tests/setup.ts"],
  },
});
