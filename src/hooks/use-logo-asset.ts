import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "business-logos";

async function pathToBlob(path: string): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return data;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function isStoragePath(v?: string | null): v is string {
  return !!v && !/^(https?:|data:|blob:)/i.test(v);
}

/**
 * Given a stored logo reference (either a storage path like `<user_id>/file.png`
 * or a full URL), returns { url, dataUrl } — `url` is safe to render in <img>
 * and `dataUrl` is used for jsPDF embedding.
 */
export function useLogoAsset(logoRef?: string | null) {
  return useQuery({
    queryKey: ["business-logo", logoRef ?? "none"],
    enabled: !!logoRef,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!logoRef) return null;
      if (/^(data:|https?:)/i.test(logoRef)) {
        return { url: logoRef, dataUrl: logoRef.startsWith("data:") ? logoRef : null };
      }
      const blob = await pathToBlob(logoRef);
      if (!blob) return null;
      const dataUrl = await blobToDataUrl(blob);
      return { url: dataUrl, dataUrl };
    },
  });
}

export const LOGO_BUCKET = BUCKET;
