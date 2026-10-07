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
  /** Created by autosave (not explicitly parked). */
  auto?: boolean;
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

  const serialized = JSON.stringify(opts.data);
  const initialRef = useRef(serialized);
  const latest = useRef({ ...opts, serialized, draftId });
  latest.current = { ...opts, serialized, draftId };

  // Restore a parked draft (on resume), or the last autosaved one after an exit.
  useEffect(() => {
    const check = (fromMount: boolean) => {
      let id = sessionStorage.getItem(RESUME_KEY);
      if (!id && fromMount) {
        id = read().find((x) => x.kind === opts.kind && x.auto)?.id ?? null;
      }
      if (!id) return;
      const d = getTrayDraft(id);
      if (!d || d.kind !== opts.kind) return;
      sessionStorage.removeItem(RESUME_KEY);
      applyRef.current(d.data as T);
      initialRef.current = JSON.stringify(d.data);
      setDraftId(d.id);
    };
    check(true);
    const onResume = () => check(false);
    window.addEventListener(RESUME_EVT, onResume);
    return () => window.removeEventListener(RESUME_EVT, onResume);
  }, [opts.kind]);

  // Autosave every 2 seconds while editing, and immediately on tab hide / exit.
  useEffect(() => {
    const flush = () => {
      const c = latest.current;
      if (!c.draftId && c.serialized === initialRef.current) return; // nothing typed yet
      const existing = c.draftId ? getTrayDraft(c.draftId) : undefined;
      if (c.draftId && !existing) return; // discarded or saved
      const id = c.draftId ?? crypto.randomUUID();
      if (existing && existing.data && JSON.stringify(existing.data) === c.serialized && existing.title === (c.title || "Untitled")) return;
      saveTrayDraft({
        id,
        kind: c.kind,
        route: c.route,
        title: c.title || "Untitled",
        updatedAt: Date.now(),
        data: JSON.parse(c.serialized),
        auto: existing ? existing.auto : true,
      });
      if (!c.draftId) { latest.current.draftId = id; setDraftId(id); }
    };
    const iv = setInterval(flush, 2000);
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush(); // navigating away inside the app
    };
  }, []);

  const minimize = useCallback(() => {
    const id = draftId ?? crypto.randomUUID();
    saveTrayDraft({
      id,
      kind: opts.kind,
      route: opts.route,
      title: opts.title || "Untitled",
      updatedAt: Date.now(),
      data: JSON.parse(serialized),
      auto: false,
    });
    latest.current.draftId = null;
    initialRef.current = serialized;
    setDraftId(null);
    router.navigate({ to: "/dashboard" });
  }, [draftId, opts.kind, opts.route, opts.title, serialized, router]);

  const clear = useCallback(() => {
    const cur = latest.current.draftId ?? draftId;
    if (cur) removeTrayDraft(cur);
    initialRef.current = latest.current.serialized;
    latest.current.draftId = null;
    setDraftId(null);
  }, [draftId]);

  return { minimize, clear, draftId };
}
