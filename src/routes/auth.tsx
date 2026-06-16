import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · VukaFlow" },
      { name: "description", content: "Sign in to VukaFlow — work automation for South African businesses." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
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
    toast.success("Account created — let's set up your business");
    navigate({ to: "/settings" });
  };

  const inIframe = typeof window !== "undefined" && window.self !== window.top;

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
      if (result.redirected) return;
      // Make sure a business profile exists for this user (Google sign-up bypasses the form)
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: existing } = await supabase
          .from("business_profiles")
          .select("id")
          .eq("user_id", userData.user.id)
          .maybeSingle();
        if (!existing) {
          await supabase.from("business_profiles").insert({
            user_id: userData.user.id,
            business_name: userData.user.user_metadata?.full_name || "My Business",
          });
        }
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      setLoading(false);
      toast.error("Google sign-in failed", { description: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-primary-foreground/10 grid place-items-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">VukaFlow</span>
        </div>
        <div className="space-y-6 max-w-md">
          <h1 className="text-4xl font-semibold tracking-tight leading-tight">
            Stop writing quotes at midnight.
          </h1>
          <p className="text-primary-foreground/75 text-lg">
            VukaFlow drafts, quotes and follows up — in your tone, in ZAR, VAT-compliant.
            Built for South African businesses.
          </p>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li>✓ Branded quotes in 30 seconds</li>
            <li>✓ Automatic VAT (15%) and SARS-friendly descriptions</li>
            <li>✓ Follow-up sequences that get you paid</li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/50">
          🇿🇦 Made for South African SMEs
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to VukaFlow</CardTitle>
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
                    <Input id="si-pass" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                  </Button>
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
                    <Input id="su-pass" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">OR</span></div>
            </div>

            <Button variant="outline" type="button" disabled={loading} onClick={signInGoogle} className="w-full">
              <span suppressHydrationWarning>
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
