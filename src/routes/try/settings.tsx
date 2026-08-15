import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setDemoState, useDemoState } from "@/lib/demo-store";

export const Route = createFileRoute("/try/settings")({
  head: () => ({
    meta: [
      { title: "Business Profile — WinStream SA" },
      {
        name: "description",
        content:
          "See how your business details, VAT number and banking info appear on WinStream documents.",
      },
      { property: "og:title", content: "Business Profile — WinStream SA" },
      {
        property: "og:description",
        content: "Configure a sample business profile in the WinStream sandbox.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DemoSettings,
});

const fields = [
  ["businessName", "Business name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["addressLine1", "Address"],
  ["city", "City"],
  ["vatNumber", "VAT number"],
] as const;

function DemoSettings() {
  const state = useDemoState();

  const set = (key: string, value: string) =>
    setDemoState((s) => ({ ...s, profile: { ...s.profile, [key]: value } }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Business profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        These details appear on every quote, invoice and proposal you send.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(([key, label]) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input
                  className="mt-1"
                  value={state.profile[key]}
                  onChange={(e) => set(key, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div>
            <Label className="text-xs">Banking details</Label>
            <Textarea
              className="mt-1"
              rows={3}
              value={state.profile.bankDetails}
              onChange={(e) => set("bankDetails", e.target.value)}
            />
          </div>
          <Button onClick={() => toast.success("Saved to this browser")}>Save changes</Button>
        </CardContent>
      </Card>

      <Card className="mt-6 border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
          <p className="text-sm text-muted-foreground">
            Logo upload, branded PDFs and real email sending unlock with a free account.
          </p>
          <Button asChild>
            <Link to="/auth">Create free account</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
