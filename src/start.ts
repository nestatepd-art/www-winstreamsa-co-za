import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

function isStaleServerFunctionError(error: unknown) {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const text = [
      current instanceof Error ? current.message : "",
      current instanceof Error ? current.stack : "",
      "message" in current ? String((current as { message?: unknown }).message ?? "") : "",
      "stack" in current ? String((current as { stack?: unknown }).stack ?? "") : "",
    ].join("\n");
    if (text.includes("Invalid server function ID")) return true;
    current = "cause" in current ? (current as { cause?: unknown }).cause : undefined;
  }
  return String(error).includes("Invalid server function ID");
}

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  if (new URL(request.url).pathname.startsWith("/lovable/")) {
    return next();
  }
  try {
    return await next();
  } catch (error) {
    if (isStaleServerFunctionError(error) || new URL(request.url).pathname.startsWith("/_serverFn/")) {
      console.error(error);
      return Response.json(
        { code: "STALE_CLIENT_BUNDLE", reload: true },
        {
          status: 409,
          headers: {
            "cache-control": "no-store",
            "x-winstream-reload": "1",
          },
        },
      );
    }
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
