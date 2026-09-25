# 自动生成的旧版 API 与动态配置对照

旧版来源：Git ec7a2bb17c950576c38d7308128cac7696fea169；运行 `pnpm audit:compat` 重新生成。新版位置是请求声明或配置消费位置；手工行为复核见 [FRONTEND_COMPATIBILITY_AUDIT.md](../../FRONTEND_COMPATIBILITY_AUDIT.md)。

## 前端请求：57 项

| 旧版 API | 旧版实现位置 | 新版实现位置 | 静态覆盖 | 差异 |
| --- | --- | --- | --- | --- |
| `DELETE /account/delete` | `mail-vue/src/request/account.js:16` | `mail-react/src/api/mail.ts:25` | 是 | 调用参数和行为另见人工审计 |
| `DELETE /allEmail/batchDelete` | `mail-vue/src/request/all-email.js:12` | `mail-react/src/api/mail.ts:69` | 是 | 调用参数和行为另见人工审计 |
| `DELETE /allEmail/delete` | `mail-vue/src/request/all-email.js:8` | `mail-react/src/api/mail.ts:56` | 是 | 调用参数和行为另见人工审计 |
| `DELETE /email/delete` | `mail-vue/src/request/email.js:8` | `mail-react/src/api/mail.ts:56` | 是 | 调用参数和行为另见人工审计 |
| `DELETE /logout` | `mail-vue/src/request/login.js:8` | `mail-react/src/api/auth.ts:7` | 是 | 调用参数和行为另见人工审计 |
| `DELETE /my/delete` | `mail-vue/src/request/my.js:12` | `mail-react/src/api/auth.ts:11` | 是 | 调用参数和行为另见人工审计 |
| `DELETE /regKey/clearNotUse` | `mail-vue/src/request/reg-key.js:16` | `mail-react/src/api/admin.ts:29` | 是 | 调用参数和行为另见人工审计 |
| `DELETE /regKey/delete` | `mail-vue/src/request/reg-key.js:12` | `mail-react/src/api/admin.ts:28` | 是 | 调用参数和行为另见人工审计 |
| `DELETE /role/delete` | `mail-vue/src/request/role.js:20` | `mail-react/src/api/admin.ts:23` | 是 | 调用参数和行为另见人工审计 |
| `DELETE /setting/deleteBackground` | `mail-vue/src/request/setting.js:20` | `mail-react/src/api/settings.ts:7` | 是 | 调用参数和行为另见人工审计 |
| `DELETE /star/cancel` | `mail-vue/src/request/star.js:8` | `mail-react/src/api/mail.ts:60` | 是 | 调用参数和行为另见人工审计 |
| `DELETE /user/delete` | `mail-vue/src/request/user.js:22` | `mail-react/src/api/admin.ts:13` | 是 | 调用参数和行为另见人工审计 |
| `DELETE /user/deleteAccount` | `mail-vue/src/request/user.js:42` | `mail-react/src/api/admin.ts:17` | 是 | 调用参数和行为另见人工审计 |
| `GET /account/list` | `mail-vue/src/request/account.js:4` | `mail-react/src/api/mail.ts:5` | 是 | 调用参数和行为另见人工审计 |
| `GET /allEmail/latest` | `mail-vue/src/request/all-email.js:16` | `mail-react/src/api/mail.ts:51` | 是 | 调用参数和行为另见人工审计 |
| `GET /allEmail/list` | `mail-vue/src/request/all-email.js:4` | `mail-react/src/api/mail.ts:53` | 是 | 调用参数和行为另见人工审计 |
| `GET /analysis/echarts` | `mail-vue/src/request/analysis.js:4` | `mail-react/src/api/admin.ts:31` | 是 | 调用参数和行为另见人工审计 |
| `GET /email/latest` | `mail-vue/src/request/email.js:12` | `mail-react/src/api/mail.ts:49` | 是 | 调用参数和行为另见人工审计 |
| `GET /email/list` | `mail-vue/src/request/email.js:4` | `mail-react/src/api/mail.ts:37` | 是 | 调用参数和行为另见人工审计 |
| `GET /my/loginUserInfo` | `mail-vue/src/request/my.js:4` | `mail-react/src/api/auth.ts:8` | 是 | 调用参数和行为另见人工审计 |
| `GET /regKey/history` | `mail-vue/src/request/reg-key.js:20` | `mail-react/src/api/admin.ts:30` | 是 | 调用参数和行为另见人工审计 |
| `GET /regKey/list` | `mail-vue/src/request/reg-key.js:4` | `mail-react/src/api/admin.ts:25` | 是 | 调用参数和行为另见人工审计 |
| `GET /role/list` | `mail-vue/src/request/role.js:12` | `mail-react/src/api/admin.ts:18` | 是 | 调用参数和行为另见人工审计 |
| `GET /role/selectUse` | `mail-vue/src/request/role.js:29` | `mail-react/src/api/admin.ts:19` | 是 | 调用参数和行为另见人工审计 |
| `GET /role/tree` | `mail-vue/src/request/role.js:8` | `mail-react/src/api/admin.ts:20` | 是 | 调用参数和行为另见人工审计 |
| `GET /setting/query` | `mail-vue/src/request/setting.js:8` | `mail-react/src/api/settings.ts:3` | 是 | 调用参数和行为另见人工审计 |
| `GET /setting/websiteConfig` | `mail-vue/src/request/setting.js:12` | `mail-react/src/api/auth.ts:9` | 是 | 调用参数和行为另见人工审计 |
| `GET /star/list` | `mail-vue/src/request/star.js:12` | `mail-react/src/api/mail.ts:47` | 是 | 调用参数和行为另见人工审计 |
| `GET /user/allAccount` | `mail-vue/src/request/user.js:38` | `mail-react/src/api/admin.ts:15` | 是 | 调用参数和行为另见人工审计 |
| `GET /user/list` | `mail-vue/src/request/user.js:5` | `mail-react/src/api/admin.ts:4` | 是 | 调用参数和行为另见人工审计 |
| `POST /account/add` | `mail-vue/src/request/account.js:8` | `mail-react/src/api/mail.ts:19` | 是 | 调用参数和行为另见人工审计 |
| `POST /email/send` | `mail-vue/src/request/email.js:20` | `mail-react/src/api/mail.ts:67` | 是 | 调用参数和行为另见人工审计 |
| `POST /login` | `mail-vue/src/request/login.js:4` | `mail-react/src/api/auth.ts:5` | 是 | 调用参数和行为另见人工审计 |
| `POST /oauth/github/login` | `mail-vue/src/request/ouath.js:8` | `mail-react/src/api/auth.ts:17` | 是 | 调用参数和行为另见人工审计 |
| `POST /oauth/google/login` | `mail-vue/src/request/ouath.js:12` | `mail-react/src/api/auth.ts:17` | 是 | 调用参数和行为另见人工审计 |
| `POST /oauth/linuxDo/login` | `mail-vue/src/request/ouath.js:4` | `mail-react/src/api/auth.ts:17` | 是 | 调用参数和行为另见人工审计 |
| `POST /register` | `mail-vue/src/request/login.js:12` | `mail-react/src/api/auth.ts:6` | 是 | 调用参数和行为另见人工审计 |
| `POST /regKey/add` | `mail-vue/src/request/reg-key.js:8` | `mail-react/src/api/admin.ts:26` | 是 | 调用参数和行为另见人工审计 |
| `POST /role/add` | `mail-vue/src/request/role.js:4` | `mail-react/src/api/admin.ts:21` | 是 | 调用参数和行为另见人工审计 |
| `POST /star/add` | `mail-vue/src/request/star.js:4` | `mail-react/src/api/mail.ts:59` | 是 | 调用参数和行为另见人工审计 |
| `POST /user/add` | `mail-vue/src/request/user.js:26` | `mail-react/src/api/admin.ts:5` | 是 | 调用参数和行为另见人工审计 |
| `PUT /account/setAllReceive` | `mail-vue/src/request/account.js:20` | `mail-react/src/api/mail.ts:23` | 是 | 调用参数和行为另见人工审计 |
| `PUT /account/setAsTop` | `mail-vue/src/request/account.js:24` | `mail-react/src/api/mail.ts:24` | 是 | 调用参数和行为另见人工审计 |
| `PUT /account/setName` | `mail-vue/src/request/account.js:12` | `mail-react/src/api/mail.ts:21` | 是 | 调用参数和行为另见人工审计 |
| `PUT /email/read` | `mail-vue/src/request/email.js:16` | `mail-react/src/api/mail.ts:54` | 是 | 调用参数和行为另见人工审计 |
| `PUT /my/resetPassword` | `mail-vue/src/request/my.js:8` | `mail-react/src/api/auth.ts:10` | 是 | 调用参数和行为另见人工审计 |
| `PUT /oauth/bindUser` | `mail-vue/src/request/ouath.js:16` | `mail-react/src/api/auth.ts:21` | 是 | 调用参数和行为另见人工审计 |
| `PUT /role/set` | `mail-vue/src/request/role.js:16` | `mail-react/src/api/admin.ts:22` | 是 | 调用参数和行为另见人工审计 |
| `PUT /role/setDefault` | `mail-vue/src/request/role.js:24` | `mail-react/src/api/admin.ts:24` | 是 | 调用参数和行为另见人工审计 |
| `PUT /setting/set` | `mail-vue/src/request/setting.js:4` | `mail-react/src/api/settings.ts:4` | 是 | 调用参数和行为另见人工审计 |
| `PUT /setting/setBackground` | `mail-vue/src/request/setting.js:16` | `mail-react/src/api/settings.ts:6` | 是 | 调用参数和行为另见人工审计 |
| `PUT /setting/setBlacklist` | `mail-vue/src/request/setting.js:24` | `mail-react/src/api/settings.ts:8` | 是 | 调用参数和行为另见人工审计 |
| `PUT /user/resetSendCount` | `mail-vue/src/request/user.js:30` | `mail-react/src/api/admin.ts:9` | 是 | 调用参数和行为另见人工审计 |
| `PUT /user/restore` | `mail-vue/src/request/user.js:34` | `mail-react/src/api/admin.ts:11` | 是 | 调用参数和行为另见人工审计 |
| `PUT /user/setPwd` | `mail-vue/src/request/user.js:9` | `mail-react/src/api/admin.ts:6` | 是 | 调用参数和行为另见人工审计 |
| `PUT /user/setStatus` | `mail-vue/src/request/user.js:13` | `mail-react/src/api/admin.ts:7` | 是 | 调用参数和行为另见人工审计 |
| `PUT /user/setType` | `mail-vue/src/request/user.js:17` | `mail-react/src/api/admin.ts:8` | 是 | 调用参数和行为另见人工审计 |

## websiteConfig 动态字段：33 项

| 字段 | 旧版消费位置 | 新版消费位置 | 静态覆盖 | 差异 |
| --- | --- | --- | --- | --- |
| `register` | `mail-vue/src/views/login/index.vue:105` | `mail-react/src/pages/LoginPage.tsx:320` | 是 | 行为另见人工审计 |
| `title` | `mail-vue/src/init/init.js:38` | `mail-react/src/layouts/AppLayout.tsx:231` | 是 | 行为另见人工审计 |
| `manyEmail` | `mail-vue/src/components/email-scroll/index.vue:558` | `mail-react/src/features/settings/SettingsPage.tsx:17` | 是 | 行为另见人工审计 |
| `addEmail` | `mail-vue/src/layout/header/index.vue:55` | `mail-react/src/layouts/AppLayout.tsx:92` | 是 | 行为另见人工审计 |
| `autoRefresh` | `mail-vue/src/views/all-email/index.vue:301` | `mail-react/src/features/mail/MailPage.tsx:229` | 是 | 行为另见人工审计 |
| `addEmailVerify` | `mail-vue/src/layout/account/index.vue:461` | `mail-react/src/layouts/AppLayout.tsx:98` | 是 | 行为另见人工审计 |
| `registerVerify` | `mail-vue/src/views/login/index.vue:549` | `mail-react/src/pages/LoginPage.tsx:43` | 是 | 行为另见人工审计 |
| `send` | `mail-vue/src/layout/header/index.vue:104` | `mail-react/src/layouts/AppLayout.tsx:313` | 是 | 行为另见人工审计 |
| `r2Domain` | `mail-vue/src/layout/write/index.vue:505` | `mail-react/src/features/mail/MailPage.tsx:841` | 是 | 行为另见人工审计 |
| `siteKey` | `mail-vue/src/layout/account/index.vue:110` | `mail-react/src/layouts/AppLayout.tsx:136` | 是 | 行为另见人工审计 |
| `background` | `mail-vue/src/router/index.js:124` | `mail-react/src/pages/LoginPage.tsx:343` | 是 | 行为另见人工审计 |
| `loginOpacity` | `mail-vue/src/views/login/index.vue:260` | `mail-react/src/pages/LoginPage.tsx:206` | 是 | 行为另见人工审计 |
| `domainList` | `mail-vue/src/init/init.js:37` | `mail-react/src/layouts/AppLayout.tsx:89` | 是 | 行为另见人工审计 |
| `regKey` | `mail-vue/src/views/login/index.vue:82` | `mail-react/src/pages/LoginPage.tsx:300` | 是 | 行为另见人工审计 |
| `regVerifyOpen` | `mail-vue/src/views/login/index.vue:549` | `mail-react/src/pages/LoginPage.tsx:44` | 是 | 行为另见人工审计 |
| `addVerifyOpen` | `mail-vue/src/layout/account/index.vue:461` | `mail-react/src/layouts/AppLayout.tsx:99` | 是 | 行为另见人工审计 |
| `noticeTitle` | `mail-vue/src/layout/main/index.vue:38` | `mail-react/src/layouts/AppLayout.tsx:554` | 是 | 行为另见人工审计 |
| `noticeContent` | `mail-vue/src/layout/main/index.vue:39` | `mail-react/src/layouts/AppLayout.tsx:557` | 是 | 行为另见人工审计 |
| `noticeType` | `mail-vue/src/layout/main/index.vue:40` | `mail-react/src/layouts/AppLayout.tsx:533` | 是 | 行为另见人工审计 |
| `noticeDuration` | `mail-vue/src/layout/main/index.vue:41` | `mail-react/src/layouts/AppLayout.tsx:128` | 是 | 行为另见人工审计 |
| `noticePosition` | `mail-vue/src/layout/main/index.vue:42` | `mail-react/src/layouts/AppLayout.tsx:539` | 是 | 行为另见人工审计 |
| `noticeWidth` | `mail-vue/src/layout/main/index.vue:37` | `mail-react/src/layouts/AppLayout.tsx:536` | 是 | 行为另见人工审计 |
| `noticeOffset` | `mail-vue/src/layout/main/index.vue:43` | `mail-react/src/layouts/AppLayout.tsx:540` | 是 | 行为另见人工审计 |
| `notice` | `mail-vue/src/layout/main/index.vue:36` | `mail-react/src/layouts/AppLayout.tsx:120` | 是 | 行为另见人工审计 |
| `loginDomain` | `mail-vue/src/views/login/index.vue:264` | `mail-react/src/pages/LoginPage.tsx:40` | 是 | 行为另见人工审计 |
| `linuxdoClientId` | `mail-vue/src/views/login/index.vue:289` | `mail-react/src/pages/LoginPage.tsx:117` | 是 | 行为另见人工审计 |
| `linuxdoSwitch` | `mail-vue/src/views/login/index.vue:199` | `mail-react/src/pages/LoginPage.tsx:198` | 是 | 行为另见人工审计 |
| `githubClientId` | `mail-vue/src/views/login/index.vue:289` | `mail-react/src/pages/LoginPage.tsx:117` | 是 | 行为另见人工审计 |
| `githubSwitch` | `mail-vue/src/views/login/index.vue:199` | `mail-react/src/pages/LoginPage.tsx:197` | 是 | 行为另见人工审计 |
| `googleClientId` | `mail-vue/src/views/login/index.vue:289` | `mail-react/src/pages/LoginPage.tsx:117` | 是 | 行为另见人工审计 |
| `googleSwitch` | `mail-vue/src/views/login/index.vue:199` | `mail-react/src/pages/LoginPage.tsx:196` | 是 | 行为另见人工审计 |
| `minEmailPrefix` | `mail-vue/src/layout/account/index.vue:443` | `mail-react/src/layouts/AppLayout.tsx:605` | 是 | 行为另见人工审计 |
| `projectLink` | `mail-vue/src/views/login/index.vue:147` | `mail-react/src/pages/LoginPage.tsx:330` | 是 | 行为另见人工审计 |

## 后台 setting 实体：68 项

新版系统设置入口覆盖 68/68 项。缺失：无。背景图在系统设置中单独显示。

| 设置字段 | 旧版管理页位置 | 新版管理页位置 | 静态覆盖 | 差异 |
| --- | --- | --- | --- | --- |
| `register` | `mail-vue/src/views/sys-setting/index.vue:17` | `mail-react/src/features/admin/AdminPage.tsx:1150` | 是 | 保存语义另见人工审计 |
| `receive` | `mail-vue/src/views/sys-setting/index.vue:146` | `mail-react/src/features/admin/AdminPage.tsx:78` | 是 | 保存语义另见人工审计 |
| `title` | `mail-vue/src/views/sys-setting/index.vue:11` | `mail-react/src/features/admin/AdminPage.tsx:224` | 是 | 保存语义另见人工审计 |
| `manyEmail` | `mail-vue/src/views/sys-setting/index.vue:61` | `mail-react/src/features/admin/AdminPage.tsx:1153` | 是 | 保存语义另见人工审计 |
| `addEmail` | `mail-vue/src/views/sys-setting/index.vue:49` | `mail-react/src/features/admin/AdminPage.tsx:1154` | 是 | 保存语义另见人工审计 |
| `autoRefresh` | `mail-vue/src/views/sys-setting/index.vue:151` | `mail-react/src/features/admin/AdminPage.tsx:1155` | 是 | 保存语义另见人工审计 |
| `addEmailVerify` | `mail-vue/src/views/sys-setting/index.vue:349` | `mail-react/src/features/admin/AdminPage.tsx:1164` | 是 | 保存语义另见人工审计 |
| `registerVerify` | `mail-vue/src/views/sys-setting/index.vue:330` | `mail-react/src/features/admin/AdminPage.tsx:1162` | 是 | 保存语义另见人工审计 |
| `regVerifyCount` | `mail-vue/src/views/sys-setting/index.vue:749` | `mail-react/src/features/admin/AdminPage.tsx:1163` | 是 | 保存语义另见人工审计 |
| `addVerifyCount` | `mail-vue/src/views/sys-setting/index.vue:757` | `mail-react/src/features/admin/AdminPage.tsx:1165` | 是 | 保存语义另见人工审计 |
| `send` | `mail-vue/src/views/sys-setting/index.vue:176` | `mail-react/src/features/admin/AdminPage.tsx:79` | 是 | 保存语义另见人工审计 |
| `r2Domain` | `mail-vue/src/views/sys-setting/index.vue:288` | `mail-react/src/features/admin/AdminPage.tsx:1172` | 是 | 保存语义另见人工审计 |
| `secretKey` | `mail-vue/src/views/sys-setting/index.vue:371` | `mail-react/src/features/admin/AdminPage.tsx:1169` | 是 | 保存语义另见人工审计 |
| `siteKey` | `mail-vue/src/views/sys-setting/index.vue:362` | `mail-react/src/features/admin/AdminPage.tsx:1168` | 是 | 保存语义另见人工审计 |
| `regKey` | `mail-vue/src/views/sys-setting/index.vue:28` | `mail-react/src/features/admin/AdminPage.tsx:1161` | 是 | 保存语义另见人工审计 |
| `background` | `mail-vue/src/views/sys-setting/index.vue:113` | `mail-react/src/features/admin/AdminPage.tsx:1294` | 是 | 保存语义另见人工审计 |
| `tgBotToken` | `mail-vue/src/views/sys-setting/index.vue:597` | `mail-react/src/features/admin/AdminPage.tsx:1189` | 是 | 保存语义另见人工审计 |
| `tgChatId` | `mail-vue/src/views/sys-setting/index.vue:598` | `mail-react/src/features/admin/AdminPage.tsx:1190` | 是 | 保存语义另见人工审计 |
| `tgBotStatus` | `mail-vue/src/views/sys-setting/index.vue:240` | `mail-react/src/features/admin/AdminPage.tsx:1188` | 是 | 保存语义另见人工审计 |
| `forwardEmail` | `mail-vue/src/views/sys-setting/index.vue:658` | `mail-react/src/features/admin/AdminPage.tsx:1184` | 是 | 保存语义另见人工审计 |
| `forwardStatus` | `mail-vue/src/views/sys-setting/index.vue:249` | `mail-react/src/features/admin/AdminPage.tsx:1185` | 是 | 保存语义另见人工审计 |
| `ruleEmail` | `mail-vue/src/views/sys-setting/index.vue:726` | `mail-react/src/features/admin/AdminPage.tsx:1186` | 是 | 保存语义另见人工审计 |
| `ruleType` | `mail-vue/src/views/sys-setting/index.vue:267` | `mail-react/src/features/admin/AdminPage.tsx:1187` | 是 | 保存语义另见人工审计 |
| `loginOpacity` | `mail-vue/src/views/sys-setting/index.vue:105` | `mail-react/src/features/admin/AdminPage.tsx:1158` | 是 | 保存语义另见人工审计 |
| `resendTokens` | `mail-vue/src/views/sys-setting/index.vue:1156` | `mail-react/src/features/admin/AdminPage.tsx:1183` | 是 | 保存语义另见人工审计 |
| `noticeTitle` | `mail-vue/src/views/sys-setting/index.vue:381` | `mail-react/src/features/admin/AdminPage.tsx:1221` | 是 | 保存语义另见人工审计 |
| `noticeContent` | `mail-vue/src/views/sys-setting/index.vue:815` | `mail-react/src/features/admin/AdminPage.tsx:1222` | 是 | 保存语义另见人工审计 |
| `noticeType` | `mail-vue/src/views/sys-setting/index.vue:769` | `mail-react/src/features/admin/AdminPage.tsx:1223` | 是 | 保存语义另见人工审计 |
| `noticeDuration` | `mail-vue/src/views/sys-setting/index.vue:804` | `mail-react/src/features/admin/AdminPage.tsx:1224` | 是 | 保存语义另见人工审计 |
| `noticePosition` | `mail-vue/src/views/sys-setting/index.vue:779` | `mail-react/src/features/admin/AdminPage.tsx:1225` | 是 | 保存语义另见人工审计 |
| `noticeOffset` | `mail-vue/src/views/sys-setting/index.vue:796` | `mail-react/src/features/admin/AdminPage.tsx:1226` | 是 | 保存语义另见人工审计 |
| `noticeWidth` | `mail-vue/src/views/sys-setting/index.vue:788` | `mail-react/src/features/admin/AdminPage.tsx:1227` | 是 | 保存语义另见人工审计 |
| `notice` | `mail-vue/src/views/sys-setting/index.vue:386` | `mail-react/src/features/admin/AdminPage.tsx:1220` | 是 | 保存语义另见人工审计 |
| `noRecipient` | `mail-vue/src/views/sys-setting/index.vue:188` | `mail-react/src/features/admin/AdminPage.tsx:1156` | 是 | 保存语义另见人工审计 |
| `loginDomain` | `mail-vue/src/views/sys-setting/index.vue:21` | `mail-react/src/features/admin/AdminPage.tsx:1157` | 是 | 保存语义另见人工审计 |
| `bucket` | `mail-vue/src/views/sys-setting/index.vue:839` | `mail-react/src/features/admin/AdminPage.tsx:1200` | 是 | 保存语义另见人工审计 |
| `region` | `mail-vue/src/views/sys-setting/index.vue:841` | `mail-react/src/features/admin/AdminPage.tsx:1201` | 是 | 保存语义另见人工审计 |
| `endpoint` | `mail-vue/src/views/sys-setting/index.vue:840` | `mail-react/src/features/admin/AdminPage.tsx:1202` | 是 | 保存语义另见人工审计 |
| `s3AccessKey` | `mail-vue/src/views/sys-setting/index.vue:842` | `mail-react/src/features/admin/AdminPage.tsx:1203` | 是 | 保存语义另见人工审计 |
| `s3SecretKey` | `mail-vue/src/views/sys-setting/index.vue:844` | `mail-react/src/features/admin/AdminPage.tsx:1204` | 是 | 保存语义另见人工审计 |
| `forcePathStyle` | `mail-vue/src/views/sys-setting/index.vue:853` | `mail-react/src/features/admin/AdminPage.tsx:1205` | 是 | 保存语义另见人工审计 |
| `customDomain` | `mail-vue/src/views/sys-setting/index.vue:600` | `mail-react/src/features/admin/AdminPage.tsx:1206` | 是 | 保存语义另见人工审计 |
| `tgMsgFrom` | `mail-vue/src/views/sys-setting/index.vue:603` | `mail-react/src/features/admin/AdminPage.tsx:1191` | 是 | 保存语义另见人工审计 |
| `tgMsgTo` | `mail-vue/src/views/sys-setting/index.vue:614` | `mail-react/src/features/admin/AdminPage.tsx:1192` | 是 | 保存语义另见人工审计 |
| `tgMsgText` | `mail-vue/src/views/sys-setting/index.vue:625` | `mail-react/src/features/admin/AdminPage.tsx:1193` | 是 | 保存语义另见人工审计 |
| `minEmailPrefix` | `mail-vue/src/views/sys-setting/index.vue:864` | `mail-react/src/features/admin/AdminPage.tsx:1166` | 是 | 保存语义另见人工审计 |
| `emailPrefixFilter` | `mail-vue/src/views/sys-setting/index.vue:872` | `mail-react/src/features/admin/AdminPage.tsx:1167` | 是 | 保存语义另见人工审计 |
| `blackSubject` | `mail-vue/src/views/sys-setting/index.vue:890` | `mail-react/src/features/admin/AdminPage.tsx:1178` | 是 | 保存语义另见人工审计 |
| `blackContent` | `mail-vue/src/views/sys-setting/index.vue:893` | `mail-react/src/features/admin/AdminPage.tsx:1179` | 是 | 保存语义另见人工审计 |
| `blackFrom` | `mail-vue/src/views/sys-setting/index.vue:887` | `mail-react/src/features/admin/AdminPage.tsx:1180` | 是 | 保存语义另见人工审计 |
| `aiCode` | `mail-vue/src/views/sys-setting/index.vue:409` | `mail-react/src/features/admin/AdminPage.tsx:1174` | 是 | 保存语义另见人工审计 |
| `syncDelete` | `mail-vue/src/views/sys-setting/index.vue:66` | `mail-react/src/features/admin/AdminPage.tsx:1173` | 是 | 保存语义另见人工审计 |
| `aiCodeFilter` | `mail-vue/src/views/sys-setting/index.vue:925` | `mail-react/src/features/admin/AdminPage.tsx:1175` | 是 | 保存语义另见人工审计 |
| `linuxdoClientId` | `—` | `mail-react/src/features/admin/AdminPage.tsx:1209` | 是 | 旧页未直接引用；由后台字段识别 |
| `linuxdoClientSecret` | `—` | `mail-react/src/features/admin/AdminPage.tsx:1210` | 是 | 旧页未直接引用；由后台字段识别 |
| `linuxdoSwitch` | `—` | `mail-react/src/features/admin/AdminPage.tsx:1211` | 是 | 旧页未直接引用；由后台字段识别 |
| `githubClientId` | `—` | `mail-react/src/features/admin/AdminPage.tsx:1212` | 是 | 旧页未直接引用；由后台字段识别 |
| `githubClientSecret` | `—` | `mail-react/src/features/admin/AdminPage.tsx:1213` | 是 | 旧页未直接引用；由后台字段识别 |
| `githubSwitch` | `—` | `mail-react/src/features/admin/AdminPage.tsx:1214` | 是 | 旧页未直接引用；由后台字段识别 |
| `googleClientId` | `—` | `mail-react/src/features/admin/AdminPage.tsx:1215` | 是 | 旧页未直接引用；由后台字段识别 |
| `googleClientSecret` | `—` | `mail-react/src/features/admin/AdminPage.tsx:1216` | 是 | 旧页未直接引用；由后台字段识别 |
| `googleSwitch` | `—` | `mail-react/src/features/admin/AdminPage.tsx:1217` | 是 | 旧页未直接引用；由后台字段识别 |
| `autoCleanDays` | `mail-vue/src/views/sys-setting/index.vue:224` | `mail-react/src/features/admin/AdminPage.tsx:1176` | 是 | 保存语义另见人工审计 |
| `autoCleanExclude` | `mail-vue/src/views/sys-setting/index.vue:903` | `mail-react/src/features/admin/AdminPage.tsx:1177` | 是 | 保存语义另见人工审计 |
| `webhookUrl` | `mail-vue/src/views/sys-setting/index.vue:685` | `mail-react/src/features/admin/AdminPage.tsx:1194` | 是 | 保存语义另见人工审计 |
| `webhookStatus` | `mail-vue/src/views/sys-setting/index.vue:258` | `mail-react/src/features/admin/AdminPage.tsx:1195` | 是 | 保存语义另见人工审计 |
| `webhookRetry` | `mail-vue/src/views/sys-setting/index.vue:688` | `mail-react/src/features/admin/AdminPage.tsx:1196` | 是 | 保存语义另见人工审计 |
| `webhookSecret` | `mail-vue/src/views/sys-setting/index.vue:686` | `mail-react/src/features/admin/AdminPage.tsx:1197` | 是 | 保存语义另见人工审计 |
