import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { demoDraftDocument, demoRateLimit } from "./demo-ai.server";

/** Public (no-auth) AI draft used only by the sandbox demo workspace. */
export const draftDemoDocument = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        brief: z.string().min(3).max(400),
        clientName: z.string().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const req = getRequest();
    const ip =
      req?.headers.get("cf-connecting-ip") ??
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anonymous";
    if (!demoRateLimit(ip)) {
      throw new Error("AI drafting limit reached. Sign up free to keep generating.");
    }
    return demoDraftDocument(data.brief, data.clientName ?? "");
  });
