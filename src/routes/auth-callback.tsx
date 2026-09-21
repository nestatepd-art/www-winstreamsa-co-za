import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth-callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in — WinStream SA" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthCallbackPage,
});

/**
 * Public landing spot for emailed verification links. The protected workspace
 * cannot be the link target: its guard runs before the session in the URL is
 * stored, so it bounces verified users straight back to the sign-in screen.
 */
function AuthCallbackPage() {
  const [state, setState] = useState<"working" | "failed">("working");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);

      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      const type = hash.get("type") || query.get("type");

      try {
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        } else if (query.get("code")) {
          await supabase.auth.exchangeCodeForSession(query.get("code")!);
        } else if (query.get("token_hash")) {
          await supabase.auth.verifyOtp({
            type: (type as "signup" | "email" | "recovery" | "invite") || "signup",
            token_hash: query.get("token_hash")!,
          });
        }
      } catch {
        /* fall through to the session poll below */
      }

      if (type === "recovery") {
        window.location.assign("/reset-password");
        return;
      }

      for (let attempt = 0; attempt < 8; attempt++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          window.location.assign("/dashboard");
          return;
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!cancelled) setState("failed");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "working") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">This link has already been used</CardTitle>
          <CardDescription>
            Verification links work once, and only in the browser you open them in. Your account may already be
            verified — try signing in, or resend the verification email from the sign-in page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => window.location.assign("/auth")}>
            Go to sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
