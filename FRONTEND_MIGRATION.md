# Frontend migration inventory

Source audited before removal: `mail-vue/src` (72 files), `mail-worker/src/api`, corresponding services/entities, `mail-vue/package.json`, and deployment configuration. The Worker is the contract; this migration does not change its business routes or schema.

## Existing pages, routes and permissions

| Route | Existing feature | Permission |
| --- | --- | --- |
| `/login` | Password login, registration, Turnstile, OAuth login/binding (LinuxDo/GitHub/Google) | Public |
| `/inbox`, `/mail` | Received mail, cursor paging, live refresh, read, star, delete, HTML/text detail, attachments, reply/forward | Authenticated; individual actions gated |
| `/starred` | Starred mail | Authenticated |
| `/sent`, `/drafts` | Sent mail, local drafts, composer | `email:send` |
| `/settings` | Profile name, password, language, account deletion | Authenticated |
| `/all-users` | Search/page users, add/delete/restore, status, role, password, send counts, user mailboxes | `user:query`; writes have separate keys |
| `/role` | Role creation/edit/delete/default, permission tree, quotas/domain restrictions | `role:query` |
| `/invite-code` | Registration keys, creation/deletion/clear/history | `reg-key:query` |
| `/all-mail` | Global mail search/filter, deletion, bulk cleanup, detail | `all-email:query` |
| `/system-settings` | Site, registration, sending, forwarding, R2/S3, OAuth, Turnstile, Telegram, webhooks, background and cleanup options | `setting:query` |
| `/analysis` | ECharts system/user/mail statistics | `analysis:query` |
| `/:pathMatch(.*)` | 404 | Public |

## API contract

All front-end calls use `/api` as base URL (Worker strips `/api`). `Authorization` is the **raw token** from `localStorage.token`, and `accept-language` is `zh` or `en`. The response envelope is `{ code, message, data }`; `code=200` succeeds, `401` invalidates the token, `403` is a permission error. Network and non-200 failures need visible feedback. The Worker continues serving static assets and `/static/` and `/attachments/` object URLs.

| Domain | Calls and parameters |
| --- | --- |
| Auth | `POST /login {email,password}` -> `{token}`; `POST /register` accepts the existing registration form (email/password/code/Turnstile token); `DELETE /logout`; `POST /oauth/{linuxDo,github,google}/login {code,redirectUri}`; `PUT /oauth/bindUser` |
| My | `GET /my/loginUserInfo` -> `{userId,email,name,account,permKeys,role,type,sendCount}`; `PUT /my/resetPassword {password}`; `DELETE /my/delete` |
| Accounts | `GET /account/list?accountId&size&lastSort` -> account array (max 30/page); `POST /account/add {email,token}`; `PUT /account/setName {accountId,name}`; `PUT /account/setAllReceive {accountId}`; `PUT /account/setAsTop {accountId}`; `DELETE /account/delete?accountId` |
| Mail | `GET /email/list?accountId&allReceive&emailId&timeSort&size&type&full` -> `{list,total,latestEmail}`. `type=0` received, `1` sent; `full=0` returns a 300-char `listText` with no full body, `full=1` returns body and `attList`; cursor is `emailId`, max size 50. `GET /email/latest?emailId&accountId&allReceive` long polling; `PUT /email/read {emailIds}` (read only); `DELETE /email/delete?emailIds`; `POST /email/send` JSON `{accountId,name,sendType,emailId,receiveEmail,text,content,subject,attachments}` -> mail array. Attachment objects are `{content,filename,size,contentType}` with base64 content. `GET /email/attList` exists in Worker. |
| Star | `GET /star/list?emailId&size&full` -> `{list}`; `POST /star/add {emailId}`; `DELETE /star/cancel?emailId` |
| Global mail | `GET /allEmail/list` with cursor/size/full/timeSort and `name,subject,accountEmail,userEmail,type` filters -> `{list,total}`; `GET /allEmail/latest?emailId`; `DELETE /allEmail/delete?emailIds`; `DELETE /allEmail/batchDelete` with sender/address/date/match filters |
| Users | `GET /user/list` with page/filter fields; `POST /user/add`; `PUT /user/setPwd`, `/user/setStatus`, `/user/setType`, `/user/resetSendCount`, `/user/restore`; `DELETE /user/delete?userIds`; `GET /user/allAccount?userId&num&size`; `DELETE /user/deleteAccount?accountId` |
| Roles | `GET /role/tree`, `/role/list`, `/role/selectUse`; `POST /role/add`; `PUT /role/set`, `/role/setDefault {roleId}`; `DELETE /role/delete?roleId` |
| Registration keys | `GET /regKey/list`, `/regKey/history?regKeyId`; `POST /regKey/add`; `DELETE /regKey/delete?regKeyIds`, `/regKey/clearNotUse` |
| Settings | `GET /setting/websiteConfig` (public site settings/domain list); `GET /setting/query` (admin full settings); `PUT /setting/set` partial setting object, `/setting/setBackground {background}`, `/setting/setBlacklist`; `DELETE /setting/deleteBackground` |
| Analysis | `GET /analysis/echarts?timeZone` -> chart series/count data |

Mail row fields from Worker entity/list projection: `emailId,sendEmail,name,subject,recipient,toEmail,type,status,message,unread,createTime,isDel,isStar` plus `listText` for brief lists or `text,content,attList` for full lists. `unread=0` means unread, `1` read. `isStar` is derived for each user. Attachment entries include `attId,key,filename,size`; `key` is resolved against site `r2Domain`, while HTML bodies can contain `{{domain}}` placeholders.

## State and storage compatibility

* `localStorage.token` is the existing session; preserve it so existing users do not re-register.
* Legacy Pinia persisted `setting.lang`, `writer.sendRecipientRecord`, and selected mail detail. Read the old language/recipient records when useful; use React-owned storage thereafter.
* Dexie stores drafts in an IndexedDB database named by the signed-in user's email. Version 1 tables: `draft: ++draftId,createTime` and `att: draftId`. Keep these exact names/keys to read historical drafts and attachments.
* User state is fetched from `/my/loginUserInfo`; permissions are `permKeys` with `*` for admin. Account switching is client state; account `allReceive` controls cross-account received mail.
* Existing UI supports Chinese/English and theme controls, responsive navigation, mail polling, optimistic star/read actions, and local recent-recipient history.

## Compatibility notes

The Worker has **no general user mail search endpoint** and **no unread reversal, archive, spam, CC/BCC send fields, or server-side draft endpoint**. UI must not fabricate these APIs. Search can filter loaded personal-mail pages; global admin search uses `/allEmail/list`. Drafts remain local. Any feature-gap in the new UI must be reported honestly in final verification.

## New frontend and deployment

`mail-react/` is an independent React 19/TypeScript/Vite application. It uses React Router for the routes above, TanStack Query for remote data, Zustand for the small amount of cross-route UI/session state, i18next for Chinese and English, Dexie for local drafts, Lucide icons and ECharts for analysis. The layout puts the mailbox list at the center, with a collapsible navigation rail, a compact mailbox selector, floating composer, dedicated detail view, responsive mobile drawer, light/dark/system themes, and shared loading/empty/error/feedback components. Administration follows the same design system.

The build output is `mail-worker/dist`; the Worker continues to serve it. Wrangler's three build configurations and the Cloudflare workflow now watch/build `mail-react/`. The obsolete `mail-vue/` tree is removed. Start a local Worker with its existing bindings to test authenticated routes; `mail-react/README.md` contains build instructions.

## Verification boundaries

Static checks cover TypeScript, ESLint, production build, endpoint-path comparison against the Worker, and a visual smoke test of the login page at desktop and mobile widths. No D1/R2/KV credentials or seeded authenticated session were available in this workspace, so login, live mail, sending, administrative writes, and real attachment downloads need a staging Worker smoke test before production release. The user-facing personal search is limited to the current loaded page because the Worker exposes no personal search API; the application says so in the search panel. `read` is one-way because the Worker has no mark-unread endpoint. Deleted mail is only exposed through the administrator's global mail filter, because there is no personal trash API.
