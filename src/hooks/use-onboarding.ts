import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Routes a user may visit before finishing the "Get set up" checklist. */
export const ONBOARDING_ALLOWED_PATHS = ["/dashboard", "/settings", "/clients/new", "/billing"];

export function isOnboardingAllowedPath(pathname: string) {
  return ONBOARDING_ALLOWED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );
}

export type OnboardingStatus = {
  profileComplete: boolean;
  hasClient: boolean;
  hasDocument: boolean;
  complete: boolean;
};

export function useOnboardingStatus() {
  return useQuery<OnboardingStatus>({
    queryKey: ["onboarding-status"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const [{ data: profile }, { count: clientCount }, { count: quoteCount }, { count: invoiceCount }] =
        await Promise.all([
          supabase
            .from("business_profiles")
            .select("business_name, email, phone, address_line1, city")
            .maybeSingle(),
          supabase.from("clients").select("id", { count: "exact", head: true }),
          supabase.from("quotes").select("id", { count: "exact", head: true }),
          supabase.from("invoices").select("id", { count: "exact", head: true }),
        ]);

      const profileComplete = Boolean(
        profile?.business_name && profile?.email && profile?.phone && profile?.address_line1 && profile?.city,
      );
      const hasClient = (clientCount ?? 0) > 0;
      const hasDocument = (quoteCount ?? 0) > 0 || (invoiceCount ?? 0) > 0;

      return {
        profileComplete,
        hasClient,
        hasDocument,
        // Adding the first client (step 2) unlocks the whole app.
        complete: hasClient || hasDocument,
      };
    },
  });
}
