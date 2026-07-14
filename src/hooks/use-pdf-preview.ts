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

/** Builds the PDF once and exposes Base64 for server-side email attachments. */
export function usePdfPreviewUrl({ ready, build }: Args) {
  const [base64, setBase64] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      setBase64(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const b = build();
      const b64 = await blobToBase64(b);
      if (cancelled) return;
      setBase64(b64);
    })();
    return () => { cancelled = true; };
  }, [ready, build]);

  const getBase64 = useMemo(
    () => async () => {
      if (base64 || !ready) return base64;
      return blobToBase64(build());
    },
    [base64, build, ready],
  );

  return { getBase64 };
}
