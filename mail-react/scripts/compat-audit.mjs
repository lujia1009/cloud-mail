/* global console, process */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const root = join(import.meta.dirname, "..", "..");
const oldCommit = "ec7a2bb17c950576c38d7308128cac7696fea169";
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" });
const legacy = (path) => git("show", `${oldCommit}:${path}`);
const paths = git("ls-tree", "-r", "--name-only", oldCommit, "mail-vue/src")
  .trim()
  .split(/\r?\n/)
  .filter((p) => /\.(vue|js)$/.test(p));
const oldFiles = new Map(paths.map((p) => [p, legacy(p)]));
const sourceDir = join(root, "mail-react", "src");
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? walk(path)
      : /\.(ts|tsx)$/.test(path)
        ? [path]
        : [];
  });
}
const newFiles = new Map(
  walk(sourceDir).map((p) => [
    relative(root, p).replaceAll("\\", "/"),
    readFileSync(p, "utf8"),
  ]),
);
const line = (content, offset) => content.slice(0, offset).split("\n").length;
const oldApi = new Map();
for (const [path, content] of oldFiles) {
  if (!path.startsWith("mail-vue/src/request/")) continue;
  const re = /http\.(get|post|put|delete)\(\s*['"`]([^'"`]+)['"`]/g;
  for (const match of content.matchAll(re)) {
    const key = `${match[1].toUpperCase()} ${match[2].split("?")[0]}`;
    oldApi.set(key, `${path}:${line(content, match.index)}`);
  }
}
const newApi = new Map();
const newApiMethods = new Map();
function routeStrings(node) {
  if (ts.isStringLiteral(node)) return [node.text];
  if (ts.isConditionalExpression(node))
    return [...routeStrings(node.whenTrue), ...routeStrings(node.whenFalse)];
  if (ts.isTemplateExpression(node) && node.head.text === "/oauth/")
    return ["linuxDo", "github", "google"].map((p) => `/oauth/${p}/login`);
  return [];
}
for (const [path, content] of newFiles) {
  if (!path.startsWith("mail-react/src/api/")) continue;
  const ast = ts.createSourceFile(
    path,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ["get", "post", "put", "del"].includes(node.expression.text)
    ) {
      for (const route of routeStrings(node.arguments[0])) {
        const method =
          node.expression.text === "del"
            ? "DELETE"
            : node.expression.text.toUpperCase();
        newApi.set(
          `${method} ${route}`,
          `${path}:${line(content, node.getStart(ast))}`,
        );
        let owner = node.parent;
        while (owner && !ts.isPropertyAssignment(owner)) owner = owner.parent;
        const declaration = owner?.parent?.parent;
        if (
          owner &&
          declaration &&
          ts.isVariableDeclaration(declaration) &&
          ts.isIdentifier(declaration.name)
        )
          newApiMethods.set(
            `${method} ${route}`,
            `${declaration.name.text}.${owner.name.getText(ast)}`,
          );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
const missingApi = [...oldApi.keys()].filter((key) => !newApi.has(key));
const uiContents = [...newFiles]
  .filter(([path]) => !path.includes("/api/"))
  .map(([, content]) => content)
  .join("\n");
const unusedApi = [...oldApi.keys()].filter((key) => {
  if (key === "GET /account/list") return !/accounts\.all\b/.test(uiContents);
  if (key.startsWith("POST /oauth/") && key.endsWith("/login"))
    return !/auth\s*\.\s*oauth\b/.test(uiContents);
  const name = newApiMethods.get(key);
  return (
    name && !new RegExp(`\\b${name.replace(".", "\\.")}\\b`).test(uiContents)
  );
});
const service = readFileSync(
  join(root, "mail-worker/src/service/setting-service.js"),
  "utf8",
);
const configBlock = service.split("async websiteConfig(c) {")[1].split("};")[0];
const websiteConfig = [
  ...new Set(
    [...configBlock.matchAll(/^\s*([A-Za-z]\w*): settingRow\./gm)].map(
      (m) => m[1],
    ),
  ),
];
function firstUse(files, regex, exclude = () => false) {
  for (const [path, content] of files) {
    if (exclude(path)) continue;
    const match = regex.exec(content);
    if (match) return `${path}:${line(content, match.index)}`;
  }
  return "—";
}
const configRows = websiteConfig.map((key) => {
  const pattern = new RegExp(
    `\\b(?:settingStore|settings|config|setting)\\.${key}\\b`,
  );
  let old = firstUse(oldFiles, pattern, (p) =>
    p.startsWith("mail-vue/src/request/"),
  );
  let current = firstUse(
    newFiles,
    new RegExp(`\\b(?:settings|config)\\.${key}\\b`),
    (p) => p.includes("/api/") || p.includes("/features/admin/"),
  );
  if (key.endsWith("Switch")) {
    if (old === "—") old = firstUse(oldFiles, /p\.key \+ 'Switch'/);
    if (current === "—")
      current = firstUse(newFiles, /p \+ "Switch"/, (p) => p.includes("/api/"));
  }
  if (key.endsWith("ClientId")) {
    if (old === "—") old = firstUse(oldFiles, /provider \+ 'ClientId'/);
    if (current === "—")
      current = firstUse(newFiles, /provider \+ "ClientId"/, (p) =>
        p.includes("/api/"),
      );
  }
  return { key, old, current };
});
const missingConfig = configRows.filter(
  (r) => r.old !== "—" && r.current === "—",
);
const entity = readFileSync(
  join(root, "mail-worker/src/entity/setting.js"),
  "utf8",
);
const settingKeys = [
  ...entity.matchAll(/^\s*([A-Za-z]\w*): (?:integer|text)\(/gm),
].map((m) => m[1]);
const adminPage = readFileSync(
  join(root, "mail-react/src/features/admin/AdminPage.tsx"),
  "utf8",
);
const settingsBlock = adminPage
  .split("const groups:")[1]
  .split("const secret")[0];
const missingSetting = settingKeys.filter(
  (k) => k !== "background" && !new RegExp(`"${k}"`).test(settingsBlock),
);
const settingRows = settingKeys.map((key) => ({
  key,
  old: firstUse(
    oldFiles,
    new RegExp(`\\b${key}\\b`),
    (p) => p !== "mail-vue/src/views/sys-setting/index.vue",
  ),
  current: firstUse(
    newFiles,
    new RegExp(`\\b${key}\\b`),
    (p) => p !== "mail-react/src/features/admin/AdminPage.tsx",
  ),
}));

const out = [
  `# 自动生成的旧版 API 与动态配置对照`,
  ``,
  `旧版来源：Git ${oldCommit}；运行 \`pnpm audit:compat\` 重新生成。新版位置是请求声明或配置消费位置；手工行为复核见 [FRONTEND_COMPATIBILITY_AUDIT.md](../../FRONTEND_COMPATIBILITY_AUDIT.md)。`,
  ``,
  `## 前端请求：${oldApi.size} 项`,
  ``,
  `| 旧版 API | 旧版实现位置 | 新版实现位置 | 静态覆盖 | 差异 |`,
  `| --- | --- | --- | --- | --- |`,
  ...[...oldApi]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([key, old]) =>
        `| \`${key}\` | \`${old}\` | \`${newApi.get(key) || "—"}\` | ${newApi.has(key) ? "是" : "否"} | ${!newApi.has(key) ? "缺失" : unusedApi.includes(key) ? "仅声明，未发现 UI 调用" : "调用参数和行为另见人工审计"} |`,
    ),
  ``,
  `## websiteConfig 动态字段：${websiteConfig.length} 项`,
  ``,
  `| 字段 | 旧版消费位置 | 新版消费位置 | 静态覆盖 | 差异 |`,
  `| --- | --- | --- | --- | --- |`,
  ...configRows.map(
    ({ key, old, current }) =>
      `| \`${key}\` | \`${old}\` | \`${current}\` | ${old === "—" ? "旧版未直接读取" : current === "—" ? "否" : "是"} | ${current === "—" && old !== "—" ? "缺失" : "行为另见人工审计"} |`,
  ),
  ``,
  `## 后台 setting 实体：${settingKeys.length} 项`,
  ``,
  `新版系统设置入口覆盖 ${settingKeys.length - missingSetting.length}/${settingKeys.length} 项。缺失：${missingSetting.join(", ") || "无"}。背景图在系统设置中单独显示。`,
  ``,
  `| 设置字段 | 旧版管理页位置 | 新版管理页位置 | 静态覆盖 | 差异 |`,
  `| --- | --- | --- | --- | --- |`,
  ...settingRows.map(
    ({ key, old, current }) =>
      `| \`${key}\` | \`${old}\` | \`${current}\` | ${current === "—" ? "否" : "是"} | ${old === "—" ? "旧页未直接引用；由后台字段识别" : "保存语义另见人工审计"} |`,
  ),
  ``,
];
const destination = join(root, "mail-react/compat-api.generated.md");
writeFileSync(destination, out.join("\n"));
console.log(
  `旧 API ${oldApi.size}，缺失 ${missingApi.length}，未调用 ${unusedApi.length}；旧版动态字段 ${websiteConfig.length}，缺失 ${missingConfig.length}；后台设置 ${settingKeys.length}，缺失 ${missingSetting.length}`,
);
if (missingApi.length) console.error("缺失 API:", missingApi.join(", "));
if (unusedApi.length) console.error("未调用 API:", unusedApi.join(", "));
if (missingConfig.length)
  console.error("缺失动态字段:", missingConfig.map((r) => r.key).join(", "));
if (missingSetting.length)
  console.error("缺失后台设置:", missingSetting.join(", "));
if (
  missingApi.length ||
  unusedApi.length ||
  missingConfig.length ||
  missingSetting.length
)
  process.exitCode = 1;
