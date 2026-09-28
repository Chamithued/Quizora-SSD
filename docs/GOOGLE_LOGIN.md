# Google login and registration — SE4030

Quizora implements **OAuth 2.0 Authorization Code grant with PKCE (S256), using OpenID Connect for authentication**. Google proves identity; Quizora assigns permissions. All new Google registrations, including administrator requests, require approval by an existing administrator.

## Google Cloud setup

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create/select a project such as `Quizora SSD`.
2. Open **Google Auth Platform → Branding**. Configure the app name, support email and developer contact email.
3. Under **Audience**, choose **External** for personal Google accounts. Add your group's Google accounts under **Test users** if required by your project's Testing configuration. Internal audience is limited to your Workspace organization.
4. Under **Data Access**, request only `openid` and `email`. No Gmail, Drive, refresh tokens or offline access are needed.
5. Under **Clients**, create an OAuth client of type **Web application**.
6. Register this exact **Authorized redirect URI**:

   ```text
   http://localhost:5001/api/auth/google/callback
   ```

7. Copy the client ID and secret into the backend environment. No Google secret belongs in React. This server redirect flow does not require an authorized JavaScript origin.

See Google's [OIDC setup and validation guide](https://developers.google.com/identity/openid-connect/openid-connect). Redirect URI scheme, host, port and path must match exactly.

## Environment and startup

Use Node.js 20+ and a running MongoDB instance. Keep your current database, JWT and default-admin settings. Merge these entries into `backend/.env`:

```dotenv
GOOGLE_CLIENT_ID=PASTE_CLIENT_ID_FROM_GOOGLE_CONSOLE
GOOGLE_CLIENT_SECRET=PASTE_CLIENT_SECRET_FROM_GOOGLE_CONSOLE
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback
GOOGLE_FRONTEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

`GOOGLE_FRONTEND_URL` is one exact origin without a path. The existing CORS setting `FRONTEND_URL` must include it. Keep a strong `JWT_SECRET`. The example files contain placeholders, not working credentials.

In `frontend/.env`:

```dotenv
REACT_APP_API_URL=http://localhost:5001/api
```

Run in separate terminals, from the repository root:

```sh
cd backend
npm install
npm run dev
```

```sh
cd frontend
npm install
npm start
```

Open `http://localhost:3000/login`. Restart servers after environment changes. Google controls remain disabled until backend credentials and `JWT_SECRET` are configured.

**Secret handling:** both `.env` files were already tracked in this checkout. `.gitignore` does not protect tracked files. Before saving new credentials, remove them from tracking, preserving local copies:

```sh
git rm --cached backend/.env frontend/.env
```

Commit that removal and the ignore rules. Never commit the client secret, database password, JWT secret or real account passwords. Rotate any secrets already exposed in history; untracking cannot remove old copies. This implementation leaves your existing `.env` values untouched.

## First administrator and existing accounts

The existing default administrator provisioned by `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` is the bootstrap approver. Sign in with that password first. Do not grant administrative access to arbitrary Google users or make the first public Google registration an administrator.

An existing Quizora user can choose **Connect Google to my account (first time)**, prove their Quizora email/password, then select a Google account. Later they use **Continue with Google**. Their current role/approval is preserved. Google email may differ from Quizora email because ownership of both accounts was proven. Matching email alone never links accounts.

## New Google registration and approval

1. Choose **New to Quizora? Sign up with Google**.
2. Enter first name, last name and requested role: student, lecturer or administrator.
3. Complete Google's account selection. Google supplies the verified email and stable identity.
4. Quizora creates a `pending` account and shows **Waiting for administrator approval**. Requested role is only a request; it does not grant privileges.
5. An approved administrator opens **Users → Pending Google registrations → Review & approve**.
6. Verify the person's name and requested role. For students, choose degree, year and semester. Select **Approve registration**. The server records approver and approval time.
7. The pending page checks every 30 seconds; the user can also click **Check approval status**. Once approved, their appropriate dashboard opens. Future Google logins go directly there.

Administrators can reject requests; those users see a declined-registration page. Pending/rejected users can retrieve their own profile and sign out, but all application APIs reject their sessions. Registration and login cannot self-approve an account. Repeat registration with the same Google identity reuses the existing account and preserves its status. An existing local email requires explicit password-based linking instead of creating a duplicate account.

## Flow for report and viva

```mermaid
sequenceDiagram
    participant B as Browser
    participant Q as Quizora API
    participant D as MongoDB
    participant G as Google
    B->>Q: POST google/start, signup, or link
    Q->>D: Store state hash, browser hash, nonce, PKCE verifier (10 min)
    Q-->>B: HttpOnly browser cookie + authorization URL
    B->>G: response_type=code, openid email, state, nonce, S256 challenge
    G-->>B: Redirect to API callback with code and state
    B->>Q: Callback + browser cookie
    Q->>D: Atomically consume matching unexpired transaction
    Q->>G: Exchange code + verifier + client credentials
    G-->>Q: ID token and access token
    Q->>Q: Verify ID token, nonce and account
    Q->>D: Create pending user for new signup; store one-use completion (60 sec)
    Q-->>B: HttpOnly completion cookie; redirect /login?google=complete
    B->>Q: POST google/complete
    Q-->>B: Quizora JWT + user and approval status
    B->>B: Pending page or approved role dashboard
```

- **OAuth grant:** the server exchanges an authorization code; its client secret never goes to React.
- **OIDC:** the `openid` scope requests an ID token for authentication. A Google access token is not a Quizora session.
- **PKCE:** S256 binds code redemption to the stored verifier.
- **State/browser binding:** prevents forged callbacks and login CSRF. State alone is insufficient without the initiating-browser cookie.
- **Nonce and validation:** the Google library checks signature, issuer, audience and lifetime. Quizora checks nonce, verified email, subject and authorized party when present.
- **Replay/expiry:** MongoDB atomically consumes transactions, with explicit expiry checks independent of delayed TTL cleanup.
- **Identity linking:** stable `sub`, unique sparse index and proof of both accounts prevent email-only takeover.
- **Approval:** pending/rejected status is enforced on the backend for every protected application route, not only by React. Only approved admins can review requests, assign roles and approve them.
- **Redirect safety:** fixed frontend destination, no tokens in redirect URLs, origin checks on POSTs, no-store responses, HttpOnly/SameSite cookies. Google tokens are not stored.

Main files: `backend/controllers/googleAuthController.js`, `backend/controllers/approvalController.js`, `backend/middleware/auth.js`, `backend/models/User.js`, `backend/models/OAuthTransaction.js`, `frontend/src/pages/LoginPage.jsx`, `frontend/src/pages/PendingApprovalPage.jsx`, `frontend/src/components/admin/PendingApprovals.jsx`, `frontend/src/context/AuthContext.js`.

## Validation and video demonstration

```sh
cd backend
npm test
```

```sh
cd frontend
CI=true npm test -- --watchAll=false --runInBand
npm run build
```

Backend tests use database substitutes and locally signed RSA tokens with the real Google token verifier. They do not contact Google or validate a live MongoDB deployment. Run the following real-account scenarios after configuring Google:

Implementation validation: 25 backend tests and 15 frontend tests pass. The frontend production build succeeds with existing lint warnings elsewhere in the application. Live Google/MongoDB end-to-end sign-in remains to be tested with your configured credentials.

| Scenario | Expected result |
| --- | --- |
| New student/lecturer/admin request | Pending page; no dashboard/API access |
| Admin approves student with academic details | Student dashboard after status refresh |
| Admin approves lecturer | Lecturer dashboard |
| Pending user calls approval API | HTTP 403 |
| Reject a registration | Declined page, no application access |
| Repeat signup while pending/rejected | Same status, no new user or approval bypass |
| Existing user connects Google with correct password | Existing role retained |
| Wrong password when connecting | Rejected before Google redirect |
| Matching local email without connecting | Explicit connection required |
| Cancel consent / replay callback / deactivate user | Login denied with recoverable error |
| Password login | Still works for accounts with a password |

For your video, show Google registration, the pending page, failed direct access, admin approval, approved login, logout/login again and the code checks. Redact credentials, cookies, tokens and authorization codes. Describe this as the OAuth/OIDC assignment feature; it does not itself satisfy the separate seven-vulnerability requirement.

## Deployment and known limitations

- Use HTTPS in production; production HTTP URLs are rejected and HTTPS callbacks use Secure cookies.
- Frontend and API must be on the same site (e.g. `app.example.com` and `api.example.com`) or behind one origin. Cross-site hosting is not supported by SameSite=Lax cookies. Use `localhost` consistently in development.
- Mongoose creates indexes by default. If deployment disables `autoIndex`, create the unique sparse `users.googleId` index and TTL `oauthtransactions.expiresAt` index before enabling Google. One Google identity must not belong to multiple users.
- One in-progress Google flow per browser is supported; a new attempt replaces its cookie.
- Existing users retain default `approved` status for compatibility. All new public Google signups explicitly set `pending`, even admin requests. Existing admin-provisioned accounts are trusted as before.
- Approval queue shows up to 100 oldest requests; approve/reject and refresh to process the next batch.
- Passwordless Google accounts do not support password login until an admin explicitly sets a password. Self-service unlinking/replacement and rejected-account appeals are not implemented; contact the administrator.
- The existing application JWT remains in `localStorage` (XSS exposure). Existing logout removes the local token without server revocation or Google logout. A full session-storage/revocation migration is separate work.
- Existing exposed demo credentials, tracked secrets, dependency vulnerabilities and other legacy security issues need separate assessment. This feature does not fix them.
- Rate limits are process-local; multiple backend instances require a shared limiter store and correct trusted-proxy configuration.

Troubleshooting: `redirect_uri_mismatch` means callback URLs differ. Disabled Google controls indicate missing configuration or an unavailable API. Invalid-state/completion errors may mean expiry, blocked cookies, mixed hostnames or multiple flows. Origin errors mean `GOOGLE_FRONTEND_URL` differs from the browser origin. Google access restrictions may require audience/test-user changes.

## Assignment commit history

Review changes and exclude secrets. Suggested commits, split by actual files:

1. `feat(auth): add Google OIDC code flow with PKCE and explicit account linking`
2. `feat(registration): require admin approval for new Google accounts`
3. `feat(ui): add Google signup, pending status and administrator review`
4. `test(auth): cover token validation, replay and approval restrictions`
5. `docs(auth): document Google setup and assignment demonstration`

Keep original-project attribution and baseline commit. Record actual member contributions; do not fabricate history or vulnerability findings.

References: [Google OIDC](https://developers.google.com/identity/openid-connect/openid-connect), [Google server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Google Node PKCE example](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/oauth2-codeVerifier.js).
