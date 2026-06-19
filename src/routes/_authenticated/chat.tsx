import { createFileRoute, Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  createChatThread,
  deleteChatThread,
  listChatThreads,
  type ChatThreadRow,
} from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, MessageSquare, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import chatLogo from "@/assets/chat-assist-logo.png";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatLayout,
  errorComponent: ChatErrorBoundary,
});

function ChatLayout() {
  const navigate = useNavigate();
  const router = useRouter();
  const params = router.state.location.pathname.split("/");
  const activeThreadId = params[2]; // /chat/:threadId
  const qc = useQueryClient();

  const list = useServerFn(listChatThreads);
  const create = useServerFn(createChatThread);
  const remove = useServerFn(deleteChatThread);

  const threadsQuery = useQuery({
    queryKey: ["chat-threads"],
    queryFn: () => list(),
  });

  const createMutation = useMutation({
    mutationFn: () => create({ data: {} }),
    onSuccess: (thread) => {
      qc.invalidateQueries({ queryKey: ["chat-threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create chat"),
  });

  const deleteMutation = useMutation({
    mutationFn: (threadId: string) => remove({ data: { threadId } }),
    onSuccess: (_d, threadId) => {
      qc.invalidateQueries({ queryKey: ["chat-threads"] });
      if (activeThreadId === threadId) navigate({ to: "/chat" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete chat"),
  });

  const threads = threadsQuery.data ?? [];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full">
      <aside className="w-64 shrink-0 border-r border-border bg-card/40 flex flex-col">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <img src={chatLogo} alt="" className="h-7 w-7" width={28} height={28} />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">WinStream Assist</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              AI helper
            </div>
          </div>
        </div>
        <div className="p-2">
          <Button
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-2 pb-3 space-y-1">
            {threadsQuery.isLoading && (
              <div className="text-xs text-muted-foreground px-2 py-1">Loading…</div>
            )}
            {!threadsQuery.isLoading && threads.length === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-3">
                No chats yet. Start a new one.
              </div>
            )}
            {threads.map((t: ChatThreadRow) => {
              const isActive = activeThreadId === t.id;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "group flex items-center rounded-md text-sm hover:bg-accent/60",
                    isActive && "bg-accent",
                  )}
                >
                  <Link
                    to="/chat/$threadId"
                    params={{ threadId: t.id }}
                    className="flex-1 flex items-center gap-2 px-2 py-2 min-w-0"
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{t.title}</span>
                  </Link>
                  <button
                    type="button"
                    aria-label="Delete chat"
                    className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${t.title}"?`)) deleteMutation.mutate(t.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </aside>
      <section className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </section>
    </div>
  );
}

function ChatErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="p-8 flex items-start gap-3 text-sm">
      <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
      <div>
        <div className="font-medium">Couldn't load chat</div>
        <div className="text-muted-foreground">{error.message}</div>
      </div>
    </div>
  );
}
