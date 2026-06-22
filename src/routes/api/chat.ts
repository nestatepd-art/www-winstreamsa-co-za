import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are WinStream Assist — the friendly in-app helper for WinStream SA, a South African business operations app for SMEs.

You help users with:
- Navigating the app: Dashboard, Clients, Proposals, Quotes, Invoices, Billing, Settings.
- Creating professional quotes and proposals (line items, intro/terms, valid SARS-friendly wording).
- Drafting invoices: go to "Invoices" in the side menu and click "New invoice". You can also convert an existing Quote into an invoice with one click from the quote's detail page ("Convert to invoice"). Draft invoices can be edited from the invoice page via the "Edit" button.
- South African business basics: VAT at 15%, SARS invoicing requirements, standard payment terms (e.g. 50% deposit), POPIA basics.
- Credits and billing (subscription/plan) inside WinStream — found under "Billing" in the side menu. Note: "Billing" is for your WinStream plan & credits, NOT for customer invoices — those live under "Invoices".
- Account, sign-in and general troubleshooting.

Style:
- Be concise. Prefer short paragraphs and bullet lists.
- Use plain English, no jargon. Currency is ZAR.
- If a user asks something outside WinStream/SA business, answer briefly and offer to bring it back to the app.
- Never invent features. If you're unsure whether the app does something, say so and suggest where to look or who to contact.`;

type ChatBody = { messages?: unknown; threadId?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as ChatBody;
        if (!Array.isArray(body.messages) || typeof body.threadId !== "string") {
          return new Response("messages and threadId are required", { status: 400 });
        }
        const messages = body.messages as UIMessage[];
        const threadId = body.threadId;

        const authHeader = request.headers.get("authorization") ?? "";
        if (!authHeader.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice("Bearer ".length);

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Server not configured", { status: 500 });
        }

        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });

        const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
        const userId = claimsData?.claims?.sub;
        if (claimsErr || !userId) {
          return new Response("Unauthorized", { status: 401 });
        }

        // Verify the thread belongs to this user.
        const { data: thread, error: threadErr } = await supabase
          .from("chat_threads")
          .select("id,title")
          .eq("id", threadId)
          .maybeSingle();
        if (threadErr || !thread) {
          return new Response("Chat not found", { status: 404 });
        }

        // Persist the latest user message (the one being sent now).
        const latest = messages[messages.length - 1];
        if (latest && latest.role === "user") {
          await supabase.from("chat_messages").insert({
            thread_id: threadId,
            user_id: userId,
            role: "user",
            parts: latest.parts as unknown as Database["public"]["Tables"]["chat_messages"]["Insert"]["parts"],
          });

          // If still the default title, derive one from the first user message.
          if (thread.title === "New chat") {
            const firstText =
              latest.parts
                ?.map((p) => (p.type === "text" ? p.text : ""))
                .join(" ")
                .trim() ?? "";
            if (firstText) {
              const derived = firstText.slice(0, 60) + (firstText.length > 60 ? "…" : "");
              await supabase.from("chat_threads").update({ title: derived }).eq("id", threadId);
            }
          }
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("AI is not configured", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ responseMessage }) => {
            try {
              await supabase.from("chat_messages").insert({
                thread_id: threadId,
                user_id: userId,
                role: "assistant",
                parts: responseMessage.parts as unknown as Database["public"]["Tables"]["chat_messages"]["Insert"]["parts"],
              });
            } catch (err) {
              console.error("[chat] failed to persist assistant message", err);
            }
          },
          onError: (err) => {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[chat] stream error", msg);
            if (msg.includes("429")) return "Too many requests. Please wait a moment and try again.";
            if (msg.includes("402"))
              return "AI credits exhausted. Add credits in workspace billing.";
            return "Sorry, something went wrong generating that reply.";
          },
        });
      },
    },
  },
});
