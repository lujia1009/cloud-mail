# OAuth callback and first-time account setup

## Deployment

Before enabling this build, add the following authorized redirect URI to the Google OAuth Web client used by this installation:

`https://mail.virevan.com/auth/google/callback`

For another hostname, use that origin with `/auth/google/callback`. Keep the existing `/login` URI during rollout. Google requires an exact redirect URI match. Deploy the React app and Worker together: account setup now requires a signed setup token returned by the updated Worker.

GitHub and LinuxDo retain their existing `/login` redirect URI. The route dispatches their callback to the same dedicated callback component; it never renders the setup form inside the login page.

## Flow

- Login creates a random OAuth state saved in sessionStorage.
- Callback validates state and exchanges the authorization code once.
- Existing accounts receive the normal login token and enter `/inbox`.
- New accounts receive a 15-minute, purpose-scoped setup proof, stored in sessionStorage (never in the URL or mail-session token slot), and enter `/setup-account`.
- Setup preserves the configured domains, prefix restrictions and registration-key policy. OAuth's existing captcha/registration policy is unchanged.
- The Worker verifies the proof, provider and identity before registering/binding. Successful setup creates the mail session, clears setup state and enters `/inbox`.
- Refresh preserves an unexpired setup session. Missing/expired sessions show a clear return-to-login action; cancelling authorization or invalid state shows a callback error.

Local checks: `node --test mail-worker/scripts/oauth-setup.test.mjs`, React build/lint, and browser fixtures for new/existing users, refresh, invalid callback, setup submission and responsive layout. A real Google round trip additionally requires the configured OAuth client and the authorized redirect URI above.
