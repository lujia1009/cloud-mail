interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => boolean;
}

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: TurnstileOptions,
  ) => string | undefined;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    // An element named "turnstile" can also appear here through window named access.
    turnstile?: Partial<TurnstileApi> | HTMLElement;
  }
}

let loading: Promise<TurnstileApi> | undefined;

function isReady(api: Window["turnstile"]): api is TurnstileApi {
  const candidate = api as Partial<TurnstileApi> | undefined;
  return (
    typeof candidate?.render === "function" &&
    typeof candidate?.remove === "function"
  );
}

export function loadTurnstile(): Promise<TurnstileApi> {
  if (isReady(window.turnstile)) return Promise.resolve(window.turnstile);
  if (loading) return loading;

  loading = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/"][src*="api.js"]',
    );
    const script = existing || document.createElement("script");
    const cleanup = () => {
      window.clearInterval(poll);
      window.clearTimeout(timeout);
      script.removeEventListener("load", checkReady);
      script.removeEventListener("error", fail);
    };
    const checkReady = () => {
      if (!isReady(window.turnstile)) return;
      cleanup();
      resolve(window.turnstile);
    };
    const fail = () => {
      cleanup();
      script.remove();
      reject(new Error("人机验证加载失败，请稍后重新打开表单重试。"));
    };
    // Also cover an existing script whose load event already fired before its API was ready.
    const poll = window.setInterval(checkReady, 50);
    const timeout = window.setTimeout(fail, 30_000);
    script.addEventListener("load", checkReady);
    script.addEventListener("error", fail);
    if (!existing) {
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      document.head.appendChild(script);
    }
    checkReady();
  }).catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}

export function mountTurnstile(
  container: HTMLElement,
  options: {
    siteKey: string;
    onToken: (token: string) => void;
    onError: (message: string) => void;
  },
): () => void {
  let active = true;
  let api: TurnstileApi | undefined;
  let id: string | undefined;
  const updateToken = (token: string) => {
    if (active) options.onToken(token);
  };
  updateToken("");
  void loadTurnstile()
    .then((readyApi) => {
      if (!active) return;
      api = readyApi;
      id = api.render(container, {
        sitekey: options.siteKey,
        callback: updateToken,
        "expired-callback": () => updateToken(""),
        "error-callback": () => {
          updateToken("");
          return true; // The SDK retries transient challenge errors itself.
        },
      });
    })
    .catch((error) => {
      if (active)
        options.onError(error instanceof Error ? error.message : String(error));
    });
  return () => {
    active = false;
    if (id !== undefined) api?.remove(id);
    options.onToken("");
  };
}
