import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, ArrowRight, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/proposals/")({
  component: ProposalsList,
});

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  sent: "default",
  viewed: "default",
  accepted: "default",
  rejected: "outline",
  expired: "outline",
};

function ProposalsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: proposals, isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id, title, status, created_at, valid_until, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proposals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposal deleted");
      qc.invalidateQueries({ queryKey: ["proposals"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  const handleDelete = (e: React.MouseEvent, p: { id: string; title: string }) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete proposal "${p.title}"? This cannot be undone.`)) {
      deleteMut.mutate(p.id);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Proposals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-drafted proposals you can send via Email or WhatsApp.
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/proposals/new" })}>
          <Plus className="h-4 w-4 mr-2" /> New proposal
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All proposals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : !proposals || proposals.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No proposals yet.</p>
              <Button size="sm" onClick={() => navigate({ to: "/proposals/new" })}>
                Draft your first proposal
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {proposals.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/proposals/$proposalId"
                    params={{ proposalId: p.id }}
                    className="flex items-center justify-between p-4 hover:bg-muted/40 transition"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {(p.clients as { name: string } | null)?.name ?? "No client"} ·{" "}
                        {formatDate(p.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={statusVariant[p.status] ?? "outline"} className="capitalize">
                        {p.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete proposal"
                        onClick={(e) => handleDelete(e, { id: p.id, title: p.title })}
                        disabled={deleteMut.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
