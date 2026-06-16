import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callAI(system: string, user: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (res.status === 429) throw new Error("AI rate limit — try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace billing.");
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.toString().trim() ?? "";
}

/** Generate a full proposal (markdown) from a short brief. */
export const draftProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        businessName: z.string().optional(),
        clientName: z.string().optional(),
        brief: z.string().min(5).max(2000),
        tone: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const system = `You write polished business proposals for South African SMEs.
Output GitHub-flavoured markdown, no preamble. Structure:

# {Clear, specific title}

**Prepared for:** {client}
**Prepared by:** {business}

## Overview
2-3 sentence summary of the client's need and how it will be solved.

## Scope of work
Bulleted list of concrete deliverables.

## Approach & timeline
Short paragraph + a small phased plan (Phase 1, 2, 3 if useful).

## Investment
A short paragraph noting that pricing is in ZAR, VAT-inclusive at 15%, with 50% deposit standard. Do NOT invent line-item prices — say "See attached quotation".

## Why us
3-4 short bullets specific to the brief.

## Terms
Validity 30 days. Payment terms. POPIA-compliant handling of client data.

Keep it tight, no fluff, no emoji.`;
    const body = `Business: ${data.businessName ?? "(unspecified)"}
Client: ${data.clientName ?? "(unspecified)"}
Tone: ${data.tone ?? "professional, warm"}
Brief:
${data.brief}`;
    const content = await callAI(system, body);
    return { content };
  });

/** Draft a customer-facing message (email or whatsapp) for a proposal. */
export const draftClientMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        channel: z.enum(["email", "whatsapp"]),
        purpose: z.enum(["send", "followup", "thanks"]).default("send"),
        businessName: z.string().optional(),
        clientName: z.string().optional(),
        proposalTitle: z.string().optional(),
        tone: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const channelRules =
      data.channel === "whatsapp"
        ? "WhatsApp: 2-4 short sentences, friendly, no subject line. Use line breaks. End with a clear question or CTA."
        : "Email: 3-6 sentences, professional. Return JSON {\"subject\":\"...\",\"body\":\"...\"}.";
    const purposeMap = {
      send: "Sending the proposal for their review.",
      followup: "Polite follow-up — proposal sent earlier, asking if they have questions.",
      thanks: "Thanking them for accepting the proposal and outlining next steps.",
    };
    const system = `You write client messages for South African SMEs.
${channelRules}
Tone: ${data.tone ?? "warm, professional, concise"}.
Never invent prices or dates that weren't given.`;
    const user = `Purpose: ${purposeMap[data.purpose]}
From: ${data.businessName ?? "our team"}
To: ${data.clientName ?? "the client"}
Proposal: ${data.proposalTitle ?? "(untitled)"}`;
    const raw = await callAI(system, user);
    if (data.channel === "email") {
      try {
        const cleaned = raw.replace(/^```json|```$/gi, "").trim();
        const parsed = JSON.parse(cleaned);
        return {
          subject: String(parsed.subject ?? `Proposal: ${data.proposalTitle ?? ""}`),
          body: String(parsed.body ?? raw),
        };
      } catch {
        return { subject: `Proposal: ${data.proposalTitle ?? ""}`, body: raw };
      }
    }
    return { subject: null, body: raw };
  });

/**
 * Send a communication. Currently SIMULATED — logs to `communications` table
 * with status='simulated'. Real Gmail / WhatsApp Cloud API wiring lands in
 * the next iteration; the data model and UI are identical.
 */
export const sendCommunication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        channel: z.enum(["email", "whatsapp", "sms"]),
        toAddress: z.string().min(3).max(200),
        subject: z.string().max(300).nullable().optional(),
        body: z.string().min(1).max(20000),
        proposalId: z.string().uuid().nullable().optional(),
        clientId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("communications")
      .insert({
        user_id: userId,
        channel: data.channel,
        direction: "outbound",
        to_address: data.toAddress,
        subject: data.subject ?? null,
        body: data.body,
        status: "simulated",
        provider: data.channel === "email" ? "sim:gmail" : "sim:whatsapp-cloud",
        provider_message_id: `sim_${Math.random().toString(36).slice(2, 12)}`,
        proposal_id: data.proposalId ?? null,
        client_id: data.clientId ?? null,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // If tied to a proposal, mark it as sent (first time only).
    if (data.proposalId) {
      await supabase
        .from("proposals")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", data.proposalId)
        .eq("status", "draft");
    }
    return { id: row.id, simulated: true };
  });
