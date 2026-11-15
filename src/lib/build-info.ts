/** Build identity injected at build time (see vite.config.ts `define`). */
declare const __WS_BUILD__: { id: string; builtAt: string; commits: string[] } | undefined;

export const BUILD_INFO: { id: string; builtAt: string; commits: string[] } =
  typeof __WS_BUILD__ !== "undefined" && __WS_BUILD__
    ? __WS_BUILD__
    : { id: "dev", builtAt: "", commits: [] };
