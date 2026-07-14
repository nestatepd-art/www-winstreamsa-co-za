import { useEffect, useMemo, useState } from "react";

type Args = {
  ready: boolean;
  build: () => Blob;
};

/**
 * Turns a jsPDF blob into an object URL for <iframe> preview.
 * Rebuilds only when `ready` becomes true; caller should memoize `build` externally.
 */
export function usePdfPreviewUrl({ ready, build }: Args) {
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const b = build();
    if (cancelled) return;
    const u = URL.createObjectURL(b);
    setBlob(b);
    setUrl(u);
    return () => {
      cancelled = true;
      URL.revokeObjectURL(u);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const getBase64 = useMemo(
    () => async () => {
      if (!blob) return null;
      const buf = await blob.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    },
    [blob],
  );

  return { url, getBase64 };
}
