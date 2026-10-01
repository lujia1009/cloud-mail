# 前端重构兼容性审计

## 范围和方法

旧版来源为 Git 提交 `ec7a2bb17c950576c38d7308128cac7696fea169` 的 `mail-vue/src`；新版为工作区 `mail-react/src`。重新从旧版路由、视图、布局、store、请求封装和富文本组件提取功能，再与新版实际调用、后端 `mail-worker/src/entity/setting.js` 和 `setting-service.js` 对照。`cd mail-react && pnpm audit:compat` 可重新生成 [逐条 API、站点动态配置和后台设置对照表](mail-react/compat-api.generated.md)，包含旧版与新版文件行号及静态覆盖结果。下表对 API 声明检查无法判断的交互、参数与保存语义进行源码复核，并记录本次复审发现的回归。

“是（源码）”表示从前后端源码能找到等效入口、参数和处理；**不表示已在真实后端、所有角色和第三方服务下完成端到端验证**。差异栏记录本轮修复或呈现方式变化。旧版位置用 `Git提交:路径` 表示，可用 `git show <提交>:<路径>` 复核。

## 功能、行为和配置对照

| 旧版功能 / 配置 / 行为 | 旧版实现位置 | 新版实现位置 | 是否兼容 | 存在的差异 / 修复 |
| --- | --- | --- | --- | --- |
| 启动时拉取用户资料、站点配置、设置标题 | `mail-vue/src/init/init.js` | `mail-react/src/app/App.tsx` | 是（源码） | 配置进入查询缓存，系统设置保存后使其失效重取 |
| 登录路由与鉴权跳转 | `mail-vue/src/router/index.js` | `mail-react/src/app/App.tsx`、`src/api/client.ts` | 是（源码） | React 路由守卫；401 清令牌并跳登录 |
| 登录域名隐藏、完整地址或域名后缀输入 | `mail-vue/src/views/login/index.vue` | `mail-react/src/pages/LoginPage.tsx` | 是（源码） | 修复了原先固定完整邮箱输入 |
| 注册开关、注册码必填/选填/关闭 | `mail-vue/src/views/login/index.vue` | `mail-react/src/pages/LoginPage.tsx` | 是（源码） | 注册入口、注册码输入按后台值显示 |
| 邮箱前缀最短长度 | `mail-vue/src/views/login/index.vue` | `mail-react/src/pages/LoginPage.tsx` | 是（源码） | 注册及 OAuth 绑定沿用后端值 |
| 注册验证开关、阈值触发、后台 400 补验 | `mail-vue/src/views/login/index.vue` | `mail-react/src/pages/LoginPage.tsx` | 是（源码） | 按需加载 Turnstile；400 后强制显示 |
| Google、GitHub、LinuxDo 开关及客户端 ID | `mail-vue/src/views/login/index.vue` | `mail-react/src/pages/LoginPage.tsx` | 是（源码） | 使用动态属性名读取三个服务商的开关和 ID |
| OAuth 回调和已有账号绑定 | `mail-vue/src/views/login/index.vue` | `mail-react/src/pages/LoginPage.tsx` | 是（源码） | 三种回调继续使用旧 API 与邮箱绑定参数 |
| 登录背景、透明度、项目链接 | `mail-vue/src/views/login/index.vue`、`src/router/index.js` | `mail-react/src/pages/LoginPage.tsx`、`src/styles.css` | 是（源码） | 修复了背景/透明度和链接被固定的问题 |
| 登录后公告及手动查看 | `mail-vue/src/layout/main/index.vue`、`src/layout/header/index.vue` | `mail-react/src/layouts/AppLayout.tsx` | 是（源码） | 公告内容、类型、宽度、位置、偏移、持续时间均从配置读取 |
| 亮暗主题、语言切换 | `mail-vue/src/store/ui.js`、`src/i18n/index.js` | `mail-react/src/app/App.tsx`、`src/i18n/index.ts`、`src/features/settings/SettingsPage.tsx` | 是（源码） | 状态仍持久化；编辑器随主题及语言重建 |
| 导航与管理页面权限 | `mail-vue/src/perm/perm.js`、`src/layout/aside/index.vue` | `mail-react/src/layouts/AppLayout.tsx`、`src/app/App.tsx` | 是（源码） | 菜单和路由均按后端 `permKeys` 判断 |
| 退出登录及个人注销 | `mail-vue/src/layout/header/index.vue`、`src/views/setting/index.vue` | `mail-react/src/layouts/AppLayout.tsx`、`src/features/settings/SettingsPage.tsx` | 是（源码） | 保留对应后端调用与本地令牌清理 |
| 侧栏多邮箱列表和切换 | `mail-vue/src/layout/account/index.vue` | `mail-react/src/layouts/AppLayout.tsx`、`src/api/mail.ts` | 是（源码） | `manyEmail`、`account:query` 控制入口；分页拉取全部账户；后台关闭多邮箱时重置到主邮箱 |
| 添加邮箱及域名/长度/验证码规则 | `mail-vue/src/layout/account/index.vue` | `mail-react/src/layouts/AppLayout.tsx` | 是（源码） | `manyEmail`、`addEmail`、`addEmailVerify`、`addVerifyOpen`、`siteKey`、`minEmailPrefix` 均动态读取；400 补验 |
| 邮箱重命名、置顶、接收所有邮件、删除 | `mail-vue/src/layout/account/index.vue` | `mail-react/src/layouts/AppLayout.tsx`、`src/features/settings/SettingsPage.tsx` | 是（源码） | 删除按 `account:delete`；其他操作维持旧权限条件 |
| 收件箱、已发送、星标邮件列表 | `mail-vue/src/views/email/index.vue`、`src/views/send/index.vue`、`src/views/star/index.vue` | `mail-react/src/features/mail/MailPage.tsx` | 是（源码） | 继续使用 `/email/list`、`/star/list` 的类型、游标与 full 参数 |
| 列表翻页、排序和复选 | `mail-vue/src/components/email-scroll/index.vue` | `mail-react/src/features/mail/MailPage.tsx` | 是（源码） | 新版以分页按钮代替滚动加载；游标仍按后端最后一封邮件传递 |
| 已读、星标、取消星标和批量删除 | `mail-vue/src/views/email/index.vue`、`src/views/star/index.vue` | `mail-react/src/features/mail/MailPage.tsx` | 是（源码） | 已读与删除调用旧 API；删除按钮按相应权限显示 |
| 动态自动刷新和最新邮件接口 | `mail-vue/src/views/email/index.vue`、`src/views/all-email/index.vue` | `mail-react/src/features/mail/MailPage.tsx` | 是（源码） | 修复固定 60 秒刷新；按 `autoRefresh` 调用 `/email/latest`、`/allEmail/latest` |
| 邮件详情正文、普通文本、附件预览/下载 | `mail-vue/src/views/content/index.vue` | `mail-react/src/features/mail/MailPage.tsx` | 是（源码） | 保留 `r2Domain` 占位符处理及图片类型预览；新版隔离 HTML 显示 |
| 收件详情自动已读，星标详情不自动已读 | `mail-vue/src/views/content/index.vue` | `mail-react/src/features/mail/MailPage.tsx` | 是（源码） | 修复星标详情意外标记已读 |
| 发送状态：失败、投诉、延迟 | `mail-vue/src/views/content/index.vue` | `mail-react/src/features/mail/MailPage.tsx` | 是（源码） | 补回状态 3 的 JSON 消息解析及状态 4/5 提示 |
| 回复、转发及原邮件引用 | `mail-vue/src/views/content/index.vue`、`src/layout/write/index.vue` | `mail-react/src/features/mail/MailPage.tsx`、`src/features/compose/Compose.tsx` | 是（源码） | 保留发送类型、原邮件 ID 与引用正文 |
| 发件人账号、收件人、主题、正文和附件 | `mail-vue/src/layout/write/index.vue` | `mail-react/src/features/compose/Compose.tsx` | 是（源码） | 修复发送体遗漏 `sendEmail`；字段与旧请求对应 |
| 发件上传进度 | `mail-vue/src/layout/write/index.vue`、`src/components/send-percent/index.vue` | `mail-react/src/api/client.ts`、`src/features/compose/Compose.tsx` | 是（源码） | 新增 XHR 上传进度，保留旧版约 98% 等待后端完成的显示方式 |
| 富文本加粗、颜色、字号、对齐、缩进、列表、链接、图片、表格、表情、源码、预览、全屏 | `mail-vue/src/components/tiny-editor/index.vue` | `mail-react/src/features/compose/RichEditor.tsx`、`mail-react/public/tinymce` | 是（源码） | 直接复用旧版 TinyMCE 静态资源、插件和工具栏 |
| 最近联系人选择和删除 | `mail-vue/src/layout/write/index.vue` | `mail-react/src/features/compose/Compose.tsx` | 是（源码） | 恢复最近联系人管理入口和旧 `writer` 本地存储键 |
| 草稿保存、编辑、附件、删除 | `mail-vue/src/views/draft/index.vue`、`src/db/db.js` | `mail-react/src/features/compose/DraftsPage.tsx`、`drafts.ts`、`Compose.tsx` | 是（源码） | 继续使用按账号命名的 IndexedDB 和 draft/att 表 |
| 个人密码修改与账户名称修改 | `mail-vue/src/views/setting/index.vue` | `mail-react/src/features/settings/SettingsPage.tsx` | 是（源码） | 调用旧 `/my/resetPassword` 和 `/account/setName` |
| 管理员全站邮件：收/发/已删/无收件人分类 | `mail-vue/src/views/all-email/index.vue` | `mail-react/src/features/mail/MailPage.tsx` | 是（源码） | 默认接收类型及筛选字段恢复旧版默认值 |
| 管理员邮件搜索：用户/邮箱/发件人/主题 | `mail-vue/src/views/all-email/index.vue` | `mail-react/src/features/mail/MailPage.tsx` | 是（源码） | 字段映射仍传 `userEmail`、`accountEmail`、`name`、`subject` |
| 管理员批量清理：匹配类型、日期范围 | `mail-vue/src/views/all-email/index.vue` | `mail-react/src/features/mail/MailPage.tsx` | 是（源码） | 空条件拒绝提交；本地日期转换 UTC，结束日期加一天 |
| 管理员邮件详情继承筛选条件 | `mail-vue/src/views/all-email/index.vue`、`src/views/content/index.vue` | `mail-react/src/features/mail/MailPage.tsx` | 是（源码） | 修复进入详情后丢失 type/search/sort 的情况 |
| 用户列表：邮箱搜索、状态、时间排序、分页大小 | `mail-vue/src/views/user/index.vue` | `mail-react/src/features/admin/AdminPage.tsx` 的 `UsersPage` | 是（源码） | 恢复页大小 10/15/20/25/30/50 和旧 `user-params` 持久化 |
| 用户收件、发件、邮箱计数的正常/已删口径 | `mail-vue/src/views/user/index.vue` | `mail-react/src/features/admin/AdminPage.tsx` 的 `countSelect` | 是（源码） | 恢复三列的口径切换及合计 |
| 用户批量删除及管理员保护 | `mail-vue/src/views/user/index.vue` | `mail-react/src/features/admin/AdminPage.tsx` 的 `UsersPage` | 是（源码） | 恢复复选批量删除；管理员不能被选择删除 |
| 添加用户：域名、密码、角色 | `mail-vue/src/views/user/index.vue` | `mail-react/src/features/admin/AdminPage.tsx` 的 `UsersPage` | 是（源码） | 恢复从后台 `domainList` 选后缀及角色必选 |
| 用户状态、角色、密码、发件次数、恢复 | `mail-vue/src/views/user/index.vue` | `mail-react/src/features/admin/AdminPage.tsx` 的 `UsersPage` | 是（源码） | 操作按 `user:set-status`、`user:set-type`、`user:set-pwd`、`user:reset-send` 显示 |
| 用户详情及该用户邮箱分页/删除 | `mail-vue/src/views/user/index.vue` | `mail-react/src/features/admin/AdminPage.tsx` 的 `UsersPage` | 是（源码） | 补回登录设备/IP/OAuth 等详情与每页 10 条邮箱列表 |
| 角色列表、创建、编辑、默认、删除 | `mail-vue/src/views/role/index.vue` | `mail-react/src/features/admin/AdminPage.tsx` 的 `RolesPage` | 是（源码） | 保留旧端点和权限；可用角色缓存与全量角色缓存分开 |
| 角色发送限制、邮箱数量、禁止邮箱、可用域名 | `mail-vue/src/views/role/index.vue` | `mail-react/src/features/admin/AdminPage.tsx` 的 `RolesPage` | 是（源码） | 可用域名来自后台 `domainList` |
| 角色权限树的父节点与子节点保存 | `mail-vue/src/views/role/index.vue` | `mail-react/src/features/admin/AdminPage.tsx` 的 `RolesPage` | 是（源码） | 保存时补回半选父节点 ID，并恢复整组勾选 |
| 注册码创建、自动生成、查询、历史、删除、清理 | `mail-vue/src/views/reg-key/index.vue` | `mail-react/src/features/admin/AdminPage.tsx` 的 `KeysPage` | 是（源码） | 到期日恢复旧版 `date` 格式；失效条目显示“过期” |
| 数据分析：总量/正常/已删、来源、用户增长、邮件趋势、今日发件 | `mail-vue/src/views/analysis/index.vue` | `mail-react/src/features/admin/AnalysisPage.tsx` | 是（源码） | 补回八项正常/已删明细及今日发件仪表 |
| 系统设置 68 个实体字段的读写入口 | `mail-vue/src/views/sys-setting/index.vue` | `mail-react/src/features/admin/AdminPage.tsx` 的 `SystemPage` | 是（源码） | 逐字段位置见生成表；新版按设置组编辑 |
| Resend token 按域名增改删与 Cloudflare Email 状态 | `mail-vue/src/views/sys-setting/index.vue` | `mail-react/src/features/admin/AdminPage.tsx` 的 `SystemPage` | 是（源码） | 避免遮罩 token 回写；`hasCfEmail` 时显示后台发件状态 |
| 黑名单三个字段专用 API | `mail-vue/src/views/sys-setting/index.vue` | `mail-react/src/features/admin/AdminPage.tsx` 的 `SystemPage` | 是（源码） | 使用 `/setting/setBlacklist` 同步发送三字段 |
| S3 配置及一键清空、存储类型 | `mail-vue/src/views/sys-setting/index.vue` | `mail-react/src/features/admin/AdminPage.tsx` 的 `SystemPage` | 是（源码） | 恢复清空动作；访问密钥采用留空即不改，显示 `storageType` |
| 公告配置及预览 | `mail-vue/src/views/sys-setting/index.vue` | `mail-react/src/features/admin/AdminPage.tsx` 的 `SystemPage`、`src/layouts/AppLayout.tsx` | 是（源码） | 预览入口保留，正式公告按动态配置渲染 |
| 登录背景 URL/图片上传/删除 | `mail-vue/src/views/sys-setting/index.vue` | `mail-react/src/features/admin/AdminPage.tsx` 的 `SystemPage` | 是（源码） | `/setting/setBackground`、`/setting/deleteBackground` 继续使用 |
| 错误和空状态、权限拒绝 | `mail-vue/src/axios/index.js`、`src/components/email-scroll/index.vue` | `mail-react/src/api/client.ts`、`src/components/Feedback.tsx` | 是（源码） | 401 清会话；组件显示请求错误并提供重试；403 错误向用户提示 |
| 登录配置请求失败时的阻断 | `mail-vue/src/init/init.js:20-58` | `mail-react/src/pages/LoginPage.tsx` | 是（本次修复） | 登录页现在等待 `/setting/websiteConfig`，失败时提供重试，不把动态域名、注册规则默认为空后继续显示表单 |
| 登录、注册、OAuth 绑定的域名选择入口 | `mail-vue/src/views/login/index.vue:16-140` | `mail-react/src/pages/LoginPage.tsx` | 是（本次修复） | 后缀控件仅受后台 `loginDomain` 控制，不因 `domainList.length` 再被隐藏 |
| 列表中显示并复制验证码 | `mail-vue/src/components/email-scroll/index.vue:80-85,156-164` | `mail-react/src/features/mail/MailPage.tsx` | 是（本次修复） | 恢复 `code` 字段显示和剪贴板操作 |
| 全站邮件显示用户、邮箱、投递状态、已删标记 | `mail-vue/src/components/email-scroll/index.vue:59-108,836-856` | `mail-react/src/features/mail/MailPage.tsx` | 是（本次修复） | 恢复管理员列表原有的信息；窄屏也可见 |
| 邮件详情收件人对象数组解析 | `mail-vue/src/views/content/index.vue:201-205` | `mail-react/src/utils/mail.ts` | 是（本次修复） | 将 `recipient` 的对象元素取 `address`，不再显示 `[object Object]` |
| 角色可用域名存储格式 | `mail-vue/src/views/role/index.vue:197-214` | `mail-react/src/features/admin/AdminPage.tsx` | 是（本次修复） | 后缀列表展示时移除 `@` 并以不带 `@` 的值提交，匹配 Worker 的 `email.split('@')[1]` 判断 |
| 个人密码修改时二次确认 | `mail-vue/src/views/setting/index.vue:65-76,161-185` | `mail-react/src/features/settings/SettingsPage.tsx` | 是（本次修复） | 补回确认密码输入和一致性校验 |
| 回复、转发正文中的 R2 地址与原邮件引用 | `mail-vue/src/layout/write/index.vue:436-507` | `mail-react/src/features/compose/Compose.tsx`、`src/utils/mail.ts` | 是（本次修复） | 恢复 `{{domain}}` 替换、原发件人及时间，兼容空主题 |
| 草稿关闭时保存、放弃和继续编辑 | `mail-vue/src/layout/write/index.vue:545-595` | `mail-react/src/features/compose/Compose.tsx` | 是（本次修复） | 新草稿有内容时重新提供选择；已有草稿保持自动保存；原草稿发件邮箱保留 |
| 在写信窗口清空全部内容 | `mail-vue/src/layout/write/index.vue:52,253-260,411-427` | `mail-react/src/features/compose/Compose.tsx` | 是（本次修复） | 恢复确认后清空收件人、主题、正文和附件且窗口保持打开 |
| 清空草稿后关闭删除本地草稿 | `mail-vue/src/layout/write/index.vue:545-562`、`src/store/draft.js` | `mail-react/src/features/compose/Compose.tsx` | 是（本次修复） | 关闭空草稿时同步删除 IndexedDB 的 draft/att 记录 |
| 邮件列表右键操作及管理员快捷搜索 | `mail-vue/src/components/email-scroll/index.vue:154-231,492-535,643-646` | `mail-react/src/features/mail/MailPage.tsx` | 是（本次修复） | 恢复复制验证码、已读、回复、转发、星标、删除及按用户/邮箱/发件人搜索；触屏设备有更多操作按钮 |
| Worker 的 D1/KV/R2/Email 绑定 | `mail-worker/wrangler-action.toml`、`.github/workflows/deploy-cloudflare.yml`（旧提交） | `mail-worker/scripts/prepare-build-deploy.mjs`、`mail-react/package.json` | 待 Cloudflare 实际部署验证 | 旧 GitHub Actions 使用含绑定 ID 的配置；Workers Builds 的默认 `wrangler.toml` 没有这些绑定。本次构建从已有 Worker 版本读取原 ID，生成 Wrangler 部署配置；找不到时终止部署，不创建资源。保留变量与自定义域名。 |

## 复核结论

- 旧请求封装实际定义了 **57 个不同的 HTTP 方法/路径组合**。新版均有 API 实现且在 UI 中直接或间接调用；完整逐项对照见生成表。
- `/setting/websiteConfig` 返回 **33 个动态字段**，新版均找到对应消费路径。OAuth 的六个开关/客户端 ID 使用动态键读取，生成表已识别这一用法。
- 后端 `setting` 实体有 **68 个字段**，新版系统设置页逐项提供入口；`background` 单列显示。`hasCfEmail`、`storageType` 等后端计算值也在新版消费。
- 本次复审再次发现并修复了登录配置失败时隐藏域名选择器、角色域名权限格式、收件人解析、邮件验证码和管理员列表信息、列表操作菜单、密码确认、回复引用及草稿清空/关闭行为的回归。**未修改 `mail-worker/src` 的业务逻辑。**
- D1 报错的直接原因是 Cloudflare Workers Builds 运行默认 `npx wrangler deploy`，读取的 `mail-worker/wrangler.toml` 将 D1/KV/R2 部分注释；旧部署流程用含实际资源 ID 的 `wrangler-action.toml`。**D1/KV/R2 资源本身没有因绑定消失而被删除**，只是当前 Worker 版本无法访问。构建脚本现在尝试从历史 Worker 版本恢复原绑定，找不到或构建环境缺少 API 凭据则失败，不创建新资源，也不把资源 ID 写入仓库。`keep_vars` 保留 Cloudflare 侧环境变量，Worker 自定义域名仍由 Cloudflare 管理。该路径还需要推送后的 Cloudflare 构建结果证明，不能仅凭本地单元测试宣称线上已恢复。
- 用户最后提供的 Cloudflare 构建日志仍使用 `pnpm --prefix ../mail-react ...`，pnpm 10 报 `packages field missing or empty`。Workers Builds 不执行 `wrangler.toml` 的 `[build]`，因此 Cloudflare 控制台里的构建命令需为 `pnpm -C ../mail-react install --frozen-lockfile && pnpm -C ../mail-react run build`（根目录 `/mail-worker`）；如果控制台仍保留旧命令，本次提交也会在构建阶段失败，部署脚本不会运行。
- 静态审计未留下已识别的旧 API、站点动态字段或后台设置字段缺口。真实服务下的角色权限组合、OAuth、Turnstile、R2/S3、邮件投递和原有 IndexedDB 数据仍须部署环境联调；不将静态通过表述为运行时“完全兼容”。

## 验证命令

在 `mail-react` 下运行：`pnpm audit:compat`、`pnpm run typecheck`、`pnpm run lint`、`pnpm run build`。最终复跑四项均通过；构建产物包含 `mail-worker/dist/tinymce/tinymce.min.js`。Vite 报告部分包超过 500 kB 的体积提示，不影响构建。仓库的 `git diff --check` 与 `git diff --cached --check` 通过，`mail-worker/src` 无差异。仓库未提供可用的旧版/新版端到端测试脚本，尚未进行真实服务和第三方平台联调。
