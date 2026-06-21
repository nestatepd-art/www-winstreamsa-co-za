import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

function isStaleServerFunctionError(error: unknown) {
  return error instanceof Error && error.message.includes("Invalid server function ID");
}

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (isStaleServerFunctionError(error)) {
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
