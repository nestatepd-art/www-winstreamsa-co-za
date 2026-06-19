import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createChatThread, listChatThreads } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import chatLogo from "@/assets/chat-assist-logo.png";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatIndex,
});

function ChatIndex() {
  const navigate = useNavigate();
  const list = useServerFn(listChatThreads);
  const create = useServerFn(createChatThread);
  const triedRef = useRef(false);

  const threadsQuery = useQuery({
    queryKey: ["chat-threads"],
    queryFn: () => list(),
  });

  const createMutation = useMutation({
    mutationFn: () => create({ data: {} }),
    onSuccess: (t) => navigate({ to: "/chat/$threadId", params: { threadId: t.id } }),
  });

  useEffect(() => {
    if (threadsQuery.isLoading || triedRef.current) return;
    const threads = threadsQuery.data ?? [];
    triedRef.current = true;
    if (threads.length > 0) {
      navigate({ to: "/chat/$threadId", params: { threadId: threads[0].id }, replace: true });
    }
  }, [threadsQuery.isLoading, threadsQuery.data, navigate]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <img src={chatLogo} alt="" className="h-16 w-16 mb-4" width={64} height={64} />
      <h1 className="text-2xl font-semibold tracking-tight">WinStream Assist</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        Ask anything about the app — quotes, proposals, VAT, payments, navigation, or your
        account.
      </p>
      <Button className="mt-6" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
        Start a new chat
      </Button>
    </div>
  );
}
