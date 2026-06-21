const RELOAD_STORAGE_KEY = "winstream:stale-server-function-reload";
const INSTALLED_FLAG = "__winstreamStaleServerFunctionReloadGuard";

declare global {
  interface Window {
    [INSTALLED_FLAG]?: boolean;
  }
}

function getRequestUrl(input: Parameters<typeof fetch>[0]) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

async function shouldReloadForResponse(input: Parameters<typeof fetch>[0], response: Response) {
  const url = getRequestUrl(input);
  if (!url.includes("/_serverFn/")) return false;
  if (response.status !== 409 && response.status < 500) return false;
  if (response.headers.get("x-winstream-reload") === "1") return true;

  const body = await response.clone().text().catch(() => "");
  return body.includes("Invalid server function ID") || body.includes("STALE_CLIENT_BUNDLE");
}

export function installStaleServerFunctionReloadGuard() {
  if (typeof window === "undefined" || window[INSTALLED_FLAG]) return;
  window[INSTALLED_FLAG] = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await nativeFetch(input, init);
    void shouldReloadForResponse(input, response).then((shouldReload) => {
      if (!shouldReload) return;
      if (window.sessionStorage.getItem(RELOAD_STORAGE_KEY) === "1") return;
      window.sessionStorage.setItem(RELOAD_STORAGE_KEY, "1");
      window.location.reload();
    });
    return response;
  };
}