import { useEffect, useMemo, useState } from "react";

type Args = {
  ready: boolean;
  build: () => Blob;
};

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(bin);
}

/**
 * Turns a jsPDF blob into a data: URL for <iframe> preview.
 * Data URLs render reliably across browsers (Edge blocks blob: PDFs in iframes).
 */
export function usePdfPreviewUrl({ ready, build }: Args) {
  const [url, setUrl] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const b = build();
      const b64 = await blobToBase64(b);
      if (cancelled) return;
      setBase64(b64);
      setUrl(`data:application/pdf;base64,${b64}`);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const getBase64 = useMemo(
    () => async () => base64,
    [base64],
  );

  return { url, getBase64 };
}
