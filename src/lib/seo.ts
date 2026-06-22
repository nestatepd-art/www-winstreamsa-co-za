import ogAsset from "@/assets/og-winstream-v2.jpg.asset.json";

export const SITE_URL = "https://winstreamsa.co.za";

/**
 * Default branded OG image used as fallback across the site.
 * Any route without a page-specific og:image automatically inherits this,
 * so new blog posts get a branded preview without per-page configuration.
 */
export const DEFAULT_OG_IMAGE = `${SITE_URL}${ogAsset.url}`;
export const DEFAULT_OG_IMAGE_WIDTH = 1216;
export const DEFAULT_OG_IMAGE_HEIGHT = 640;
export const DEFAULT_OG_IMAGE_ALT =
  "WinStream SA — AI Workflow Automation for South African SMEs";
