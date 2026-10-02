# AGENTS.md

## Project Overview

本指南依据 `main` 的提交 `7056723e952d24d3dff9f1b8465e27dfcd7191cd`（2026-10-02）静态核对。它是分析基线，不代表后续工作必须停留在该提交；修改时以实际检出代码为准。

OAuth 专用回调与公共 Turnstile 生命周期的说明已按当前工作区修复同步更新。

项目由 React 邮箱 SPA 和 Cloudflare Worker 组成，同一个 Worker 提供 API、静态前端、入站邮件事件及定时维护。当前已接入的能力包括密码注册/登录、第三方登录与首次邮箱绑定、多邮箱账户、收件/发件/星标/已读、附件与正文图片、浏览器本地草稿、用户/角色/注册码管理、系统设置、统计图表，以及可配置的入站邮件推送和清理。

根目录没有统一的 package.json 或共享源码包。`mail-react` 与 `mail-worker` 分别管理依赖和 pnpm lockfile，通过 HTTP 契约及构建产物耦合。当前前端是 `mail-react`；旧 `mail-vue` 仅存在于 Git 历史与兼容性文档中。

## Repository Structure

| 路径 | 实际职责及阅读入口 |
| --- | --- |
| `mail-react/src/main.tsx`、`src/app/App.tsx` | React 启动、QueryClient、BrowserRouter、主题同步、登录与页面权限守卫、懒加载业务页面 |
| `mail-react/src/pages/` | `LoginPage`、`OAuthCallbackPage`、`SetupAccountPage`：登录、注册、OAuth 回调和首次建邮箱 |
| `mail-react/src/layouts/AppLayout.tsx` | 导航、邮箱切换/维护、搜索入口、公告、退出、全局写信窗口 |
| `mail-react/src/features/` | `mail/MailPage.tsx`；`compose/` 写信和草稿；`settings/` 个人设置；`admin/` 用户/角色/注册码/系统设置/图表 |
| `mail-react/src/api/`、`src/types/index.ts` | 请求封装、按业务分组的 API、前端数据接口；与 Worker 实体没有自动生成关系 |
| `mail-react/src/stores/app.ts`、`src/i18n/`、`src/utils/mail.ts` | Zustand 全局状态、中英文资源、邮件地址/时间/对象 URL 辅助逻辑 |
| `mail-react/src/components/`、`src/styles.css` | 公共按钮、反馈状态、登录布局、TurnstileWidget；全局 CSS、主题变量和响应式规则 |
| `mail-react/src/utils/oauth.ts`、`src/utils/turnstile.ts` | OAuth 授权与专用回调校验；Turnstile SDK 单例加载、就绪检查与 widget 生命周期 |
| `mail-react/public/tinymce/` | 随仓库分发的 TinyMCE 7.9.1、插件、语言、皮肤及许可证；由 `RichEditor.tsx` 动态加载 |
| `mail-react/scripts/compat-audit.mjs` | 对照历史 Vue API 和当前动态配置；写出 `compat-api.generated.md` |
| `mail-worker/src/index.js` | `fetch`、`email`、`scheduled` 三种 Worker 事件入口 |
| `mail-worker/src/hono/`、`src/security/`、`src/api/` | Hono 单例、路由注册、异常处理、JWT/KV 会话验证及路由权限映射 |
| `mail-worker/src/service/` | 核心业务和外部集成；多数数据查询直接写在 service 内 |
| `mail-worker/src/entity/`、`src/init/init.js` | Drizzle 表映射、D1 ORM 工厂、建表及历史升级 SQL |
| `mail-worker/src/email/email.js`、`src/lib/email-list-columns.js` | 入站 MIME 处理链；完整/摘要邮件查询投影 |
| `mail-worker/src/dao/analysis-dao.js` | 统计聚合 SQL；并非所有 service 都使用 DAO 层 |
| `mail-worker/src/const/`、`src/utils/`、`src/template/`、`src/i18n/` | 状态码/KV key、加密/邮件/日期工具、Telegram 展示模板、后端翻译 |
| `mail-worker/wrangler*.toml`、`scripts/`、`.github/workflows/deploy-cloudflare.yml` | 本地/部署配置、绑定恢复脚本、Node 回归测试、GitHub Actions 部署 |
| `doc/`、根目录与 `mail-react` 的 Markdown | 展示图片、迁移/兼容审计和运行说明；须与当前源码核对 |

表中子目录路径以对应的 `mail-react` 或 `mail-worker` 为基准。仓库未提供 Docker 配置、独立 SMTP/IMAP 服务或单独的共享类型项目。

## Architecture

### Frontend

- 实际使用 React 19、TypeScript、Vite、React Router、TanStack Query、Zustand、i18next/react-i18next、Dexie、DOMPurify、Lucide、ECharts。入口和业务组件能找到这些依赖的真实调用。UI 是原生元素与自定义 CSS，没有当前运行的 Vue、Pinia、Element Plus 或 Axios 层。
- `main.tsx` 设置查询默认值：30 秒 staleTime、不在窗口聚焦时重取、失败重试一次。远程数据主要用 `useQuery`；写入主要是 async handler 后调用 `invalidateQueries`，不是统一的 mutation 封装。
- `stores/app.ts` 保存用户、公开配置、当前邮箱、主题、导航、写信模式及 toast。组件内 `useState` 保存表单、分页和弹窗状态。修改数据时要同时考虑查询缓存和 Zustand 中的已选对象。
- `App.tsx` 的 Protected 依赖 `localStorage.token` 和 `/my/loginUserInfo`；`AdminGuard`、导航和按钮通过 `hasPerm` 检查精确权限 key 或 `*`。这些前端检查不能代替 Worker 权限与资源归属检查。
- 样式集中在 `styles.css`，通过 `document.documentElement.dataset.theme` 选择亮/暗主题；系统主题用 `matchMedia`。中文/英文有迁移资源和 `i18n/index.ts` 的补充覆盖，也存在直接写在 JSX 中的中文文案。
- `vite.config.ts` 输出到 `../mail-worker/dist` 并清空该输出目录。PWA 自动注册更新，预缓存静态文件；没有 API runtime cache。SPA 导航回退排除 `/api/`、`/static/`、`/attachments/` 和 `/mail/attachments/`。

### Backend and request dispatch

`mail-worker/src/index.js` 的 HTTP 分派顺序不能随意改变：

1. `/api/*` 去掉 `/api` 前缀，进入 `hono/webs.js` 导出的 app。
2. `/static/*`、`/attachments/*`、旧 `/mail/attachments/*` 进入 `kv-obj-service.toObjResp`；旧路径先规范化为 `attachments/` key。
3. 其余请求交给 `env.assets.fetch`，由 assets SPA 配置处理前端路由。

`hono/hono.js` 创建单例并接入 CORS、全局异常处理。`hono/webs.js` 先导入 security，再通过副作用 import 注册各 `api/*-api.js`；`test-api.js` 当前为空，重复导入 `user-api` 不代表另一个服务。后端 i18n 模块也向该单例注册按 `accept-language` 初始化语言的 middleware。

API 层读取 `c.req.query()` 或 `await c.req.json()`，调用 service，通常返回 `c.json(result.ok(data))`。service 使用 `orm(c)`（`drizzle-orm/d1`）和 `c.env.db.prepare/batch`。Worker 是打包后的 JavaScript ESM，普遍使用省略扩展名的相对 import；不能假设这些源码可直接作为普通 Node 服务运行。

### Authentication and authorization

- `login-service.js` 验证用户状态与密码；`crypto-utils.js` 当前使用随机 salt 与 SHA-256(salt + password)，不是 bcrypt。`jwt-utils.js` 使用 Web Crypto 实现 HS256。
- 登录 JWT 含 `userId` 和随机 `token`，普通登录生成时未传 JWT exp；有效性还依赖 KV 的 `auth-uid:<userId>` 会话及其中的 tokens 数组。初始 KV TTL 为 30 天，security 按日期刷新；不要把 JWT exp 当成当前会话唯一有效期来源。
- `security/security.js` 分别处理排除路径、`/public` 的全局 API token、普通 JWT/KV 验证及权限映射。排除和权限匹配用 `startsWith`。`requirePerms` 与拼写为 `premKey` 的映射都是手工清单，新增路由不会自动获得权限检查。
- 用户 `type` 实际关联 `role.roleId`；权限由 `perm` 和 `role_perm` 查询。管理员按邮箱是否等于 `env.admin` 判断，`loginUserInfo` 返回 `permKeys: ['*']` 和合成管理员角色。不是一条固定的数据库管理员 role。
- `/public/genToken` 用管理员邮箱/密码生成并覆盖 KV `public_key:`；其他 public 路由用原始 Authorization token 比对，提供跨用户邮件查询和批量建用户，不受当前用户 mailbox 范围约束。

## Core Business Flows

### Registration, mailbox creation and OAuth

- 密码注册：`LoginPage.tsx` → `api/auth.ts` → `api/login-api.js` → `login-service.register`。检查注册开关、邮箱前缀/域名、密码、注册码额度和过期日、角色可用域名、Turnstile 或 IP 次数阈值；写入 user 与主 account，并减少注册码次数。响应是验证状态信息，前端随后切回登录；注册不会直接返回普通登录会话。
- 新增附属邮箱：`AppLayout.tsx` → `api/mail.ts` accounts → `account-api.js` → `account-service.add`。依赖 manyEmail/addEmail、角色数量/域名限制和验证码策略。显式添加 `name+tag` 账户要求基础地址属于当前用户。
- 注册与新增邮箱共用 `components/TurnstileWidget.tsx` → `utils/turnstile.ts`。仅在 SDK 的 render/remove 方法就绪后创建 widget，复用同一加载任务；失效/错误与卸载清空 token，卸载用 remove。不要使用 `id="turnstile"` 或只凭 `window.turnstile` 存在判断 SDK 就绪：浏览器会把同名 DOM 元素暴露为该全局属性。
- 入站和站内投递均支持先精确匹配 `name+tag@domain`，未找到再匹配去掉 tag 的主地址。不要删除 `emailUtils.getBaseEmail` 回退。`allReceive=1` 是当前用户所有账户邮件的查询模式，`setAllReceive` 先清除该用户其他账户的开关；不是全站 catch-all 或外部路由配置。
- OAuth：`LoginPage` 与 `SetupAccountPage` 的切换 Google 账号调用 `utils/oauth.ts`，写 `sessionStorage.oauthRequest`（provider/state/redirectUri），跳转 Google/GitHub/LinuxDo。三者分别使用 `/auth/google/callback`、`/auth/github/callback`、`/auth/linuxdo/callback`，共用 App 的 `/auth/:provider/callback` 和 `OAuthCallbackPage`；`/login` 只渲染登录表单。回调核对必需的路由 provider、state、当前 origin 的精确专用 redirectUri，并清除 URL 中的授权参数，再请求 `/oauth/{provider}/login`（LinuxDo API 拼写是 `linuxDo`）。第三方控制台的 URL 要同步，见 `mail-react/OAUTH_SETUP.md`；不恢复旧 `/login` 回调兼容。
- `oauth-service.js` 在 Worker 交换授权码、获取第三方身份，以 platform/oauthUserId 查询/保存 oauth。已有绑定通过正常 login 返回会话；未绑定返回 900 秒、purpose 为 `oauth-setup` 的签名 setupToken。该证明存在 sessionStorage 的 `oauthSetup`，与 `localStorage.token` 分开。
- `SetupAccountPage` → `/oauth/bindUser {email, code, setupToken}`。Worker 验证 purpose/exp、oauthId、provider、subject、开关及未绑定状态，复用 register 创建邮箱后绑定并登录。OAuth 注册放开普通注册开关并跳过注册人机验证，但仍执行注册码、前缀、域名等规则。不得恢复仅凭客户端 oauth ID 绑定的旧方式。

### Receiving mail

`index.js.email` → `src/email/email.js`：读取设置并检查 receive → 读取 raw 并用 PostalMime 解析 → 检查主题/正文/发件人黑名单 → 查询账户及 plus-address 回退 → 无收件人策略/角色域名与禁收规则 → 可选 Workers AI 验证码提取 → 写邮件 → 存附件 → 完成接收 → 可选推送。

初次写入使用 `status=SAVING(6)`、`isDel=1`，附件处理后 `completeReceive` 改为 `isDel=0` 和 RECEIVE(0) 或 NOONE(7)。无人收件而允许接收时 `userId/accountId=0`，供管理端查看。入站查询特意使用 IncludeDel 方法，不能把软删除筛选行为推断成所有路径一致。

附件 key 为 `attachments/` + 内容哈希 + 扩展名。CID 图片由 `emailService.imgReplace` 改成正文中的 `{{domain}}` 占位 URL。AI 按开关和发件人/域名过滤，调用 `env.ai.run`；失败或无效结果返回空 code，不阻断接收。

邮件持久化后才按 ruleType/ruleEmail 决定是否推送：`telegram-service` 发机器人消息及签名查看链接；`message.forward` 转发到配置邮箱；`webhook-service` POST 邮件字段，可带原始 Authorization secret 并重试。当前推送在 email handler 内 await，没有队列消费者。`template/` 服务于 Telegram 展示；不能把 React 的 DOMPurify 保护推断成这些模板也具有相同过滤。

### Sending, replies and attachments

`Compose.tsx` → `api/mail.ts` → `email-api.js` → `email-service.send`：正文图片转 CID → 检查发送开关并读取用户/角色 → 判断全部收件人是否站内 → 检查角色发送类型/次数及发件账户归属/域名 → 选择投递 → 写已发送邮件、附件、站内副本和计数。

- 所有收件人都属配置域名时，不调用外发服务；`HandleOnSiteEmail` 创建收件副本、共享附件 key，并根据收件人的权限/无人收件策略更新发件记录状态。
- 只要存在站外收件人，优先调用 `env.email.send`（Cloudflare Email binding），否则使用发件域名对应的 Resend token。混合收件人走这条外发路径，不再直接调用全站内副本逻辑。
- reply 携带原 emailId，读取 messageId 构造 in-reply-to/references；forward 是写信模式和引用正文，不是另一个转发 API。当前发送表单是 receiveEmail 数组、text/content、subject、attachments，没有发送 CC/BCC 参数消费逻辑。
- Resend 回调 `POST /api/webhooks` → `resend-service.webhooks`，按 data.email_id 匹配 resendEmailId，更新 delivered/bounced/complained/delayed/failed 状态。该入口在 security 排除清单，当前代码未接入 Resend 回调签名校验；不得把它写成已存在能力。
- 上传是 JSON 内 base64，经 XHR 提供进度，不是 multipart 或独立预上传接口。普通附件和正文图片各有后端 10 个限制，检查发生在部分投递/持久化操作之后；不能假定失败一定没有副作用。

### Lists, detail, drafts and administration

- `MailPage.tsx` 同时承载 inbox/sent/starred/all/detail。个人与全站邮件列表先取 `full=0`，再取 `full=1` 合并；`email-list-columns.js` 定义摘要投影，service 返回最多 300 字符 listText，摘要不返回完整 content/text，完整查询附带普通 attList。
- 邮件用 emailId 游标，timeSort 选择升/降序，每页最多 50。账户用 sort 降序、accountId 升序的联合游标（accountId/lastSort），最多 30；用户列表用 num/size 偏移分页。不要统一成一种分页格式。
- 普通邮箱/管理端没有独立的按 ID 取详情 API。Detail 使用路由 state 的邮件或遍历完整列表（最多 25 页）寻找 ID；改变详情获取需检查列表投影、游标、返回列表上下文和权限。
- autoRefresh 是秒数，前端 setTimeout 发起即时 `/email/latest` 或 `/allEmail/latest` 查询，返回最多 20 条后使列表缓存失效；不是 WebSocket、SSE 或服务器长轮询。个人搜索只过滤当前加载页；全站搜索把字段传给 allEmailListFilters，采用前缀匹配。
- read 只将 unread 从 0 改为 1；收藏另存 star。当前没有个人垃圾箱 API、标为未读 API 或服务端草稿 API。
- 草稿：`compose/drafts.ts` 的 Dexie 数据库以用户邮箱命名，版本 1 表为 `draft: ++draftId,createTime` 与 `att: draftId`。`DraftsPage` 通过 `open-draft` CustomEvent 交给 Compose，保留原发件账户及回复信息。保存/删除同时处理两表；不要未经迁移改变数据库名、版本或 key。
- `AdminPage.tsx` 分发用户、角色、注册码管理；`SystemSettingsPage.tsx` 保存设置；`AnalysisPage.tsx` 将浏览器 IANA timeZone 发给 `analysis-service`/`analysis-dao`，显示总量、来源和过去 15 天趋势。统计缓存 key 包含时区，仅 analysis_cache 为 true 或字符串 'true' 时开启。

## Data Model and Persistence

持久化 schema 必须同时检查 `entity/*.js` 的映射和 `init/init.js` 的 SQL；没有 drizzle-kit migration 目录或自动 schema 同步。数据库未定义这里业务关系的外键级联，删除由 service 显式组织。

映射与建表存在实际差异：verify_record.ip 在实体写作 integer、DDL 为 TEXT；oauth.platform 在实体为 text、DDL 为 INTEGER；syncDelete 的实体默认值为 1，v3_1DB 添加列时默认 0。不要仅凭实体声明推断已有数据库的类型、默认值或历史数据。

| 表/存储 | 主要关系与格式 |
| --- | --- |
| `user` | userId、登录 email、password/salt、status/isDel、type（角色 ID）、sendCount、regKeyId、登录设备/IP |
| `account` | userId 下的邮箱，主邮箱地址与 user.email 一致；name、sort、allReceive、isDel |
| `email` | userId/accountId 归属，type：0 收件/1 发件；status、unread、isDel；正文 content/text、code、messageId/inReplyTo/relation、resendEmailId |
| `attachments` | userId/accountId/emailId、对象 key、MIME/文件信息、contentId；type：0 普通附件/1 正文图片；同 key 可被多条记录共享 |
| `star` | userId/emailId 收藏关系 |
| `role`、`perm`、`role_perm` | 角色配额、sendType、availDomain、banEmail 与权限树/按钮 key 的关联；默认身份由 isDefault 标记 |
| `reg_key` | 实际主键列拼写为 `rege_key_id`，映射为 regKeyId；角色、剩余次数、到期日及创建人 |
| `oauth` | 第三方身份和平台，userId=0 代表尚未绑定邮箱 |
| `verify_record` | IP、注册/新增邮箱类型、累计次数，用于验证码触发阈值 |
| `setting` | 全站单行设置；service 不使用租户/用户设置 ID |
| KV | `const/kv-const.js` 的会话、setting 缓存、public token、按日发件数、按时区图表缓存；也可保存附件/背景二进制及 metadata |
| 对象存储、IndexedDB | 附件/背景经 r2-service 选择存储；草稿仅在前端 IndexedDB |

recipient/cc/bcc 是数据库 TEXT 内的 JSON 地址对象数组；resendTokens 是 TEXT 内的按域名 token 字典。role 的 banEmail/availDomain 和多项设置过滤字段存为逗号分隔字符串，管理表单可能展示为数组。公开 domainList 带 `@`，role.availDomain 存不带 `@` 的域名。避免混淆这些格式。

状态与开关以 `const/entity-const.js` 为准：多数 setting 是 0 开/1 关，registerVerify/addEmailVerify 另有 2 阈值模式；account.allReceive、role.isDefault 是 1 开。不是通用布尔值。

### Deletion and scheduled maintenance

普通邮件/账户/个人注销按 syncDelete 决定软删除或物理删除；管理端物理删除、按条件批量删除、自动清理有不同调用链。用户恢复只恢复用户和主邮箱，type 参数为真时才进一步恢复邮件及其他账户；物理删除的数据无此恢复路径。

`att-service.removeAttByField` 查询只有单个引用的 key 后删除数据库记录，再尝试删对象。站内副本/正文图片可共享 key，不能按一封邮件的 key 直接删除所有文件。不同批量删除入口对 star 的清理并不完全一致，修改时逐个核对，不要假设存在统一 cascade。

当前配置 cron 为 `0 * * * *`。scheduled 依次清验证记录、重置日配额、处理 SAVING 状态、自动清邮件、刷新图表缓存、删除未绑定 oauth：

- clearRecord/resetDaySendCount 各自仅在 UTC 0 点执行；oauth 清理实际上每次普通 cron 都执行，不受其“凌晨”注释限制。
- autoCleanDays>0 时，以邮件 createTime 为界物理删除，按 autoCleanExclude 中的用户邮箱排除其 userId，每批 95 条；适用于各邮件类型。
- completeReceiveAll 只改 status，没有 completeReceive 中的 isDel 更新，不能宣称它完全恢复了中断的接收记录。
- index.js 另有 cron 等于 `*/30 * * * *` 时仅刷新统计的分支，但当前 TOML 没有启用该 cron。

## API and Integration Patterns

`mail-react/src/api/client.ts` 默认基址 `/api`，可由 VITE_BASE_URL 覆盖。Authorization 是 localStorage 中的原始 token，没有 Bearer 前缀；accept-language 传给后端。普通 JSON 响应为 `{code, message, data}`，result.ok 无有效 data 时返回 null。

全局错误处理通常保持 HTTP 200，而将失败码放在 payload.code；前端同时检查 HTTP 与 payload，code=401 清会话并跳登录，其他失败抛 ApiError。BizError 默认 code=501；基础设施错误还有 KV/D1 未绑定和缺列提示。不要只依赖 HTTP 状态判成功。

| API 组（对外均加 `/api`） | 前端/后端联动位置 |
| --- | --- |
| `/login`、`/register`、`/logout`、`/my/*`、`/oauth/*` | `api/auth.ts`、`pages/`、`hooks/useFinishLogin.ts` ↔ login/my/oauth-api、对应 service |
| `/account/*`、`/email/*`、`/star/*`、`/allEmail/*` | `api/mail.ts`、layout/mail/compose ↔ account/email/star/all-email-api、对应 service |
| `/user/*`、`/role/*`、`/regKey/*`、`/analysis/echarts` | `api/admin.ts`、admin features ↔ user/role/reg-key/analysis-api；角色选项实际为 `/role/selectUse` |
| `/setting/websiteConfig`、`/setting/query`、`/setting/set` 等 | `api/auth.ts`、`api/settings.ts` ↔ setting-api/setting-service |
| `/public/*`、`/webhooks`、`/telegram/getEmail/:token`、`/oss/*`、`/init/:secret` | 面向外部调用/基础设施；不必存在 React 请求封装 |

最后一组有 JSON 以外的响应：初始化和 Resend webhook 返回文本，Telegram 返回 HTML，oss 返回文件流。API helper 不能不加区分地套用到这些接口。

附件/背景存储优先级在 `r2-service.storageType`：配置完整 S3 bucket/endpoint/access/secret → env.r2 → KV。`s3-service` 使用 AWS SDK；S3 批量删除有 Content-MD5 middleware。读对象返回形态不同：R2 object 与 KV/S3 Response，调用方须检查 body/arrayBuffer/httpMetadata 的使用。

特别注意直接 `/attachments` 和 `/static` 路径始终读 KV；`/api/oss/*` 才调用可切换的 r2-service。R2/S3 部署依赖正确的对象访问域名，不要假设换存储后这些 URL 自动转发。`utils/mail.ts`、后端 imgReplace/toImageUrlHtml、Telegram 模板共同消费 r2Domain 和 `{{domain}}`。

## Configuration and Environment

| 来源 | 当前实际配置 |
| --- | --- |
| Worker binding | `db`（D1）、`kv`（KV）、`assets` 必需；`r2` 为可选对象存储，`ai` 用于开启的验证码识别，`email` 用于优先外发；保持实际名称 |
| Worker vars | `domain`、`admin`、`jwt_secret`；可选 `ai_model`、`analysis_cache`、`orm_log`、`project_link` |
| 前端构建 | 唯一源码消费的 Vite env 为 `VITE_BASE_URL`；仓库未提供 env.release 或 `.env` 模板 |
| D1 setting + KV 缓存 | Resend/Turnstile/Telegram/S3/OAuth 凭据、对象域名、公告、过滤与推送/清理开关，参见 setting 实体及 SystemSettingsPage |
| 部署环境 | Actions 的 NAME/CUSTOM_DOMAIN/DOMAIN/ADMIN/JWT_SECRET、Cloudflare API token/account、D1/KV IDs、R2 bucket 和可选配置；参见 workflow 的 env 和替换步骤 |

settingService.refresh 从 D1 读取并将解析后的 resendTokens 缓存到 KV；query 从 KV 读，并可在 Hono context 中缓存。set/setBlacklist/background 的写入后要 refresh。前端 SystemSettingsPage 保存后使 system/config 查询失效；增加字段需同时核对实体、升级 SQL、缓存转换、公开配置是否应暴露、表单及消费端。

setting.get 对部分密钥返回遮罩，websiteConfig 只选择公开字段。前端用局部 patch 避免回写遮罩：S3/TG 某些空输入表示保留，Turnstile/OAuth 空输入会写空；resendTokens 是合并字典，指定域名的空值表示删除。不要全量回写 query 的对象，也不要假设所有秘密都采用相同遮罩/留空语义。

domain 在 TOML 中应优先使用数组。setting.query 接受 JSON 字符串并生成带 @ 的列表，但 register/addUser/account.add 等直接使用 env.domain.includes，不能推断所有消费者都做了相同规范化。project_link 当前被解释为显示上游项目链接的开关，不是任意 URL。

## Development Workflow, Build and Tests

以下命令从仓库根目录执行。CI 使用 Node 24、pnpm 11；两个子项目各有仅包含自身的 pnpm-workspace.yaml。用现有 lockfile，不重新生成或切换包管理器。

```sh
pnpm -C mail-react install --frozen-lockfile
pnpm -C mail-worker install --frozen-lockfile
pnpm -C mail-react run build
```

先构建以提供 Worker assets，再在两个终端分别运行：

```sh
pnpm -C mail-worker run dev
pnpm -C mail-react run dev
```

Worker dev 使用 wrangler-dev.toml，Vite 将 `/api`、`/static/`、两种附件路径代理到 `http://localhost:8787`。dev 配置包含示例资源 ID、域名和 jwt_secret；须按实际本地环境配置 db/kv/domain/admin/secret，并初始化本地数据库。不能把示例配置视为生产凭据，也不能把启动 Vite 当成已有真实后端。

`GET /api/init/:secret` 要求 secret 等于 jwt_secret，调用 intDB 和按序的 v1_1DB 至 v3_3DB，再刷新 setting 缓存；返回文本 success。它会写数据库，且升级步骤包含数据更新、删除旧字段和捕获异常的批处理。不是普通健康检查，也不会自动创建管理员用户。

常用本地检查：

```sh
pnpm -C mail-react run typecheck
pnpm -C mail-react run lint
pnpm -C mail-react run build
pnpm -C mail-react run audit:compat
node --test mail-react/scripts/oauth-callback.test.mjs mail-react/scripts/turnstile.test.mjs
node --test mail-worker/scripts/attachment-routing.test.mjs mail-worker/scripts/oauth-setup.test.mjs mail-worker/scripts/prepare-build-deploy.test.mjs
pnpm -C mail-worker exec wrangler deploy --dry-run --config wrangler-dev.toml --outdir .wrangler/agents-analysis-dry-run
git diff --check
```

- build 包含 `tsc -b`、Vite/PWA 打包和 prepare-build-deploy；已 build 时不必为同一改动重复 typecheck。preview 可用 `pnpm -C mail-react run preview`，它不替代 Worker API。
- audit:compat 固定对照历史提交 `ec7a2bb17c950576c38d7308128cac7696fea169`，需要完整 Git 历史，会重写 `mail-react/compat-api.generated.md`；浅克隆先检查历史对象。它检查静态声明/调用/字段覆盖，不是 E2E 行为测试。
- Worker 的三个 Node 测试文件覆盖附件路由兼容、OAuth setup 证明和绑定恢复。前端 Node 测试直接编译真实 OAuth/Turnstile 工具，覆盖专用回调、state/provider/URI 校验、SDK 就绪/重复加载/卸载竞态及错误重试；不需要新增测试依赖。它们使用内存 stub/临时目录，不验证真实 D1、邮箱投递或第三方服务。
- `mail-worker/package.json` 的 **test 是 `wrangler deploy --config wrangler-test.toml`，会部署**，不是测试命令；deploy 也会发布，start 使用默认 wrangler.toml。
- Worker Vitest 配置引用不存在的 wrangler.jsonc，test/index.spec.js 仍是 Hello World 模板；当前 `pnpm -C mail-worker exec vitest run` 无法运行。没有后端 lint/typecheck script，没有前端 test script 或现成 E2E 测试套件。
- 本指南基线已实测：前端 build/lint/audit、17 个 Worker Node 测试及 Wrangler dry-run 通过；本次认证修复新增 17 个前端 Node 测试并已通过。Vitest 因缺配置失败。build 有超过 500 kB 的 chunk 提示。未验证真实 OAuth、收发信、R2/S3 和部署联调。

### Deployment coupling

`wrangler.toml`、wrangler-test.toml、wrangler-action.toml 有构建 hook，安装/构建 mail-react；wrangler-dev.toml 没有。默认 wrangler.toml 的 D1/KV/R2 示例块是注释，keep_vars 不能补出缺失的资源绑定。不要直接拿默认文件覆盖已有部署绑定。

`.github/workflows/deploy-cloudflare.yml` 在 main 的两个应用目录变动或手工触发时运行，安装 Worker 依赖，替换 wrangler-action.toml，占位资源 ID 未配置时查找/创建 D1 和 KV，按 CLOUDFLARE_EMAIL 追加 email binding，部署后请求 init，并清理 workflow 历史。它是部署流水线，没有运行前述测试/lint；AGENTS.md 单独变更不在 push paths 内。

`scripts/prepare-build-deploy.mjs` 是另一条 Workers Builds 适配路径：仅 WORKERS_CI=1 时启用，当前严格要求 WORKERS_CI_BRANCH 为 `frontend-react-rewrite`。它使用 CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID、WRANGLER_CI_OVERRIDE_NAME（默认 cloud-mail），从历史 Worker versions 找含 db/kv 的绑定，恢复可选 r2/email，写出被忽略的 wrangler-bindings.generated.json 及 `.wrangler/deploy/config.json`。找不到或存在不支持的绑定类型会拒绝该版本；不创建新资源。main 上的 Workers Builds 不能假定通过该分支限制。前端 build 会调用此脚本，改构建与分支条件前必须核对部署场景。

## Coding Conventions

- 前端以 PascalCase 命名 TSX 组件、camelCase 命名 API/helpers，普遍双引号、分号、两空格和相对 import；跨域对象用 types/index.ts 的 interface，管理表单/config 仍大量使用 any/Record，不能宣称已有完整严格业务类型覆盖。
- tsconfig strict=true、allowJs=true、noEmit=true；i18n 字典是 JS。ESLint 使用推荐 JS/TypeScript 规则，关闭 no-explicit-any/no-unused-vars 等规则并忽略 vendored TinyMCE。Prettier 是依赖，但前端没有 format script 或专用配置。
- Worker 以 kebab-case 文件和默认导出的 service 对象为主，async 方法接收 c、params、userId；接口尽量沿现有 API→service→entity/工具链组织。不要强行新增全项目 DAO 层。
- Worker `.editorconfig`/`.prettierrc` 约定 tabs、LF、单引号、分号、printWidth=140；实际也有双引号、未加分号和较新脚本两空格等例外。遵循编辑区域的主要风格，不做无关统一。
- 属性/API 参数通常 camelCase、SQL 列 snake_case，由 Drizzle 映射；保留已有 `domain-uitls.js`、`date-uitil.js`、`rege_key_id` 等拼写。修改名字须检查实际 import 和存储兼容。
- service 抛 BizError(t(key))，Hono 统一包装；外部推送和附件清理等辅助路径常 catch 后 console.error，其他错误可继续抛出。异步有顺序 await 和独立查询 Promise.all，没有统一日志抽象。
- 注释/文案主要中文，部分基础设施英文；对代码与注释冲突按执行逻辑判断。翻译资源分别位于前后端，增加跨端提示时检查两套 zh/en，不假设自动共享。

## Common Change Patterns and Areas Requiring Extra Care

| 任务 | 应一起检查的位置/关系 |
| --- | --- |
| 增改 API/权限 | Worker api、webs 注册、security 排除/requirePerms/premKey、service 归属检查、perm 初始化；前端 api/types、App guard、layout/button 条件、兼容扫描 |
| 改邮件列表/搜索/详情 | email-service 和 star-service、email-list-columns、init 索引、MailPage 的 brief/full/detail/latest 查询及缓存；个人/全站范围和各分页格式 |
| 改发送或附件 | Compose/RichEditor、client.postUpload、email.send/provider 转换、att-service、r2/s3/kv、正文占位与 URL；站内、混合、回复、失败后副作用 |
| 改注册/角色/账户 | Login/Setup/layout、login/account/role/reg-key/verify-record service；域名带 @ 差异、plus-address、注册码日界、配额、主邮箱保护 |
| 改 OAuth | 三个 pages、App callback 路由、utils/oauth、useFinishLogin、oauth-service、JWT 工具、oauth 实体和 Node tests；state、精确 callback URI、purpose/exp/identity/replay |
| 改人机验证 | LoginPage、AppLayout、TurnstileWidget、utils/turnstile、verify-record-service 和前端 Node tests；SDK 就绪、单次脚本加载、token 失效和组件卸载 |
| 改数据库/配置 | entity 和完整 init 升级链、setting cache、公开字段、前端表单 patch 和消费者、raw SQL；历史数据库重复升级与索引 |
| 改删除/定时任务 | user/account/email 的 soft/physics/restore/batch 分支、star/att、对象引用；UTC 重置、cron 清理与统计缓存 |
| 改 UI/持久状态 | styles.css、共享 Controls/Feedback、Zustand 与 Query 缓存、旧 localStorage 的 setting.lang/writer.sendRecipientRecord、Dexie 两表与 open-draft |
| 改 assets/部署 | Vite output/PWA、Worker dispatch、wrangler 四配置、prepare-build-deploy、Actions；附件必须避免 SPA fallback，原 D1/KV/R2 binding IDs 必须保留 |

额外边界：邮件正文由 MailPage 的 DOMPurify 与无 allow-scripts 的 sandbox iframe 展示，保留这两层及自适应高度逻辑；公告也用 DOMPurify。附件链存在 contentType/mimeType/type 的格式差异：Compose 新附件提供 contentType，saveSendAtt 读取 type，而 provider 转换另有 fallback；改动前逐个核对，不假定全链已经统一。loginService.logout 调用异步 userContext.getToken 未 await，不能未经验证宣称只撤销当前会话；认证改动须核对这一行为。

已核对的文档不一致：根 README/README-en 技术栈已写 React，但目录树仍列 app.vue、axios、views、env.release 等旧结构；FRONTEND_MIGRATION 中将 latest 称作 long polling，且部分路由/组件记录沿用旧名；当前系统设置实现在 SystemSettingsPage.tsx，OAuth setup 实现在独立 pages。上述文档及 compat-api.generated.md 用于历史对照，不能覆盖当前实现，也不能证明真实服务已验证。

## Agent Guidelines

1. 修改前先读相关入口、调用方、被调用方和数据流，跨前后端/存储时读完整调用链；不要只修改表面组件或按文件名猜行为。
2. 优先遵循当前架构和局部代码风格；不因个人偏好改框架、状态工具、数据访问层或重构无关模块。
3. 改公共接口、字段、状态码、配置、组件或工具时搜索全部消费者，包括 raw SQL、scheduled/email 事件、模板、Node tests、PWA 和历史持久状态。
4. 不臆造 API、数据库列、env 或业务流程；依赖声明、README、注释及历史审计都须由当前 import/配置/执行路径确认。
5. 对看似异常的兼容逻辑先查用途：旧附件 URL、plus-address 回退、{{domain}}、大小写不敏感索引、原数据库 key/拼写、OAuth setup 证明和历史绑定恢复不可随手删除。
6. 权限同时检查服务端路由映射与资源归属；前端隐藏按钮不构成授权。保留 public API、普通会话、OAuth setup 和 Telegram 查看 token 的不同用途。
7. 存储、删除或升级改动核对主邮箱、共享对象引用、软删除恢复和操作副作用；不假定存在事务/级联或所有失败可回滚。
8. 修改完成运行相关且真实可用的检查、build/Node tests；前端更改至少 lint/build，兼容/配置变更检查 audit。报告失败原因与联调边界，不把 dry-run/静态覆盖说成线上成功。
9. 不将 Worker 的 pnpm test 当单元测试，不为验证随意触发部署、远程 init、批量删除或创建替代云资源；保持既有资源绑定和用户未提交修改。
10. 保持改动范围与当前任务相关；避免大面积格式化、改写 vendored TinyMCE、更新 lockfile 或提交 dist/.wrangler。API/配置/关键流程变化时同步本指南中受影响的内容。
