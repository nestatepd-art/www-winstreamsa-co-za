import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  IDLE_LOGOUT_FLAG,
  idleState,
  markActivity,
  readLastActivity,
  resetIdleClock,
} from "@/lib/idle-timeout";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll", "mousemove"] as const;
const WARNING_TOAST_ID = "idle-logout-warning";

/**
 * Signs the user out after a period of inactivity (shared across tabs via
 * localStorage, so activity in any open tab keeps the session alive) and
 * sends them to the sign-in page.
 */
export function useIdleLogout() {
  const signingOut = useRef(false);

  useEffect(() => {
    // No recorded activity means a fresh sign-in: start the clock now.
    // A stale timestamp (e.g. laptop reopened next day) is caught by check().
    if (readLastActivity() === null) markActivity();

    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < 5000) return; // throttle storage writes
      lastWrite = now;
      const last = readLastActivity();
      if (last !== null && idleState(last, now) === "expired") return check();
      markActivity(now);
      toast.dismiss(WARNING_TOAST_ID);
    };

    const signOut = async () => {
      if (signingOut.current) return;
      signingOut.current = true;
      toast.dismiss(WARNING_TOAST_ID);
      try {
        window.sessionStorage.setItem(IDLE_LOGOUT_FLAG, "1");
      } catch {
        /* ignore */
      }
      resetIdleClock();
      try {
        await supabase.auth.signOut();
      } finally {
        window.location.replace("/auth");
      }
    };

    function check() {
      const last = readLastActivity();
      if (last === null) return;
      const state = idleState(last, Date.now());
      if (state === "expired") {
        void signOut();
      } else if (state === "warning") {
        toast.warning("You'll be signed out in 1 minute", {
          id: WARNING_TOAST_ID,
          description: "You've been inactive. Your work is autosaved.",
          duration: Infinity,
          action: {
            label: "Stay signed in",
            onClick: () => {
              markActivity();
              lastWrite = Date.now();
            },
          },
        });
      } else {
        toast.dismiss(WARNING_TOAST_ID);
      }
    }

    check();
    const interval = window.setInterval(check, 10_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    for (const e of ACTIVITY_EVENTS) window.addEventListener(e, onActivity, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);

    return () => {
      window.clearInterval(interval);
      for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, onActivity);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      toast.dismiss(WARNING_TOAST_ID);
    };
  }, []);
}
