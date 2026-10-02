/* global Buffer, URL */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../src/utils/oauth.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
});
const { createOAuthAuthorization, validateOAuthCallback, startOAuth } =
  await import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  );
const origin = "https://mail.test";

for (const provider of ["google", "github", "linuxdo"]) {
  test(`${provider} authorization and code exchange use its dedicated callback`, () => {
    const { request, url } = createOAuthAuthorization(
      provider,
      "test-client",
      origin,
      "random-state",
    );
    const params = new URL(url).searchParams;
    const redirectUri = `${origin}/auth/${provider}/callback`;
    assert.equal(params.get("redirect_uri"), redirectUri);
    assert.equal(params.get("state"), request.state);
    assert.equal(params.get("client_id"), "test-client");
    assert.equal(params.get("response_type"), "code");
    assert.deepEqual(
      validateOAuthCallback(
        provider,
        "?code=provider-code&state=random-state",
        JSON.stringify(request),
        origin,
      ),
      { provider, code: "provider-code", redirectUri },
    );
    assert.throws(() =>
      validateOAuthCallback(
        provider,
        "?code=provider-code&state=random-state",
        JSON.stringify({ ...request, redirectUri: `${origin}/login` }),
        origin,
      ),
    );
  });
}

const { request } = createOAuthAuthorization(
  "github",
  "client",
  origin,
  "state",
);
const search = "?code=code&state=state";

test("callbacks reject a missing/unknown route provider, state mismatch and provider mismatch", () => {
  for (const provider of [undefined, "invalid", "google", "linuxdo"])
    assert.throws(() =>
      validateOAuthCallback(provider, search, JSON.stringify(request), origin),
    );
  for (const invalidSearch of [
    "?code=code",
    "?code=code&state=",
    "?code=code&state=other",
  ])
    assert.throws(() =>
      validateOAuthCallback(
        "github",
        invalidSearch,
        JSON.stringify(request),
        origin,
      ),
    );
});

test("callbacks reject malformed/missing sessions and redirected hosts/paths", () => {
  for (const stored of [null, "{broken", "null", "{}", "false"])
    assert.throws(() =>
      validateOAuthCallback("github", search, stored, origin),
    );
  for (const redirectUri of [
    "https://other.test/auth/github/callback",
    `${origin}/auth/google/callback`,
  ])
    assert.throws(() =>
      validateOAuthCallback(
        "github",
        search,
        JSON.stringify({ ...request, redirectUri }),
        origin,
      ),
    );
});

test("authorization denial and missing code produce callback errors instead of exchanging", () => {
  assert.throws(
    () =>
      validateOAuthCallback(
        "github",
        "?error=access_denied&state=state",
        JSON.stringify(request),
        origin,
      ),
    /第三方授权未完成/,
  );
  assert.throws(
    () =>
      validateOAuthCallback(
        "github",
        "?state=state",
        JSON.stringify(request),
        origin,
      ),
    /缺少有效授权信息/,
  );
});

test("switching Google accounts keeps the dedicated callback and requests account selection", () => {
  const { url } = createOAuthAuthorization(
    "google",
    "client",
    origin,
    "state",
    { selectAccount: true },
  );
  const params = new URL(url).searchParams;
  assert.equal(params.get("prompt"), "select_account");
  assert.equal(params.get("redirect_uri"), `${origin}/auth/google/callback`);
});

test("starting OAuth stores one matching request and clears stale account setup", () => {
  const originalLocation = globalThis.location;
  const originalStorage = globalThis.sessionStorage;
  const storage = new Map([
    ["oauthSetup", "old-proof"],
    ["oauthProvider", "old-provider"],
  ]);
  let assignedUrl;
  globalThis.location = {
    origin,
    assign: (url) => {
      assignedUrl = url;
    },
  };
  globalThis.sessionStorage = {
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  try {
    startOAuth("linuxdo", "client");
    const stored = JSON.parse(storage.get("oauthRequest"));
    const params = new URL(assignedUrl).searchParams;
    assert.equal(stored.provider, "linuxdo");
    assert.ok(stored.state);
    assert.equal(params.get("state"), stored.state);
    assert.equal(params.get("redirect_uri"), stored.redirectUri);
    assert.equal(storage.has("oauthSetup"), false);
    assert.equal(storage.has("oauthProvider"), false);
  } finally {
    if (originalLocation === undefined) delete globalThis.location;
    else globalThis.location = originalLocation;
    if (originalStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = originalStorage;
  }
});
