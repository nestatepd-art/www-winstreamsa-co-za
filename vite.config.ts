// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";
import { loadEnv } from "vite";
import { execSync } from "node:child_process";

// Build identity for the in-app monitor: lets it detect and announce new versions.
function buildInfo() {
  const run = (cmd: string) => {
    try {
      return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch {
      return "";
    }
  };
  const builtAt = new Date().toISOString();
  const hash = run("git rev-parse --short HEAD");
  const commits = run("git log -15 --format=%h%x20%s").split("\n").filter(Boolean);
  return { id: hash ? `${hash}-${builtAt.slice(0, 16)}` : builtAt, builtAt, commits };
}

// Server routes (e.g. /lovable/email/*) need non-VITE_ env vars at runtime.
Object.assign(process.env, loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), ""));

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      __WS_BUILD__: JSON.stringify(buildInfo()),
    },
    resolve: {
      alias: [
        // Only rewrite the exact v4 subpaths / bare specifier — never prefix-match,
        // or parse5's "entities/escape" (v6) resolves into the v4 copy and fails.
        { find: "entities/lib/decode.js", replacement: path.resolve(process.cwd(), "node_modules/entities/lib/decode.js") },
        { find: "entities/lib/encode.js", replacement: path.resolve(process.cwd(), "node_modules/entities/lib/encode.js") },
        { find: /^entities$/, replacement: path.resolve(process.cwd(), "node_modules/entities") },
      ],

    },
  },
});
