import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

const RETIRED_URLS: Record<string, string> = {
  "/blog/whatsapp-email-followups-sa-small-business-2026":
    "/blog/whatsapp-email-follow-up-sequence-south-africa-2026",
};

type WaitCtx = { waitUntil?: (p: Promise<unknown>) => void } | undefined;

/** Report a server-side failure to the app monitor without delaying the response. */
function reportServerError(request: Request, ctx: unknown, error: unknown, status: number) {
  // The sandbox dev server restarts mid-edit; only real deployments alert.
  if (import.meta.env.DEV) return;
  const path = new URL(request.url).pathname;
  if (path.startsWith("/api/public/monitor")) return;
  const task = import("./lib/monitor.server")
    .then(({ recordMonitorEvent }) =>
      recordMonitorEvent({
        kind: "server_error",
        severity: "critical",
        title: `Server error ${status} on ${path}`,
        path,
        userAgent: request.headers.get("user-agent"),
        detail: {
          Request: `${request.method} ${path}`,
          Error: String((error as Error)?.message ?? error ?? "").slice(0, 600),
          Stack: String((error as Error)?.stack ?? "").slice(0, 1200),
        },
      }),
    )
    .catch(() => {});
  const c = ctx as WaitCtx;
  if (c?.waitUntil) c.waitUntil(task);
}

let buildAnnounced = false;
/** First request served by a new version → announce it (event-driven, no polling). */
function announceBuildOnce(request: Request, ctx: unknown) {
  if (buildAnnounced || import.meta.env.DEV) return;
  buildAnnounced = true;
  const host = new URL(request.url).host;
  const task = import("./lib/monitor.server")
    .then(({ envOfHost, announceBuildIfNew }) => {
      const env = envOfHost(host);
      if (env === "dev") return;
      return announceBuildIfNew(env);
    })
    .catch(() => {});
  const c = ctx as WaitCtx;
  if (c?.waitUntil) c.waitUntil(task);
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(request: Request, response: Response, ctx?: unknown): Promise<Response> {
  if (response.status < 500) return response;
  if (new URL(request.url).pathname.startsWith("/_serverFn/")) {
    reportServerError(request, ctx, new Error("A server action failed (the app asked the user's browser to reload)"), response.status);
    return Response.json(
      { code: "STALE_CLIENT_BUNDLE", reload: true },
      {
        status: 409,
        headers: {
          "cache-control": "no-store",
          "x-winstream-reload": "1",
        },
      },
    );
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  const captured = consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`);
  console.error(captured);
  reportServerError(request, ctx, captured, 500);
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Canonical host: 301 non-www apex -> www so Search Console sees one URL.
      const url = new URL(request.url);
      if (url.hostname === "winstreamsa.co.za") {
        url.hostname = "www.winstreamsa.co.za";
        url.protocol = "https:";
        return Response.redirect(url.toString(), 301);
      }
      // Retired duplicate blog URLs -> canonical article (301 consolidates ranking signals).
      const retiredUrl = RETIRED_URLS[url.pathname.replace(/\/+$/, "")];
      if (retiredUrl) {
        return Response.redirect(`https://www.winstreamsa.co.za${retiredUrl}`, 301);
      }
      announceBuildOnce(request, ctx);
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(request, response, ctx);

    } catch (error) {
      console.error(error);
      reportServerError(request, ctx, error, 500);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
