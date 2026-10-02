# OAuth callback and first-time account setup

## Deployment

Before enabling this build, configure each OAuth application with its dedicated callback URL. Replace the hostname below with this installation's actual origin:

| Provider | Authorized redirect URI / callback URL |
| --- | --- |
| Google | `https://mail.virevan.com/auth/google/callback` |
| GitHub | `https://mail.virevan.com/auth/github/callback` |
| LinuxDo | `https://mail.virevan.com/auth/linuxdo/callback` |

Remove the former login-page redirect URI from the provider configuration. Authorization and code exchange use the exact same callback URL; old pending login requests must be restarted after upgrading. Deploy the React app and Worker together: account setup requires a signed setup token returned by the Worker.

## Flow

- `src/utils/oauth.ts` creates the provider's authorization URL and a random OAuth state saved with provider/redirectUri in sessionStorage. The Google account-switch action uses the same helper with `prompt=select_account`.
- All three `/auth/:provider/callback` routes use one `OAuthCallbackPage`; the login route only renders the login form. Callback validates the route provider, state and exact dedicated redirect URI before exchanging the authorization code once.
- Existing accounts receive the normal login token and enter `/inbox`.
- New accounts receive a 15-minute, purpose-scoped setup proof, stored in sessionStorage (never in the URL or mail-session token slot), and enter `/setup-account`.
- Setup preserves the configured domains, prefix restrictions and registration-key policy. OAuth's existing captcha/registration policy is unchanged.
- The Worker verifies the proof, provider and identity before registering/binding. Successful setup creates the mail session, clears setup state and enters `/inbox`.
- Refresh preserves an unexpired setup session. Missing/expired sessions show a clear return-to-login action; cancelling authorization or invalid state shows a callback error.

Local checks: `node --test mail-react/scripts/oauth-callback.test.mjs mail-worker/scripts/oauth-setup.test.mjs`, React build/lint, and browser fixtures for new/existing users, refresh, invalid callback, setup submission and responsive layout. A real provider round trip additionally requires the configured OAuth application and its callback URL above.
