import ogAsset from "@/assets/og-winstream-v2.jpg.asset.json";

export const SITE_URL = "https://www.winstreamsa.co.za";

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

/**
 * Block preview/CDN hosts that should NEVER appear in og:image or twitter:image.
 * Anything matching these falls back to the branded DEFAULT_OG_IMAGE so social
 * previews stay consistent across pages and future blog posts.
 */
const BLOCKED_OG_HOSTS = [
  "lovable.app",
  "lovableproject.com",
  "r2.dev",
];

export function resolveOgImage(candidate?: string | null): string {
  if (!candidate) return DEFAULT_OG_IMAGE;
  const lower = candidate.toLowerCase();
  if (BLOCKED_OG_HOSTS.some((host) => lower.includes(host))) {
    return DEFAULT_OG_IMAGE;
  }
  return candidate;
}
