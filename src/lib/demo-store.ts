/**
 * Browser-only sandbox store powering the no-signup demo workspace.
 * Nothing here touches the backend — state lives in localStorage and is
 * discarded when the visitor clears it or resets the demo.
 */
import { useSyncExternalStore } from "react";

const KEY = "winstream-demo-v1";
export const DEMO_AI_LIMIT = 3;

export type DemoClient = {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
};

export type DemoLineItem = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
};

export type DemoDocType = "quote" | "invoice" | "proposal";
export type DemoDocStatus = "draft" | "sent" | "accepted" | "paid" | "overdue";

export type DemoDoc = {
  id: string;
  type: DemoDocType;
  number: string;
  clientId: string;
  title: string;
  items: DemoLineItem[];
  notes: string;
  status: DemoDocStatus;
  createdAt: string;
  dueDate: string;
  vatInclusive: boolean;
  autoNudge: boolean;
};

export type DemoProfile = {
  businessName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  vatNumber: string;
  bankDetails: string;
};

export type DemoState = {
  profile: DemoProfile;
  clients: DemoClient[];
  docs: DemoDoc[];
  aiUsed: number;
};

export const uid = () => Math.random().toString(36).slice(2, 10);

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

function seed(): DemoState {
  const c1 = uid();
  const c2 = uid();
  return {
    profile: {
      businessName: "Demo Plumbing & Projects",
      email: "hello@demoplumbing.co.za",
      phone: "071 000 0000",
      addressLine1: "12 Loop Street",
      city: "Cape Town",
      vatNumber: "4123456789",
      bankDetails: "FNB · Cheque · 6250 1234 567 · Branch 250655",
    },
    clients: [
      {
        id: c1,
        name: "Kruger Properties",
        contact: "Anelle Kruger",
        email: "anelle@krugerprops.co.za",
        phone: "082 555 1234",
      },
      {
        id: c2,
        name: "Sandton Body Corporate",
        contact: "Thabo Nkosi",
        email: "thabo@sandtonbc.co.za",
        phone: "083 221 8890",
      },
    ],
    docs: [
      {
        id: uid(),
        type: "quote",
        number: "QUO-1001",
        clientId: c1,
        title: "Geyser replacement — Unit 4",
        items: [
          { id: uid(), description: "Supply and install 150L Kwikot geyser", qty: 1, unitPrice: 8450 },
          { id: uid(), description: "Drip tray, vacuum breaker and pipework", qty: 1, unitPrice: 1250 },
          { id: uid(), description: "Labour — certified plumber (half day)", qty: 1, unitPrice: 950 },
        ],
        notes: "Valid for 14 days. 50% deposit on acceptance. Prices VAT inclusive at 15%.",
        status: "sent",
        createdAt: today(),
        dueDate: plusDays(14),
        vatInclusive: true,
        autoNudge: true,
      },
      {
        id: uid(),
        type: "invoice",
        number: "INV-2001",
        clientId: c2,
        title: "Monthly maintenance — July",
        items: [
          { id: uid(), description: "Scheduled plumbing maintenance across 3 blocks", qty: 1, unitPrice: 6200 },
        ],
        notes: "Payable within 7 days. EFT only, reference the invoice number.",
        status: "overdue",
        createdAt: plusDays(-21),
        dueDate: plusDays(-6),
        vatInclusive: true,
        autoNudge: true,
      },
    ],
    aiUsed: 0,
  };
}

let state: DemoState | null = null;
const listeners = new Set<() => void>();

function load(): DemoState {
  if (state) return state;
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as DemoState) : seed();
  } catch {
    state = seed();
  }
  return state;
}

function persist() {
  if (typeof window === "undefined" || !state) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — demo still works in memory */
  }
}

export function setDemoState(update: (prev: DemoState) => DemoState) {
  state = update(load());
  persist();
  listeners.forEach((l) => l());
}

export function resetDemo() {
  state = seed();
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const SERVER_SNAPSHOT = seed();

export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, load, () => SERVER_SNAPSHOT);
}

/* ---------- helpers ---------- */

export const VAT_RATE = 0.15;

export function docTotals(doc: DemoDoc) {
  const gross = doc.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const subtotal = doc.vatInclusive ? gross / (1 + VAT_RATE) : gross;
  const vat = doc.vatInclusive ? gross - subtotal : gross * VAT_RATE;
  const total = subtotal + vat;
  return { subtotal, vat, total };
}

export function money(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function nextNumber(docs: DemoDoc[], type: DemoDocType) {
  const prefix = type === "quote" ? "QUO" : type === "invoice" ? "INV" : "PRO";
  const base = type === "quote" ? 1000 : type === "invoice" ? 2000 : 3000;
  const count = docs.filter((d) => d.type === type).length;
  return `${prefix}-${base + count + 1}`;
}

export function clientName(state: DemoState, clientId: string) {
  return state.clients.find((c) => c.id === clientId)?.name ?? "Unknown client";
}

export function addClient(client: Omit<DemoClient, "id">) {
  const id = uid();
  setDemoState((s) => ({ ...s, clients: [...s.clients, { ...client, id }] }));
  return id;
}

export function removeClient(id: string) {
  setDemoState((s) => ({
    ...s,
    clients: s.clients.filter((c) => c.id !== id),
    docs: s.docs.filter((d) => d.clientId !== id),
  }));
}

export function addDoc(doc: Omit<DemoDoc, "id" | "number"> & { number?: string }) {
  const id = uid();
  setDemoState((s) => ({
    ...s,
    docs: [{ ...doc, id, number: doc.number ?? nextNumber(s.docs, doc.type) }, ...s.docs],
  }));
  return id;
}

export function updateDoc(id: string, patch: Partial<DemoDoc>) {
  setDemoState((s) => ({
    ...s,
    docs: s.docs.map((d) => (d.id === id ? { ...d, ...patch } : d)),
  }));
}

export function removeDoc(id: string) {
  setDemoState((s) => ({ ...s, docs: s.docs.filter((d) => d.id !== id) }));
}

export function bumpAiUsage() {
  setDemoState((s) => ({ ...s, aiUsed: s.aiUsed + 1 }));
}

export function updateClient(id: string, patch: Partial<Omit<DemoClient, "id">>) {
  setDemoState((s) => ({
    ...s,
    clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  }));
}
