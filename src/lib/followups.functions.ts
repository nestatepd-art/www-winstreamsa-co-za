import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type RecordType = "quote" | "invoice";

function tableFor(type: RecordType) {
  return type === "quote" ? "quote_followups" : "invoice_followups";
}
function parentTableFor(type: RecordType) {
  return type === "quote" ? "quotes" : "invoices";
}
function parentFkFor(type: RecordType) {
  return type === "quote" ? "quote_id" : "invoice_id";
}

// ------- LIST -------
export const listFollowups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { recordType: RecordType; recordId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await ((context.supabase as any) as any)
      .from(tableFor(data.recordType))
      .select("*")
      .eq(parentFkFor(data.recordType), data.recordId)
      .order("sequence");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ------- UPDATE -------
export const updateFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    recordType: RecordType;
    id: string;
    subject?: string;
    body?: string;
    scheduled_for?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.subject !== undefined) patch.subject = data.subject;
    if (data.body !== undefined) patch.body = data.body;
    if (data.scheduled_for !== undefined) patch.scheduled_for = data.scheduled_for;
    const { error } = await ((context.supabase as any) as any)
      .from(tableFor(data.recordType))
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- SKIP -------
export const skipFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { recordType: RecordType; id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await ((context.supabase as any) as any)
      .from(tableFor(data.recordType))
      .update({ status: "skipped" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- SET AUTO-NUDGE (per record) -------
export const setAutoNudge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { recordType: RecordType; recordId: string; enabled: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await ((context.supabase as any) as any)
      .from(parentTableFor(data.recordType))
      .update({ auto_nudge_enabled: data.enabled })
      .eq("id", data.recordId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- SEND FOLLOW-UP NOW -------
export const sendFollowupNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    recordType: RecordType;
    id: string;
    /** optional PDF attachment (base64) generated client-side */
    pdfBase64?: string;
    pdfFilename?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { sendViaResend, brandedEmailHtml } = await import("./resend-send.server");

    const { data: fu, error: fuErr } = await ((context.supabase as any) as any)
      .from(tableFor(data.recordType))
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (fuErr || !fu) throw new Error(fuErr?.message || "Follow-up not found");
    if (fu.status !== "scheduled") throw new Error(`Follow-up already ${fu.status}`);

    const parentTable = parentTableFor(data.recordType);
    const { data: parent, error: pErr } = await ((context.supabase as any) as any)
      .from(parentTable)
      .select("*, clients(name, contact_person, email)")
      .eq("id", (fu as any)[parentFkFor(data.recordType)])
      .maybeSingle();
    if (pErr || !parent) throw new Error("Parent record not found");

    const client: any = (parent as any).clients;
    const toEmail: string | undefined = client?.email;
    if (!toEmail) throw new Error("Client has no email on file");

    const { data: profile } = await ((context.supabase as any) as any)
      .from("business_profiles")
      .select("business_name, email")
      .maybeSingle();

    const businessName = profile?.business_name || "our team";
    const greeting = `Hi ${client?.contact_person || client?.name || "there"},`;
    const html = brandedEmailHtml({
      businessName,
      greeting,
      bodyText: (fu as any).body,
      footerNote: `Sent via WinStream on behalf of ${businessName}.`,
    });

    try {
      await sendViaResend({
        to: toEmail,
        subject: (fu as any).subject,
        html,
        fromName: businessName,
        replyTo: profile?.email ?? null,
        attachments: data.pdfBase64 && data.pdfFilename
          ? [{ filename: data.pdfFilename, content: data.pdfBase64 }]
          : undefined,
      });

      await ((context.supabase as any) as any)
        .from(tableFor(data.recordType))
        .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
        .eq("id", data.id);

      await (context.supabase as any).from("nudge_log").insert({
        user_id: context.userId,
        record_type: data.recordType,
        record_id: (fu as any)[parentFkFor(data.recordType)],
        sent_to: toEmail,
        subject: (fu as any).subject,
        status: "sent",
      });
      return { ok: true };
    } catch (e: any) {
      const msg = String(e?.message ?? e).slice(0, 500);
      await ((context.supabase as any) as any)
        .from(tableFor(data.recordType))
        .update({ status: "failed", error: msg })
        .eq("id", data.id);
      await (context.supabase as any).from("nudge_log").insert({
        user_id: context.userId,
        record_type: data.recordType,
        record_id: (fu as any)[parentFkFor(data.recordType)],
        sent_to: toEmail,
        subject: (fu as any).subject,
        status: "failed",
        error: msg,
      });
      throw new Error(msg);
    }
  });

// ------- SEND RECORD (initial send) -------
export const sendRecordNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    recordType: RecordType;
    recordId: string;
    subject: string;
    bodyText: string;
    pdfBase64?: string;
    pdfFilename?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { sendViaResend, brandedEmailHtml } = await import("./resend-send.server");
    const parentTable = parentTableFor(data.recordType);
    const { data: parent, error: pErr } = await ((context.supabase as any) as any)
      .from(parentTable)
      .select("*, clients(name, contact_person, email)")
      .eq("id", data.recordId)
      .maybeSingle();
    if (pErr || !parent) throw new Error("Record not found");

    const client: any = (parent as any).clients;
    const toEmail: string | undefined = client?.email;
    if (!toEmail) throw new Error("Client has no email on file");

    const { data: profile } = await ((context.supabase as any) as any)
      .from("business_profiles")
      .select("business_name, email")
      .maybeSingle();
    const businessName = profile?.business_name || "our team";
    const greeting = `Hi ${client?.contact_person || client?.name || "there"},`;
    const html = brandedEmailHtml({
      businessName,
      greeting,
      bodyText: data.bodyText,
      footerNote: `Sent via WinStream on behalf of ${businessName}.`,
    });

    await sendViaResend({
      to: toEmail,
      subject: data.subject,
      html,
      fromName: businessName,
      replyTo: profile?.email ?? null,
      attachments: data.pdfBase64 && data.pdfFilename
        ? [{ filename: data.pdfFilename, content: data.pdfBase64 }]
        : undefined,
    });

    // Mark sent status on parent
    const patch: Record<string, unknown> = { sent_at: new Date().toISOString() };
    if ((parent as any).status === "draft") patch.status = "sent";
    await (context.supabase as any).from(parentTable).update(patch).eq("id", data.recordId);

    await (context.supabase as any).from("nudge_log").insert({
      user_id: context.userId,
      record_type: data.recordType,
      record_id: data.recordId,
      sent_to: toEmail,
      subject: data.subject,
      status: "sent",
    });
    return { ok: true, to: toEmail };
  });
