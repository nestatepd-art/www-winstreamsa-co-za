import { SITE_URL } from "@/lib/seo";

/**
 * Base URL that account-verification and password-reset links must come back to.
 *
 * Never use window.location.origin directly: inside the Lovable editor preview the
 * origin is a *.lovable.app host, so the emailed link sends real users to the
 * preview domain (where they have no session) instead of the live site.
 */
export function authRedirectBase(): string {
  if (typeof window === "undefined") return SITE_URL;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return window.location.origin;
  return SITE_URL;
}

export function authRedirectUrl(path: string): string {
  return `${authRedirectBase()}${path.startsWith("/") ? path : `/${path}`}`;
}
