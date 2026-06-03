import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler", // or "modern"
      },
    },
  },
  optimizeDeps: {
    // Pin every npm dependency reachable through the React.lazy() routes so Vite
    // finalizes its dep pre-bundle at cold start and never re-optimizes
    // mid-session. A mid-session re-optimization changes the ?v=<hash> dep URLs,
    // which breaks any tab that was already open (504 "Outdated Optimize Dep" /
    // "Failed to fetch dynamically imported module"). Over-including is cheap and
    // safe. If you add a new heavy dep behind a lazy route, watch the dev server
    // log for "new dependencies optimized: …" and add the name(s) here.
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router-dom",
      "@tanstack/react-query",
      "antd",
      "@ant-design/icons",
      "antd-zod",
      "@xyflow/react",
      "masonic",
      "socket.io-react-hook",
      "axios",
      "zod",
      "usehooks-ts",
      "fast-equals",
      "uuid",
      // antd deep subpaths are optimized as separate entries and are only
      // reached from lazy chunks, so they need explicit pinning too.
      "antd/es/select",
      "antd/es/_util/warning",
      "antd/es/typography/Link",
      "antd/es/typography/Text",
      "antd/es/typography/Title",
    ],
    // Keep the workspace libs out of the shared dep bundle so a tsup rebuild of
    // their dist/ can't invalidate it (it then triggers only a normal reload,
    // not a full re-optimization that strands open tabs).
    exclude: [
      "@ptah-app/lib-domains",
      "@ptah-app/lib-models",
      "@ptah-app/lib-utils",
      "@ptah-app/lib-logger",
    ],
  },
  server: {
    // Pre-transform the app shell and lazy page modules at startup so their
    // imports are discovered during the initial crawl rather than on first
    // navigation — reinforces optimizeDeps.include against anything missed.
    warmup: {
      clientFiles: [
        "./src/main.tsx",
        "./src/components/ptah-app.tsx",
        "./src/components/pages/**/*.page.tsx",
      ],
    },
  },
});
