import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { getChatThreadMessages } from "@/lib/chat.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import chatLogo from "@/assets/chat-assist-logo.png";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatThread,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-sm">Chat not found.</div>,
});

function ChatThread() {
  const { threadId } = Route.useParams();
  const qc = useQueryClient();
  const getMessages = useServerFn(getChatThreadMessages);

  const initialQuery = useQuery({
    queryKey: ["chat-thread", threadId],
    queryFn: () => getMessages({ data: { threadId } }),
  });

  if (initialQuery.error) throw initialQuery.error;
  if (initialQuery.isLoading || !initialQuery.data) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!initialQuery.data.thread) throw notFound();

  return (
    <ChatThreadInner
      threadId={threadId}
      initialMessages={initialQuery.data.messages as unknown as UIMessage[]}
      onAfterFinish={() => {
        qc.invalidateQueries({ queryKey: ["chat-threads"] });
        qc.invalidateQueries({ queryKey: ["chat-thread", threadId] });
      }}
    />
  );
}

function ChatThreadInner({
  threadId,
  initialMessages,
  onAfterFinish,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onAfterFinish: () => void;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages, body }) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers: Record<string, string> = {};
          if (token) headers.Authorization = `Bearer ${token}`;
          return {
            body: { messages, threadId, ...(body ?? {}) },
            headers,
          };
        },
      }),
    [threadId],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (err) => toast.error(err.message || "Chat error"),
    onFinish: () => onAfterFinish(),
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);
  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status]);

  const handleSubmit = (msg: PromptInputMessage, e: React.FormEvent) => {
    e.preventDefault();
    const text = msg.text?.trim();
    if (!text) return;
    sendMessage({ text });
    const form = e.target as HTMLFormElement;
    form.reset();
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const isBusy = status === "submitted" || status === "streaming";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Conversation className="flex-1 min-h-0">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<img src={chatLogo} alt="" className="h-12 w-12" width={48} height={48} />}
              title="How can I help with WinStream today?"
              description="Ask about quotes, proposals, VAT, payments, or navigating the app."
            />
          ) : (
            messages.map((m) => {
              const textParts = m.parts.filter((p) => p.type === "text");
              return (
                <Message from={m.role} key={m.id}>
                  <MessageContent variant={m.role === "user" ? "contained" : "flat"}>
                    {textParts.map((p, i) =>
                      m.role === "assistant" ? (
                        <MessageResponse key={i}>{p.type === "text" ? p.text : ""}</MessageResponse>
                      ) : (
                        <p key={i} className="whitespace-pre-wrap leading-relaxed">
                          {p.type === "text" ? p.text : ""}
                        </p>
                      ),
                    )}
                  </MessageContent>
                </Message>
              );
            })
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent variant="flat">
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border bg-card/40 p-3">
        {error && (
          <div className="text-xs text-destructive mb-2 px-1">{error.message}</div>
        )}
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea ref={textareaRef} placeholder="Ask WinStream Assist…" />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={isBusy} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
