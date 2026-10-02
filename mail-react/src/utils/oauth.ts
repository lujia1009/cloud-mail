export type OAuthProvider = "google" | "github" | "linuxdo";

interface OAuthRequest {
  provider: OAuthProvider;
  state: string;
  redirectUri: string;
}

interface OAuthOptions {
  selectAccount?: boolean;
}

const providers = {
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: "openid profile email",
  },
  github: {
    authorizeUrl: "https://github.com/login/oauth/authorize",
    scope: "user:email",
  },
  linuxdo: {
    authorizeUrl: "https://connect.linux.do/oauth2/authorize",
    scope: "openid profile email",
  },
};

function isOAuthProvider(value: unknown): value is OAuthProvider {
  return value === "google" || value === "github" || value === "linuxdo";
}

export function oauthRedirectUri(provider: OAuthProvider, origin: string) {
  return `${origin}/auth/${provider}/callback`;
}

export function createOAuthAuthorization(
  provider: OAuthProvider,
  clientId: string,
  origin: string,
  state: string,
  options: OAuthOptions = {},
) {
  const request: OAuthRequest = {
    provider,
    state,
    redirectUri: oauthRedirectUri(provider, origin),
  };
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: request.redirectUri,
    response_type: "code",
    scope: providers[provider].scope,
    state,
  });
  if (provider === "google" && options.selectAccount)
    params.set("prompt", "select_account");
  return { request, url: `${providers[provider].authorizeUrl}?${params}` };
}

export function startOAuth(
  provider: OAuthProvider,
  clientId: string,
  options: OAuthOptions = {},
) {
  const { request, url } = createOAuthAuthorization(
    provider,
    clientId,
    location.origin,
    globalThis.crypto.randomUUID(),
    options,
  );
  sessionStorage.setItem("oauthRequest", JSON.stringify(request));
  sessionStorage.removeItem("oauthSetup");
  sessionStorage.removeItem("oauthProvider");
  location.assign(url);
}

export function validateOAuthCallback(
  provider: string | undefined,
  search: string,
  storedRequest: string | null,
  origin: string,
) {
  const params = new URLSearchParams(search);
  let request: Partial<OAuthRequest> | null = null;
  try {
    request = JSON.parse(storedRequest || "null");
  } catch {
    // A malformed or stale session must not reach the code-exchange endpoint.
  }
  if (
    !isOAuthProvider(provider) ||
    !request ||
    request.provider !== provider ||
    typeof request.state !== "string" ||
    !request.state ||
    request.state !== params.get("state") ||
    request.redirectUri !== oauthRedirectUri(provider, origin)
  )
    throw new Error("登录请求已失效，请重新发起第三方登录。");
  if (params.has("error")) throw new Error("第三方授权未完成，请重新登录。");
  const code = params.get("code");
  if (!code) throw new Error("登录回调缺少有效授权信息。");
  return { provider, code, redirectUri: request.redirectUri };
}
