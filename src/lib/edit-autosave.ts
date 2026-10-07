import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

/** Autosaves edits of an existing record to localStorage every 2s and on exit.
 *  Restores unsaved changes after the record loads. */
export function useEditAutosave<T>(opts: { key: string; ready: boolean; data: T; apply: (d: T) => void }) {
  const storageKey = `ws-edit-autosave:${opts.key}`;
  const serialized = JSON.stringify(opts.data);
  const latest = useRef({ serialized, ready: opts.ready, baseline: null as string | null, storageKey });
  latest.current.serialized = serialized;
  latest.current.ready = opts.ready;
  latest.current.storageKey = storageKey;
  const applyRef = useRef(opts.apply);
  applyRef.current = opts.apply;
  const restored = useRef(false);

  // Once the saved record has loaded, restore any unsaved copy.
  useEffect(() => {
    if (!opts.ready || restored.current) return;
    restored.current = true;
    latest.current.baseline = serialized;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw && raw !== serialized) {
        applyRef.current(JSON.parse(raw) as T);
        toast.info("Restored your unsaved changes");
      }
    } catch {
      /* ignore */
    }
  }, [opts.ready, serialized, storageKey]);

  useEffect(() => {
    const flush = () => {
      const c = latest.current;
      if (!c.ready || c.baseline === null) return;
      try {
        if (c.serialized === c.baseline) localStorage.removeItem(c.storageKey);
        else localStorage.setItem(c.storageKey, c.serialized);
      } catch {
        /* storage full */
      }
    };
    const iv = setInterval(flush, 2000);
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  /** Call after a successful save. */
  const clear = useCallback(() => {
    latest.current.baseline = latest.current.serialized;
    localStorage.removeItem(latest.current.storageKey);
  }, []);

  return { clear };
}
