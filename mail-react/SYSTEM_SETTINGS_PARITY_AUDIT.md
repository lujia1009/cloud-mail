# 系统设置页：Vue → React 对照

基准是 `main:mail-vue/src/views/sys-setting/index.vue` 的真实模板和脚本（重构前版本），不是迁移计划。新版实现是 `src/features/admin/SystemSettingsPage.tsx`，由 `src/features/admin/AdminPage.tsx` 的 `kind === "system"` 入口加载。保留 React 页面原有的 Tab 导航，每个 Tab 使用旧版分组名称；内容直接铺在现有外层页面容器中。设置项文案使用旧版的 i18n key。下表按旧版页面上可见的设置项逐项列出；“弹窗”后的控件是编辑弹窗内的实际输入方式。

| 旧版设置项 | 旧版位置、控件及字段 | 新版位置、控件及字段 | 结果 |
| --- | --- | --- | --- |
| 用户注册 | 基本设置 `websiteReg`：开关，`register`，0 开启 | 基本设置 `switchRow("websiteReg", "register")` | 已恢复；开关保存后刷新公开配置，登录页按 `register === 0` 显示注册入口 |
| 隐藏登录域名 | 基本设置 `loginDomain`：开关，`loginDomain`，1 开启 | `switchRow("loginDomain", ..., 1)` | 一致 |
| 注册码 | 基本设置 `regKey`：下拉启用/关闭/可选，`regKey` | `select("regKey", ...)`，同值 0/1/2 | 一致 |
| 添加邮箱 | 基本设置 `addAccount`：开关，`addEmail` | `switchRow("addAccount", "addEmail")` | 一致 |
| 多号模式 | 基本设置 `multipleEmail`：开关和提示，`manyEmail` | `switchRow("multipleEmail", "manyEmail", ..., "multipleEmailDesc")` | 一致 |
| 同步删除 | 基本设置 `syncDelete`：开关和提示 | `switchRow("syncDelete", ...)` | 一致 |
| 邮箱前缀 | 基本设置 `emailPrefix`：设置弹窗，至少位数数字框（1–20）和禁用词标签输入，`minEmailPrefix`、`emailPrefixFilter` | `emailPrefix` 弹窗，同类控件和字段 | 已恢复 |
| 网站标题 | 个性化设置 `websiteTitle`：文本弹窗，`title` | `title` 弹窗文本框 | 一致 |
| 登录透明 | 个性化设置 `loginBoxOpacity`：数字框，0–1、步长 0.01、延迟保存 | 同名数字框和 1 秒延迟保存 | 一致 |
| 登录背景 | 个性化设置 `loginBackground`：图片预览、网址/本地上传、删除，`background` | `background` 弹窗、文件/网址输入、预览与删除，沿用背景 API | 已恢复 |
| 邮件接收 | 邮件设置 `receiveEmail`：开关，`receive` | `switchRow("receiveEmail", "receive")` | 一致 |
| 自动刷新 | 邮件设置 `autoRefresh`：下拉，0/3/5/10/15/20 秒 | 同值下拉和提示 | 一致 |
| 邮件发送 | 邮件设置 `sendEmail`：开关，`send` | `switchRow("sendEmail", "send")` | 一致 |
| 无人收件 | 邮件设置 `noRecipientTitle`：开关和提示，`noRecipient` | 对应开关和提示 | 一致 |
| Resend Token | 邮件设置：若 `hasCfEmail` 显示 Cloudflare 邮件发送，否则提供 Token 列表与域名/Token 新增弹窗，`resendTokens` | 同一动态分支、列表和新增弹窗 | 已恢复 |
| 邮件黑名单 | 邮件设置 `blackList`：发件人/主题/内容三个标签输入；专用黑名单 API | `blackList` 弹窗及 `settings.blacklist` | 一致 |
| 自动清理 | 邮件设置 `autoClean`：数字框 0–3650、排除邮箱标签输入；保留天数摘要 | `autoClean` 弹窗及摘要，同字段 | 一致 |
| Telegram 机器人 | 邮件推送 `tgBot`：Token 文本、聊天 ID 数字标签、域名文本、三项下拉、启用开关 | `tgBot` 弹窗，同控件及 `tgBot*`/`customDomain` 字段 | 已恢复 |
| 第三方邮箱 | 邮件推送 `otherEmail`：邮箱标签输入、启用开关，`forwardEmail`/`forwardStatus` | `otherEmail` 弹窗，同控件 | 一致 |
| Webhook | 邮件推送 `webhook`：URL/密钥文本、重试次数数字框、启用开关、格式示例 | `webhook` 弹窗，同控件；保留 URL 规范化和原示例字段 | 已恢复 |
| 转发规则 | 邮件推送 `forwardingRules`：邮箱标签输入、全部/按规则单选，`ruleEmail`/`ruleType` | `forwardingRules` 弹窗，同控件 | 一致 |
| 访问域名 | 对象存储 `osDomain`：文本弹窗，`r2Domain` | `r2Domain` 弹窗文本框和当前值 | 一致 |
| S3 配置 | 对象存储 `s3Configuration`：Bucket/Endpoint/Region/密钥文本框、ForcePathStyle 开关、清空按钮 | `s3` 弹窗，同控件、保存和清空字段 | 一致 |
| 存储类型 | 对象存储 `storageType`：只读标签 | 只读显示 API 返回的 `storageType` | 一致 |
| 注册验证 | Turnstile `signUpVerification`：启用/关闭/规则下拉，规则次数数字弹窗 | 同值下拉与 `regVerifyCount` 数字弹窗 | 一致 |
| 添加邮箱验证 | Turnstile `addEmailVerification`：同类下拉与次数数字弹窗 | 同值下拉与 `addVerifyCount` 数字弹窗 | 一致 |
| Site Key / Secret Key | Turnstile：两项文本框共用密钥编辑弹窗 | `turnstile` 弹窗两项文本框 | 一致 |
| 登录弹窗 | 网站公告 `noticePopup`：标题文本、图标/位置下拉、宽度/偏移/时长数字框、内容文本域、启用开关、预览 | `notice` 弹窗，同字段和控件，预览读取编辑中的值 | 已恢复 |
| 弹出 | 网站公告 `popUp`：预览按钮 | 相同预览入口 | 一致 |
| 识别验证码 | Workers AI `codeRecognition`：开关，`aiCode` | 对应开关 | 一致 |
| 识别规则 | Workers AI `codeRecognitionRules`：邮箱/域名标签输入，`aiCodeFilter` | `aiCodeFilter` 弹窗，同类标签输入 | 一致 |
| Google / GitHub / LinuxDo | 第三方登录：每个平台客户端 ID/密钥文本框和启用开关 | 三个 `oauth:*` 弹窗，沿用各平台 `*ClientId`、`*ClientSecret`、`*Switch` | 已恢复 |
| 版本 / 社区 / 支持 / 帮助 | 关于：版本检查与发布页、GitHub/Telegram/文档链接 | 关于卡片和相同链接、版本检查 | 一致 |

旧版 `main:mail-vue/src/views/sys-setting/index.vue` 使用 `settingSet`、`setBackground`、`deleteBackground`、`setBlackList`、`getSettings`；新版分别通过 `settings.save`、`settings.background`、`settings.deleteBackground`、`settings.blacklist`、`settings.query` 调用原路径。兼容性扫描从旧版调用点和 Worker 设置实体生成：旧版 API 57 个，新版未覆盖 0；旧版动态字段 33 个，未覆盖 0；后台实体设置字段 68 个，未覆盖 0。完整字段清单见 `compat-api.generated.md`。

本次只修改 React 页面和样式、兼容性审计脚本；未修改 Worker 后端业务代码或 Cloudflare 部署绑定。生产构建包含 TypeScript 检查；`pnpm --dir mail-react run lint`、`pnpm --dir mail-react run audit:compat` 均通过。模拟旧版设置 API 的浏览器交互检查验证：点击“用户注册”开关提交 `{ "register": 0 }`，公开配置变为 0 后登录页显示“创建账号”。
