# TODO

## Login cookie / auth fix
- [ ] Identify the cause of login form access/redirect issue (symptom A: login page not accessible / immediate route failure).
- [x] Update server cookie settings in `server/authCookies.ts` to be environment-safe.
- [x] Adjust backend cookie clear settings to match new cookie options.
- [ ] Fix cookie `secure` logic to depend on actual request protocol (not only NODE_ENV), so cookies are accepted/replayed correctly behind HTTPS proxies.

- [ ] Re-run frontend login flow and confirm:
  - [ ] login page renders
  - [ ] after successful login, cookie is set
  - [ ] TRPC `auth.me` returns authenticated user
- [ ] If still failing, inspect client API base URL for GET /login calls (web vs capacitor) and update if necessary.

