import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { sendPublicDocument, sendRateLimit } from "./public-send.server";

/** Public (no-auth) document email used by the /try workspace. Rate limited per IP. */
export const sendPublicDocumentEmail = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        to: z.string().email(),
        subject: z.string().min(1).max(200),
        bodyText: z.string().min(1).max(4000),
        businessName: z.string().max(120).optional(),
        clientName: z.string().max(120).optional(),
        replyTo: z.string().email().optional(),
        pdfBase64: z.string().max(6_000_000).optional(),
        pdfFilename: z.string().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const req = getRequest();
    const ip =
      req?.headers.get("cf-connecting-ip") ??
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anonymous";
    if (!sendRateLimit(ip)) {
      return { ok: false as const, reason: "RATE_LIMITED" as const };
    }
    return sendPublicDocument({
      to: data.to,
      subject: data.subject,
      bodyText: data.bodyText,
      businessName: data.businessName ?? "WinStream",
      clientName: data.clientName ?? null,
      replyTo: data.replyTo ?? null,
      pdfBase64: data.pdfBase64,
      pdfFilename: data.pdfFilename,
    });
  });
