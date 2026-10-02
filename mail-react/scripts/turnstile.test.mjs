/* global URL */
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../src/utils/turnstile.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
let moduleId = 0;

function fakeScript() {
  const listeners = new Map();
  return {
    src: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
    removed: false,
    addEventListener(event, callback) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(callback);
    },
    removeEventListener(event, callback) {
      listeners.get(event)?.delete(callback);
    },
    emit(event) {
      for (const callback of [...(listeners.get(event) || [])]) callback();
    },
    remove() {
      this.removed = true;
    },
    listenerCount() {
      return [...listeners.values()].reduce((count, group) => count + group.size, 0);
    },
  };
}

async function environment(t, { global = undefined, existing = undefined } = {}) {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const intervals = new Map();
  const timeouts = new Map();
  const scripts = existing ? [existing] : [];
  let created = 0;
  let appended = 0;
  let timerId = 0;
  const window = {
    turnstile: global,
    setInterval(callback, delay) {
      assert.equal(delay, 50);
      intervals.set(++timerId, callback);
      return timerId;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
    setTimeout(callback, delay) {
      assert.equal(delay, 30_000);
      timeouts.set(++timerId, callback);
      return timerId;
    },
    clearTimeout(id) {
      timeouts.delete(id);
    },
  };
  const document = {
    querySelector() {
      return scripts.find((script) => !script.removed);
    },
    createElement(tag) {
      assert.equal(tag, "script");
      created++;
      return fakeScript();
    },
    head: {
      appendChild(script) {
        appended++;
        scripts.push(script);
      },
    },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  t.after(() => {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else delete globalThis.window;
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument);
    else delete globalThis.document;
  });
  // Each test gets fresh loader state while exercising the real TypeScript module.
  const module = await import(
    `data:text/javascript;base64,${Buffer.from(`${compiled}\n// case ${moduleId++}`).toString("base64")}`
  );
  return {
    ...module,
    window,
    scripts,
    intervals,
    timeouts,
    get created() { return created; },
    get appended() { return appended; },
    poll() {
      for (const callback of [...intervals.values()]) callback();
    },
    expire() {
      for (const callback of [...timeouts.values()]) callback();
    },
  };
}

function readyApi() {
  const rendered = [];
  const removed = [];
  return {
    rendered,
    removed,
    render(container, options) {
      rendered.push({ container, options });
      return "widget-1";
    },
    remove(id) {
      removed.push(id);
    },
  };
}

for (const [description, global] of [
  ["the id=turnstile element exposed by Window named access", { id: "turnstile", tagName: "DIV" }],
  ["a partially initialized SDK global", { render: "initializing" }],
]) {
  test(`waits for the SDK instead of treating ${description} as ready`, async (t) => {
    const env = await environment(t, { global });
    const loading = env.loadTurnstile();
    let resolved = false;
    void loading.then(() => { resolved = true; });
    assert.equal(env.loadTurnstile(), loading, "parallel callers share one promise");
    await setImmediate();
    assert.equal(resolved, false);
    assert.equal(env.created, 1);
    assert.equal(env.appended, 1);
    const api = readyApi();
    env.window.turnstile = api;
    env.scripts[0].emit("load");
    assert.equal(await loading, api);
    assert.equal(api.rendered.length, 0, "loading alone never renders a widget");
    assert.equal(env.intervals.size, 0);
    assert.equal(env.timeouts.size, 0);
    assert.equal(env.scripts[0].listenerCount(), 0);
  });
}

test("reuses an existing script and detects readiness after its load event already fired", async (t) => {
  const script = fakeScript();
  const env = await environment(t, { existing: script, global: {} });
  const loading = env.loadTurnstile();
  script.emit("load");
  assert.equal(env.created, 0);
  assert.equal(env.appended, 0);
  const api = readyApi();
  env.window.turnstile = api;
  env.poll();
  assert.equal(await loading, api);
  assert.equal(env.intervals.size, 0);
});

test("a mounted form waits even when the incomplete SDK already has a render function", async (t) => {
  let prematureRenders = 0;
  const env = await environment(t, {
    global: { render: () => { prematureRenders++; return "incomplete-widget"; } },
  });
  const errors = [];
  const cleanup = env.mountTurnstile({}, {
    siteKey: "site-key",
    onToken: () => {},
    onError: (message) => errors.push(message),
  });
  await setImmediate();
  assert.equal(prematureRenders, 0);
  assert.deepEqual(errors, []);
  const api = readyApi();
  env.window.turnstile = api;
  env.poll();
  await setImmediate();
  assert.equal(api.rendered.length, 1);
  cleanup();
  assert.deepEqual(api.removed, ["widget-1"]);
});

test("renders with the ready API, clears expired/error tokens, and removes the widget on unmount", async (t) => {
  const api = readyApi();
  const env = await environment(t, { global: api });
  const container = { id: "register-turnstile" };
  const tokens = [];
  const errors = [];
  const cleanup = env.mountTurnstile(container, {
    siteKey: "site-key",
    onToken: (token) => tokens.push(token),
    onError: (message) => errors.push(message),
  });
  await setImmediate();
  assert.equal(env.created, 0);
  assert.equal(api.rendered.length, 1);
  assert.equal(api.rendered[0].container, container);
  const options = api.rendered[0].options;
  assert.equal(options.sitekey, "site-key");
  options.callback("valid-token");
  options["expired-callback"]();
  options.callback("new-token");
  assert.equal(options["error-callback"](), true);
  assert.deepEqual(tokens, ["", "valid-token", "", "new-token", ""]);
  cleanup();
  assert.deepEqual(api.removed, ["widget-1"]);
  options.callback("late-token");
  options["expired-callback"]();
  assert.deepEqual(tokens, ["", "valid-token", "", "new-token", "", ""]);
  assert.deepEqual(errors, []);
});

test("an unmounted form never renders when the pending SDK finally arrives", async (t) => {
  const env = await environment(t, { global: { id: "turnstile" } });
  const tokens = [];
  const errors = [];
  const cleanup = env.mountTurnstile({}, {
    siteKey: "site-key",
    onToken: (token) => tokens.push(token),
    onError: (message) => errors.push(message),
  });
  cleanup();
  const api = readyApi();
  env.window.turnstile = api;
  env.scripts[0].emit("load");
  await setImmediate();
  assert.deepEqual(api.rendered, []);
  assert.deepEqual(tokens, ["", ""]);
  assert.deepEqual(errors, []);
});

test("a failed script reports a handled error and allows a fresh loading attempt", async (t) => {
  const env = await environment(t);
  const errors = [];
  const cleanup = env.mountTurnstile({}, {
    siteKey: "site-key",
    onToken: () => {},
    onError: (message) => errors.push(message),
  });
  env.scripts[0].emit("error");
  await setImmediate();
  assert.equal(errors.length, 1);
  assert.match(errors[0], /加载失败/);
  assert.equal(env.scripts[0].removed, true);
  assert.equal(env.intervals.size, 0);
  assert.equal(env.timeouts.size, 0);
  cleanup();
  const retry = env.loadTurnstile();
  assert.equal(env.created, 2);
  const api = readyApi();
  env.window.turnstile = api;
  env.scripts[1].emit("load");
  assert.equal(await retry, api);
});

test("a stalled SDK times out, cleans up, and can be retried without waiting in real time", async (t) => {
  const env = await environment(t, { global: {} });
  const loading = env.loadTurnstile();
  const rejected = assert.rejects(loading, /加载失败/);
  env.expire();
  await rejected;
  assert.equal(env.scripts[0].removed, true);
  assert.equal(env.scripts[0].listenerCount(), 0);
  assert.equal(env.intervals.size, 0);
  assert.equal(env.timeouts.size, 0);
  const retry = env.loadTurnstile();
  assert.notEqual(retry, loading);
  assert.equal(env.created, 2);
  const api = readyApi();
  env.window.turnstile = api;
  env.poll();
  assert.equal(await retry, api);
});

test("SDK render exceptions reach the form error handler instead of becoming uncaught", async (t) => {
  const api = readyApi();
  api.render = () => { throw new Error("render failed"); };
  const env = await environment(t, { global: api });
  const errors = [];
  const cleanup = env.mountTurnstile({}, {
    siteKey: "site-key",
    onToken: () => {},
    onError: (message) => errors.push(message),
  });
  await setImmediate();
  assert.deepEqual(errors, ["render failed"]);
  cleanup();
  assert.deepEqual(api.removed, []);
});
