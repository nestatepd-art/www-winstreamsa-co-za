import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "@tanstack/react-router";

/**
 * "Taskbar" drafts: an in-progress quote / invoice / proposal can be parked
 * and resumed later. Stored in localStorage so it survives reloads.
 */
export type TrayKind = "quote" | "invoice" | "proposal";
export type TrayDraft = {
  id: string;
  kind: TrayKind;
  route: "/quotes/new" | "/invoices/new" | "/proposals/new";
  title: string;
  updatedAt: number;
  data: unknown;
};

const KEY = "ws-draft-tray";
const RESUME_KEY = "ws-draft-resume";
const EVT = "ws-draft-tray-change";
const RESUME_EVT = "ws-draft-resume";

let cache: TrayDraft[] | null = null;
function read(): TrayDraft[] {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    cache = [];
  }
  return cache!;
}
function write(list: TrayDraft[]) {
  cache = list;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}
export function saveTrayDraft(d: TrayDraft) {
  write([d, ...read().filter((x) => x.id !== d.id)]);
}
export function removeTrayDraft(id: string) {
  write(read().filter((x) => x.id !== id));
}
export function getTrayDraft(id: string) {
  return read().find((x) => x.id === id);
}

const EMPTY: TrayDraft[] = [];
export function useTrayDrafts() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVT, cb);
      const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) {
          cache = null;
          cb();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        window.removeEventListener(EVT, cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    read,
    () => EMPTY,
  );
}

export function useResumeDraft() {
  const router = useRouter();
  return (d: TrayDraft) => {
    sessionStorage.setItem(RESUME_KEY, d.id);
    window.dispatchEvent(new Event(RESUME_EVT));
    router.navigate({ to: d.route });
  };
}

/** Wire a builder page into the taskbar. */
export function useTaskbarDraft<T>(opts: {
  kind: TrayKind;
  route: TrayDraft["route"];
  title: string;
  data: T;
  apply: (data: T) => void;
}) {
  const router = useRouter();
  const [draftId, setDraftId] = useState<string | null>(null);
  const applyRef = useRef(opts.apply);
  applyRef.current = opts.apply;

  // Restore a parked draft (on mount and when resuming from the taskbar).
  useEffect(() => {
    const check = () => {
      const id = sessionStorage.getItem(RESUME_KEY);
      if (!id) return;
      const d = getTrayDraft(id);
      if (!d || d.kind !== opts.kind) return;
      sessionStorage.removeItem(RESUME_KEY);
      applyRef.current(d.data as T);
      setDraftId(d.id);
    };
    check();
    window.addEventListener(RESUME_EVT, check);
    return () => window.removeEventListener(RESUME_EVT, check);
  }, [opts.kind]);

  // Keep the parked copy up to date while editing it.
  const serialized = JSON.stringify(opts.data);
  useEffect(() => {
    if (!draftId || !getTrayDraft(draftId)) return;
    const t = setTimeout(() => {
      saveTrayDraft({
        id: draftId,
        kind: opts.kind,
        route: opts.route,
        title: opts.title || "Untitled",
        updatedAt: Date.now(),
        data: JSON.parse(serialized),
      });
    }, 500);
    return () => clearTimeout(t);
  }, [serialized, draftId, opts.kind, opts.route, opts.title]);

  const minimize = useCallback(() => {
    const id = draftId ?? crypto.randomUUID();
    saveTrayDraft({
      id,
      kind: opts.kind,
      route: opts.route,
      title: opts.title || "Untitled",
      updatedAt: Date.now(),
      data: JSON.parse(serialized),
    });
    setDraftId(null);
    router.navigate({ to: "/dashboard" });
  }, [draftId, opts.kind, opts.route, opts.title, serialized, router]);

  const clear = useCallback(() => {
    if (draftId) removeTrayDraft(draftId);
    setDraftId(null);
  }, [draftId]);

  return { minimize, clear, draftId };
}
