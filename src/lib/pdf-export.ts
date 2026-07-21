import { jsPDF } from "jspdf";
import { formatZAR, formatDate } from "./format";

type LineItem = {
  description: string;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
};

type Profile = {
  business_name?: string | null;
  vat_number?: string | null;
  email?: string | null;
  phone?: string | null;
  bank_name?: string | null;
  bank_account_holder?: string | null;
  bank_account_number?: string | null;
  bank_branch_code?: string | null;
};

type Client = {
  name?: string | null;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
};

type DocumentData = {
  kind: "Invoice" | "Quote";
  number: string;
  title: string;
  status?: string;
  issue_date?: string | null;
  due_date?: string | null;
  expiry_date?: string | null;
  subtotal: number | string;
  vat_rate: number | string;
  vat_amount: number | string;
  total: number | string;
  notes?: string | null;
  terms?: string | null;
  items: LineItem[];
  client?: Client | null;
  profile?: Profile | null;
  showBranding?: boolean;
  logoDataUrl?: string | null;
};


const MARGIN = 40;
const PAGE_W = 595; // A4 portrait pt
const PAGE_H = 842;

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(String(text ?? ""), maxWidth);
}

export function generateDocumentPdf(data: DocumentData): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = MARGIN;
  const contentW = PAGE_W - MARGIN * 2;

  // Header — logo + business
  let headerX = MARGIN;
  if (data.logoDataUrl) {
    try {
      const fmt = data.logoDataUrl.includes("image/jpeg") ? "JPEG" : "PNG";
      doc.addImage(data.logoDataUrl, fmt, MARGIN, y - 4, 44, 44, undefined, "FAST");
      headerX = MARGIN + 54;
    } catch {
      // ignore invalid image
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text(data.profile?.business_name || "Your business", headerX, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  if (data.profile?.vat_number) { doc.text(`VAT: ${data.profile.vat_number}`, headerX, y); y += 12; }
  if (data.profile?.email) { doc.text(data.profile.email, headerX, y); y += 12; }
  if (data.profile?.phone) { doc.text(data.profile.phone, headerX, y); y += 12; }
  if (data.logoDataUrl) y = Math.max(y, MARGIN + 48);

  // Title block — top right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20);
  doc.text(data.kind.toUpperCase(), PAGE_W - MARGIN, MARGIN + 4, { align: "right" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90);
  doc.text(data.number, PAGE_W - MARGIN, MARGIN + 22, { align: "right" });
  if (data.status) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(data.status.toUpperCase(), PAGE_W - MARGIN, MARGIN + 38, { align: "right" });
  }

  y = Math.max(y, MARGIN + 60) + 10;

  // Divider
  doc.setDrawColor(220);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 16;

  // Billed to / dates
  const colW = contentW / 2;
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text("BILLED TO", MARGIN, y);
  doc.text(data.kind === "Invoice" ? "ISSUE DATE" : "ISSUE DATE", MARGIN + colW, y);
  y += 12;
  doc.setFontSize(10);
  doc.setTextColor(30);
  doc.setFont("helvetica", "bold");
  doc.text(data.client?.name || "—", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.issue_date ? formatDate(data.issue_date) : "—", MARGIN + colW, y);
  y += 14;
  doc.setFontSize(9);
  doc.setTextColor(90);
  if (data.client?.contact_person) { doc.text(data.client.contact_person, MARGIN, y); y += 12; }
  if (data.client?.email) { doc.text(data.client.email, MARGIN, y); y += 12; }

  const dueLabel = data.kind === "Invoice" ? "DUE DATE" : "VALID UNTIL";
  const dueVal = data.kind === "Invoice" ? data.due_date : data.expiry_date;
  if (dueVal) {
    doc.setFontSize(8); doc.setTextColor(130);
    doc.text(dueLabel, MARGIN + colW, y - 12);
    doc.setFontSize(10); doc.setTextColor(30);
    doc.text(formatDate(dueVal), MARGIN + colW, y);
    y += 4;
  }

  y += 14;

  // Table header
  y = ensureSpace(doc, y, 30);
  doc.setFillColor(245, 245, 247);
  doc.rect(MARGIN, y, contentW, 22, "F");
  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.setFont("helvetica", "bold");
  const col = {
    desc: MARGIN + 8,
    qty: MARGIN + contentW - 220,
    unit: MARGIN + contentW - 140,
    total: MARGIN + contentW - 8,
  };
  doc.text("DESCRIPTION", col.desc, y + 14);
  doc.text("QTY", col.qty, y + 14, { align: "right" });
  doc.text("UNIT", col.unit, y + 14, { align: "right" });
  doc.text("TOTAL", col.total, y + 14, { align: "right" });
  y += 26;

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30);
  doc.setFontSize(10);
  for (const it of data.items) {
    const descLines = wrapText(doc, it.description, contentW - 240);
    const rowH = Math.max(18, descLines.length * 12 + 6);
    y = ensureSpace(doc, y, rowH + 4);
    doc.text(descLines, col.desc, y + 10);
    doc.text(String(Number(it.quantity)), col.qty, y + 10, { align: "right" });
    doc.text(formatZAR(it.unit_price), col.unit, y + 10, { align: "right" });
    doc.text(formatZAR(it.line_total), col.total, y + 10, { align: "right" });
    y += rowH;
    doc.setDrawColor(235);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  }

  y += 12;

  // Totals
  y = ensureSpace(doc, y, 70);
  const totalsX = PAGE_W - MARGIN - 200;
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text("Subtotal", totalsX, y);
  doc.setTextColor(30);
  doc.text(formatZAR(data.subtotal), PAGE_W - MARGIN, y, { align: "right" });
  y += 16;
  doc.setTextColor(90);
  doc.text(`VAT (${Number(data.vat_rate)}%)`, totalsX, y);
  doc.setTextColor(30);
  doc.text(formatZAR(data.vat_amount), PAGE_W - MARGIN, y, { align: "right" });
  y += 8;
  doc.setDrawColor(200);
  doc.line(totalsX, y, PAGE_W - MARGIN, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text("Total due", totalsX, y);
  doc.text(formatZAR(data.total), PAGE_W - MARGIN, y, { align: "right" });
  y += 24;

  // Notes / Terms / Bank
  const printBlock = (label: string, text?: string | null) => {
    if (!text) return;
    y = ensureSpace(doc, y, 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(label.toUpperCase(), MARGIN, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    const lines = wrapText(doc, text, contentW);
    for (const ln of lines) {
      y = ensureSpace(doc, y, 12);
      doc.text(ln, MARGIN, y);
      y += 12;
    }
    y += 8;
  };

  printBlock("Notes", data.notes);
  printBlock("Terms", data.terms);

  const p = data.profile;
  if (p?.bank_name || p?.bank_account_number) {
    const bankLines = [
      p?.bank_account_holder,
      p?.bank_name,
      p?.bank_account_number ? `Account: ${p.bank_account_number}` : null,
      p?.bank_branch_code ? `Branch: ${p.bank_branch_code}` : null,
    ].filter(Boolean).join("\n");
    printBlock("Banking details", bankLines);
  }

  if (data.showBranding !== false) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const footerY = PAGE_H - 20;
      doc.setDrawColor(220);
      doc.line(MARGIN, footerY - 12, PAGE_W - MARGIN, footerY - 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text("Generated by WinStream SA", MARGIN, footerY);
      doc.setTextColor(70);
      doc.textWithLink("www.winstreamsa.co.za", PAGE_W - MARGIN, footerY, {
        align: "right",
        url: "https://www.winstreamsa.co.za",
      });
    }
  }

  return doc.output("blob");
}


export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 100);
}
