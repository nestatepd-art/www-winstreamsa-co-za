import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/password-input";
import winstreamLogo from "@/assets/winstream-logo.png.asset.json";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — WinStream SA" },
      { name: "description", content: "Sign in or create your WinStream SA account to automate quotes, follow-ups, and proposals for your South African business." },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Sign in — WinStream SA" },
      { property: "og:description", content: "Access your WinStream SA workspace." },
      { property: "og:url", content: "https://www.winstreamsa.co.za/auth" },
    ],
    links: [{ rel: "canonical", href: "https://www.winstreamsa.co.za/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [inIframe, setInIframe] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const resendVerification = async () => {
    const target = (pendingEmail || email).trim();
    if (!target) return toast.error("Enter your email above first");
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: target,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(false);
    if (error) {
      if (/already confirmed|already been confirmed/i.test(error.message)) {
        setPendingEmail(null);
        return toast.success("This account is already verified — you can sign in.");
      }
      if (/rate|seconds|too many/i.test(error.message)) {
        setResendCooldown(60);
        return toast.error("Please wait a minute before requesting another email.");
      }
      return toast.error(error.message);
    }
    setPendingEmail(target);
    setResendCooldown(60);
    toast.success("Verification email sent", { description: `Check the inbox (and spam) for ${target}.`, duration: 7000 });
  };


  useEffect(() => {
    setInIframe(window.self !== window.top);
  }, []);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      if (/not confirmed|confirm your email/i.test(error.message)) {
        setPendingEmail(email.trim());
        return toast.error("Your email isn't verified yet", {
          description: "Use the 'Resend verification email' button below.",
          duration: 7000,
        });
      }
      const msg = /invalid login/i.test(error.message)
        ? "Email or password is incorrect. If you signed up with Google, use 'Continue with Google'. Otherwise use 'Forgot password' below."
        : error.message;
      return toast.error(msg);
    }

    toast.success("Welcome back");
    // Full document navigation: the router/query caches were built for the
    // signed-out session, and invalidating them mid-flight is what used to
    // leave the app on a blank screen until a manual refresh.
    window.location.assign("/dashboard");
  };

  const sendReset = async () => {
    if (!email.trim()) return toast.error("Enter your email above first");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent", { description: "Check your inbox for the link." });
    setForgotOpen(false);
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    if (data.user) {
      // seed empty business profile so user can edit it right away
      await supabase.from("business_profiles").insert({
        user_id: data.user.id,
        business_name: businessName || "My Business",
      });
    }
    setLoading(false);
    toast.success("Account created — please check your mailbox to verify your account before signing in.", {
      duration: 7000,
    });
    if (!data.session) {
      setPendingEmail(email.trim());
      setResendCooldown(30);
      return;
    }
    navigate({ to: "/settings" });
  };


  const signInGoogle = async () => {
    // Lovable preview runs inside an iframe — OAuth popups/redirects can be blocked
    // by third-party cookie policies, leaving the user on a white page after Google.
    // Detect iframe and pop the auth page out into a top-level tab first.
    if (inIframe) {
      const url = window.location.href;
      window.open(url, "_blank", "noopener,noreferrer");
      toast.message("Opened sign-in in a new tab", {
        description: "Google sign-in needs a top-level window. Continue there.",
      });
      return;
    }
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/dashboard",
      });
      if (result.error) {
        setLoading(false);
        toast.error("Google sign-in failed", { description: String(result.error.message ?? result.error) });
        return;
      }
      // The OAuth flow redirects away; profile creation and pending-purchase
      // claiming happen in __root.tsx's onAuthStateChange after redirect.
      if (result.redirected) return;
      window.location.assign("/dashboard");
    } catch (err) {
      setLoading(false);
      toast.error("Google sign-in failed", { description: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{
          background:
            "radial-gradient(60% 50% at 15% 10%, oklch(0.78 0.13 195 / 0.22) 0%, transparent 60%), radial-gradient(55% 45% at 90% 80%, oklch(0.62 0.18 270 / 0.28) 0%, transparent 60%), oklch(0.10 0.04 264)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/10 grid place-items-center p-1">
            <img src={winstreamLogo.url} alt="WinStream" className="h-full w-full object-contain" />
          </div>
          <span className="text-lg font-semibold tracking-tight">WinStream</span>
        </div>
        <div className="space-y-6 max-w-md">
          <h1 className="text-4xl font-semibold tracking-tight leading-tight">
            Stop writing quotes at midnight.
          </h1>
          <p className="text-white/75 text-lg">
            WinStream drafts, quotes and follows up — in your tone, in ZAR, VAT-compliant.
            Built for South African businesses.
          </p>
          <ul className="space-y-2 text-sm text-white/80">
            <li>✓ Branded quotes in 30 seconds</li>
            <li>✓ Automatic VAT (15%) and SARS-friendly descriptions</li>
            <li>✓ Follow-up sequences that get you paid</li>
          </ul>
        </div>
        <p className="text-xs text-white/50">
          🇿🇦 Made for South African SMEs
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to WinStream</CardTitle>
            <CardDescription>Sign in or create your business account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4 mt-6">
                <form onSubmit={signIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="si-email">Email</Label>
                    <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-pass">Password</Label>
                    <PasswordInput id="si-pass" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setForgotOpen((v) => !v)}
                    className="block w-full text-center text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </button>
                  {forgotOpen && (
                    <div className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-2">
                      <p className="text-muted-foreground">
                        We'll email a reset link to <span className="font-medium text-foreground">{email || "the address above"}</span>.
                      </p>
                      <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={sendReset} className="w-full">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
                      </Button>
                    </div>
                  )}
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <form onSubmit={signUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="su-biz">Business name</Label>
                    <Input id="su-biz" required placeholder="e.g. Sipho's Plumbing" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pass">Password</Label>
                    <PasswordInput id="su-pass" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 rounded-md border border-border bg-muted/30 p-3 space-y-2">
              {pendingEmail ? (
                <p className="text-sm text-muted-foreground">
                  We sent a verification link to{" "}
                  <span className="font-medium text-foreground">{pendingEmail}</span>. Didn't get it? Check spam, then resend below.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Didn't receive your account verification email? Enter your address above and resend it.
                </p>
              )}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full"
                disabled={loading || resendCooldown > 0}
                onClick={resendVerification}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : resendCooldown > 0 ? (
                  `Resend verification email (${resendCooldown}s)`
                ) : (
                  "Resend verification email"
                )}
              </Button>
            </div>


            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">OR</span></div>
            </div>

            <Button variant="outline" type="button" disabled={loading} onClick={signInGoogle} className="w-full">
              <span>
                {inIframe ? "Continue with Google (opens new tab)" : "Continue with Google"}
              </span>
            </Button>
            {inIframe && (
              <p className="mt-2 text-xs text-muted-foreground text-center">
                You're in the Lovable preview. Google sign-in needs a top-level window — we'll open it for you.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
