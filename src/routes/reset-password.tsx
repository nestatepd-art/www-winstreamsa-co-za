import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/password-input";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — WinStream SA" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState<"checking" | "ok" | "expired">("checking");

  // Establish the recovery session from whichever link format arrived:
  // #access_token=... (implicit), ?code=... (PKCE) or ?token_hash=...&type=recovery.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);

      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      } else if (query.get("code")) {
        await supabase.auth.exchangeCodeForSession(query.get("code")!);
      } else if (query.get("token_hash")) {
        await supabase.auth.verifyOtp({ type: "recovery", token_hash: query.get("token_hash")! });
      }

      for (let attempt = 0; attempt < 6; attempt++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (!cancelled) setReady("ok");
          return;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      if (!cancelled) setReady("expired");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      // "New password should be different from the old password" means the
      // password they typed is already the correct one — they're signed in via
      // the recovery link, so just let them through instead of blocking.
      if (/different from the old password|same_password/i.test(error.message)) {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          toast.success("That's already your password — signing you in.");
          window.location.assign("/dashboard");
          return;
        }
      }
      if (/session|expired|invalid/i.test(error.message)) {
        setReady("expired");
        return toast.error("This reset link has expired", {
          description: "Request a new reset link from the sign-in page.",
        });
      }
      return toast.error(error.message);
    }
    toast.success("Password updated");
    window.location.assign("/dashboard");
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Set a new password</CardTitle>
          <CardDescription>Enter and confirm your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="np">New password</Label>
              <PasswordInput id="np" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp">Confirm password</Label>
              <PasswordInput id="cp" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
