import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export function ProposalPdfPreview({ blob }: { blob: Blob | null }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const target = container.current;
    if (!blob || !target) return;
    let cancelled = false;
    let cleanup = () => {};
    target.replaceChildren(); setError(""); setLoading(true);
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
      cleanup = () => { void task.destroy(); };
      const pdf = await task.promise;
      for (let index = 1; index <= pdf.numPages; index++) {
        if (cancelled) return;
        const page = await pdf.getPage(index);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width; canvas.height = viewport.height;
        canvas.className = "w-full h-auto bg-document-page border border-document-border";
        canvas.setAttribute("aria-label", `Proposal PDF page ${index}`);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("PDF preview is unavailable in this browser.");
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        if (!cancelled) target.appendChild(canvas);
      }
      if (!cancelled) setLoading(false);
    })().catch((e) => { if (!cancelled) { setError(e instanceof Error ? e.message : "PDF preview unavailable"); setLoading(false); } });
    return () => { cancelled = true; cleanup(); };
  }, [blob]);
  return <section aria-label="Proposal PDF preview" className="space-y-4 max-w-3xl mx-auto">
    {loading && <div className="flex items-center gap-2 text-muted-foreground p-6"><Loader2 className="size-4 animate-spin" /> Preparing PDF…</div>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <div ref={container} className="space-y-4" />
  </section>;
}