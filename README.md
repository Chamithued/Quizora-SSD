# Quizora — SE4030 security testing and fixes

This README explains **F-01: authentication token remains valid after logout** and **F-02: missing frontend framing protection**, their original evidence, fixes and retest procedures. Other findings remain separate work.

## 0. Findings summary and how the ZAP evidence was assessed

**Current status:** two findings have implemented fixes: F-01 (token reuse after logout) and F-02 (missing framing protection). The original observations were manually confirmed. Automated/HTTP checks of the fixes passed, but final browser/ZAP screenshots against the restarted application are still pending. This is an interim record, not a claim that seven distinct vulnerabilities have been completed.

| Finding | How it was discovered | What was actually confirmed | Fix status |
| --- | --- | --- | --- |
| F-01 — Token remains usable after logout | Manual requests in ZAP Requester, supported by code review | The same token retrieved administrator statistics after successful logout; omitting the token was rejected | Persistent login sessions and server-side revocation implemented; regression tests pass |
| F-02 — Missing frontend framing protection | ZAP “Missing Anti-clickjacking Header” alert, then a browser iframe test | A separate-origin page displayed the authenticated dashboard inside an iframe | Frontend framing headers implemented and verified over HTTP; browser retest pending |

F-01 was **not automatically proven by ZAP's session-management alert**. ZAP let us capture and replay requests; the before/logout/after sequence demonstrated the defect. For F-02, the alert identified a possible weakness and the browser test confirmed that framing was allowed. No deceptive click or resulting unauthorized action was performed.

### Tested environment and scope

| Component | Original evidence | Current fix branch |
| --- | --- | --- |
| Repository/branch | Original vulnerable checkout used for screenshots | `Quizora-SSD`, branch `Aenuka-Zap-Fix` |
| React frontend | `http://localhost:3000` | `http://localhost:3000` after restart |
| Express API | `http://localhost:8090` | `http://localhost:5001` in this checkout's configuration |
| ZAP proxy | `http://127.0.0.1:8080`, ZAP 2.17.0 | Same proxy when collecting the retest |
| Separate-origin framing page | `http://localhost:9001` | Reuse unchanged for comparison |
| Temporary header validation | Not applicable | `http://127.0.0.1:3101`; stopped after checking |

Port 9001 served the tester's iframe page; it was not the API or a hijacked port. The configured database can be remote even when the frontend and backend addresses are localhost. Tests added by this fix use an isolated database substitute, not the configured application database.

### Testing steps completed so far

1. Checked that the frontend responded with HTTP 200. The backend root returned 404; this alone did not establish a vulnerability or a failed API.
2. Started ZAP, recorded its version, and proxied requests to both application origins.
3. Used Manual Explore to launch Firefox and log in. ZAP History captured the login and authenticated statistics requests.
4. Allowed passive scanning to inspect those requests/responses, then examined the Alerts tab.
5. Ran the traditional frontend Spider to 100%. Its recorded results included `/`, `/robots.txt`, `/manifest.json`, `/sitemap.xml`, `/static/js/bundle.js`, `/logo192.png` and `/favicon.ico`. A discovered URL alone does not prove a sensitive resource exists.
6. Started the AJAX Spider with a two-minute maximum. The supplied output confirms it started; no complete coverage report was supplied. Manual authenticated exploration was still necessary.
7. Inspected the WebSocket messages, HTML headers and body, and login/session-related alerts. Rejected or deferred findings where the evidence did not show a vulnerability.
8. Loaded the original iframe proof page and observed the authenticated dashboard rendered within it.
9. Used Requester to compare authenticated statistics before logout, successful logout, same-token replay and a missing-token control.
10. Applied the two scoped fixes and ran the checks documented below. **No completed active-scan result is recorded in the supplied evidence.**

### Full alert triage from the supplied ZAP screenshots

The screenshot showed 11 alert categories. These are not 11 confirmed vulnerabilities. Counts such as `(2)` or `(15)` are occurrences, not distinct vulnerability classes.

| ZAP alert | Displayed risk | Evidence and manual assessment | Disposition / action |
| --- | --- | --- | --- |
| Personally Identifiable Information via WebSocket | High | The digits `36002221222316` occurred inside the `data` value of a `type: hash` message alongside `hot` and `liveReload` messages. They were part of a development build hash, not demonstrated personal/payment data. | False positive for the captured instance. No PII remediation was made. Preserve the alert and full message context to explain rejection. |
| Content Security Policy (CSP) Header Not Set | Medium | Original frontend response had no CSP header, and the supplied original HTML had no CSP meta policy. This establishes missing protection in that version, not executable XSS. The current branch already contained a script-related meta policy before these fixes. | Record the original hardening gap separately. F-02 adds a framing-only CSP header; it does not establish a complete CSP/XSS remediation. A meta policy does not enforce frame-ancestors. |
| Cross-Domain Misconfiguration | Medium | Wildcard CORS appeared on frontend HTML and bundle responses. The captured API response allowed `http://localhost:3000` specifically. No unauthorized browser read of sensitive API data was demonstrated. | Unconfirmed security impact. Do not report API data theft from the frontend wildcard alone. No CORS change made. |
| Missing Anti-clickjacking Header | Medium | Original frontend lacked framing headers; the dashboard rendered inside the page on port 9001. | Confirmed framing weakness, F-02. Fixed in frontend response middleware; browser retest pending. |
| Server Leaks Information via “X-Powered-By” HTTP Response Header Field(s) | Low | Original frontend sent `X-Powered-By: Express`. This exposes framework identity. No exploit or exact framework version was established. | Confirmed low-impact disclosure observation; not remediated by these two fixes. Do not count each response as a new vulnerability. |
| Timestamp Disclosure — Unix (Systemic) | Low | Alert name visible, but the affected value and its context were not fully investigated in the supplied evidence. | Pending verification; ordinary timestamps are not automatically sensitive. No fix claimed. |
| X-Content-Type-Options Header Missing | Low | Original frontend response lacked `X-Content-Type-Options`. The captured API response already had `nosniff`. No MIME-confusion exploit was demonstrated. | Frontend hardening gap observed. Outside the two implemented fixes; no MIME-sniffing exploit claimed. |
| Authentication Request Identified | Informational | ZAP identified the login request's email/password fields. | Expected authentication traffic; not a vulnerability by itself. Never include the original password in public evidence. |
| Information Disclosure — Suspicious Comments | Informational | The supplied HTML comments were ordinary Create React App template instructions. Other flagged bundle comments were not all individually reviewed. | Supplied template comments do not demonstrate sensitive disclosure. Remaining instances need contextual review. |
| Modern Web Application | Informational | ZAP identified a JavaScript-driven application. | Application characteristic, not a vulnerability. Helps explain why traditional crawling was insufficient. |
| Session Management Response Identified | Informational | ZAP identified a token in the login response. | Expected behavior. The separate manual replay test established F-01; token issuance alone is not defective. |

XSS, injection, broken role/object access control and exposed sensitive quiz APIs have **not been confirmed by the evidence documented here**. Code-review candidates require controlled role/account tests and their own evidence before being counted or fixed. Do not label the informational alerts as extra findings to reach the assignment minimum.

### Evidence handling and report traceability

The screenshots were supplied in the testing conversation; this README does not embed or recreate them. Keep original ZAP sessions privately. Use redacted copies in the report, preserving method, URL, response code, relevant body and chronological order. Redact passwords, complete bearer tokens, cookies and environment secrets. To demonstrate same-token reuse in a report, consistently label the original token `TOKEN_A`; retain the original unredacted sequence privately.

Suggested evidence names below are filing labels, not claims that these files have been generated or copied into this repository:

| Suggested evidence name | Contents | Status |
| --- | --- | --- |
| `before-zap-alerts.png` | Original Alerts tree and alert details | Supplied screenshots |
| `before-frontend-response.png` | Frontend URL, headers and HTML from the original version | Supplied screenshot and response text |
| `before-ws-hash.png` | Full WebSocket hash message explaining PII false positive | Supplied screenshots |
| `before-framing-dashboard.png` | Port-9001 address bar and dashboard inside red iframe | Supplied screenshot |
| `before-stats-authorized.png` | Statistics request with TOKEN_A, HTTP 200 and data | Supplied screenshot |
| `before-logout-success.png` | Logout request with TOKEN_A and success response | Supplied screenshot |
| `before-replay-success.png` | Subsequent statistics request with TOKEN_A, HTTP 200 and data | Supplied screenshot |
| `before-no-token-control.txt` | Missing-token denial response | Supplied text; original status not separately recorded |
| `after-03-replay-rejected.png` | Same-token replay after logout rejected by fixed app | Pending live ZAP retest |
| `after-framing-headers.png` | Actual port-3000 response containing both framing headers | Pending live ZAP retest |
| `after-framing-blocked.png` / `after-framing-console.png` | Browser policy refusal for original iframe test | Pending live browser retest |


## 1. F-01: what happened before the logout fix

The authorized test used React on http://localhost:3000, Express on http://localhost:8090 and ZAP on http://127.0.0.1:8080. The configured database may be MongoDB Atlas: local HTTP endpoints do not make the database local.

An administrator logged in through Firefox launched by ZAP. We retained the same test token privately and performed:

| Sequence | Request | Original observed result |
| --- | --- | --- |
| 1 | GET /api/users/stats with the token | 200 and administrator statistics |
| 2 | POST /api/auth/logout with the same token | 200, “Logged out successfully” |
| 3 | GET /api/users/stats with that original token, without another login | 200 and administrator statistics again |
| 4 | GET /api/users/stats without Authorization | “Access denied. No token provided.” The final control status was not separately recorded. |

The third response proves logout did not invalidate the credential; the fourth establishes that access depended on a token.

**Impact:** someone already possessing a valid administrator token can keep using it after its owner logs out. The test did not demonstrate how an attacker obtains a token.

Classification: session invalidation weakness, associated with CWE-613. This is one vulnerability, not one per endpoint.

The previously generated interim PDF, Quizora-SE4030-Interim-Security-Report.pdf (E07–E10), preserves the original evidence. It is not included in this checkout. Keep your saved copy as a historical **before-fix** report, not evidence of a completed deployed retest.

### Sanitized original request sequence

These are minimal reproductions of the test, not exported raw requests. `TOKEN_A` is a placeholder for one and the same original login token. Do not paste the placeholder as an actual credential.

~~~http
GET http://localhost:8090/api/users/stats HTTP/1.1
Host: localhost:8090
Authorization: Bearer TOKEN_A
~~~

Observed: HTTP 200 with administrator statistics.

~~~http
POST http://localhost:8090/api/auth/logout HTTP/1.1
Host: localhost:8090
Authorization: Bearer TOKEN_A
Content-Length: 0
~~~

Observed: HTTP 200 with `{"success":true,"message":"Logged out successfully"}`.

Resending the first request unchanged returned HTTP 200 and statistics. Removing the entire Authorization header returned `{"message":"Access denied. No token provided."}`. The defect was failure to revoke an already issued credential, not a demonstrated ability to access this endpoint without authentication.

## 2. Why it happened

1. The original backend logout handler only returned success.
2. Authentication verified JWT signature/expiry and checked the active account, but had no session-revocation check.
3. Browser logout removed local storage without calling the server. Deleting one browser's copy cannot invalidate other copies.

The examined configuration used a seven-day JWT lifetime. We proved immediate post-logout reuse, not validity over an experimentally observed seven-day period.

## 3. How it is fixed

### Login creates a stored session

The new AuthSession model stores a random UUID session ID, the owning user and an expiration timestamp in MongoDB. The UUID is the signed JWT's jti claim. Raw bearer tokens are not stored.

Login signs an HS256 JWT and persists the session **before returning the token**. Separate logins have independent IDs, including logins during the same second. Session-creation failure does not produce a successful login/token response.

A TTL index eventually removes expired sessions. Authentication independently checks expiration and does not depend on TTL cleanup timing.

### Backend implementation sequence

1. `backend/models/AuthSession.js` defines `_id` (session UUID), `userId` and `expiresAt`, plus the TTL cleanup index.
2. In `backend/controllers/authController.js`, successful password verification is followed by generating a random UUID, signing a JWT containing that UUID as `jti`, and creating the corresponding session record.
3. In `backend/middleware/auth.js`, every protected request verifies the signature and expiration, then queries a matching unexpired session owned by the token's user. A valid signature alone is no longer sufficient.
4. The middleware attaches the verified session ID to `req.auth.sessionId` for the logout handler.
5. The logout handler deletes the matching session and waits for the database operation before returning success. A deletion/storage failure produces 503 instead of a false success.
6. Replaying the old signed token finds no active session and produces 401. Logging in again creates a different session and restores legitimate access.

### Every protected request checks the stored session

Authentication now requires:

1. A valid, unexpired HS256 signature.
2. Identity, session ID and expiration claims.
3. A stored session belonging to that user with a future expiration.
4. An existing, active user.
5. The existing route-specific role check.

Pre-fix tokens have no session ID and are intentionally rejected. Users must log in again after rollout. Session-storage failures deny access with 503.

### Logout deletes that session

Logout awaits deletion of the presented session before returning success. Subsequent requests with that token return **401** because the session no longer exists.

Session state is in MongoDB, rather than process memory, so backend restarts do not recreate revoked sessions and backend instances sharing the same database see the same state. Verify persistence against the actual database in the manual retest.

Other independent sessions remain active. Requests already authenticated before logout are not cancelled.

### Browser logout waits for the server

The frontend now calls POST /api/auth/logout before removing local storage or clearing React state. The layout redirects to login only after success. Network/server errors show a retry message rather than falsely reporting successful logout.

The shared API service already redirects on 401 for an invalid/expired session. This change introduces no refresh-token flow. Password-change/global revocation, XSS and quiz access-control defects are separate work.

## 4. Changed files

| File | Purpose |
| --- | --- |
| backend/models/AuthSession.js | Persistent session model and expiration index |
| backend/controllers/authController.js | Register login sessions and revoke on logout |
| backend/middleware/auth.js | Require active sessions; reject revoked/legacy tokens |
| frontend/src/services/logoutSession.mjs | Await revocation before local cleanup |
| frontend/src/context/AuthContext.js | Connect browser logout to server revocation |
| frontend/src/components/common/Layout.jsx | Show logout failures and allow retry |
| backend/tests/auth-session.test.js | Regression tests |
| backend/package.json | Run regression tests with npm test |
| frontend/src/setupProxy.js | F-02: attach framing protection to frontend HTTP responses |
| README.md | Evidence, alert triage, implementation and retest procedures |

Unrelated existing edits and environment files were not modified as part of this fix.

## 5. Run automated tests

~~~bash
cd /home/aenuin/SSD/Quizora-SSD/backend
npm test
~~~

Use Node.js 20 or later for the tests (validation environment: Node.js 24). No production dependency was added. If dependencies are missing, run npm ci in the backend directory first.

The tests exercise the real login/logout/profile routes on an ephemeral loopback port, real JWT signatures, real bcrypt comparison and Mongoose schema validation. A small statistics response fixture uses the production authentication and role middleware. Database operations are replaced with an isolated in-memory test store. The tests do not load .env, contact Atlas or alter application data.

**Validation result on Aenuka-Zap-Fix (28 September 2026): 11 tests passed, 0 failed.** The fixture intentionally logs storage errors when testing failure handling.

Validation was run directly in Quizora-SSD on Aenuka-Zap-Fix after applying the fix: all 11 backend regression tests passed, and npm run build in frontend completed with existing lint warnings (unused variables, hook dependencies and placeholder links). The build used the installed dependencies; a fresh npm ci was not tested. The focused git diff --check passed. Live ZAP/database verification remains pending.

Coverage:

- Baseline 200 → logout success → same-token replay 401.
- Missing-token denial and successful fresh login.
- Independent simultaneous sessions.
- Legacy, unknown, expired, tampered and wrong-algorithm token rejection.
- Session ownership and stored expiration.
- Existing inactive-account and role restrictions.
- Incorrect password and session-creation failures.
- Session lookup/deletion failures: fail closed without false logout success.
- Browser cleanup after server success; retained state if logout fails.

These tests do not prove actual MongoDB persistence/index creation or full browser UI behavior. Complete the following manual retest before reporting deployed verification as finished.

## 6. Start the corrected checkout

This checkout is on **Aenuka-Zap-Fix** at **/home/aenuin/SSD/Quizora-SSD**. Start both services from this folder. This branch currently configures the backend and frontend API client for **port 5001**; the original evidence used port 8090. The retest below uses 5001. Confirm the actual backend startup port before testing.

1. Preserve original ZAP sessions and screenshots.
2. Stop the old backend normally in its terminal.
3. Start the corrected backend:

~~~bash
cd /home/aenuin/SSD/Quizora-SSD/backend
npm start
~~~

4. Restart the frontend from the same checkout in another terminal:

~~~bash
cd /home/aenuin/SSD/Quizora-SSD/frontend
npm start
~~~

Run npm ci in the frontend directory first if dependencies are absent. Use your private environment configuration; do not publish database URIs, JWT secrets, passwords or tokens.

The database account needs create/read/delete access for authsessions documents. The model declares a TTL index; verify it exists if automatic index creation is disabled. Existing users need no data migration; existing tokens require fresh login.

The fix assumes a protected JWT signing secret. Rotate previously exposed secrets separately and document the rotation. Session revocation does not replace protecting credentials.

## 7. ZAP after-fix retest

Persist a **new after-fix session** in ZAP and launch Firefox through Manual Explore.

### A. Fresh login and baseline

1. Open http://localhost:3000 and log in again as the test administrator.
2. In History, find a fresh GET http://localhost:5001/api/users/stats.
3. Right-click → Open in Requester Tab → Send.
4. Expect 200 and statistics. Save after-01-stats-before-logout.png.
5. Keep this original Authorization header unchanged.

### B. Send logout

1. Open the same request in a second Requester tab.
2. Change only the first request line:

~~~http
POST http://localhost:5001/api/auth/logout HTTP/1.1
~~~

3. Keep the same token and Host header. Empty the body; use Content-Length: 0 if present.
4. Click Send. Expect 200 and the response below.
5. Save after-02-logout-success.png.

~~~json
{"success":true,"message":"Logged out successfully"}
~~~

### C. Replay the exact token

1. Return to the unchanged statistics Requester tab.
2. **Without another login**, click Send.
3. Expect **401**, with the response below.
4. Save after-03-replay-rejected.png.

~~~json
{"message":"Session expired or logged out."}
~~~

A 200 with statistics means the runtime test has failed. Check the running checkout/process and session database; do not mark it fixed based only on code changes.

### D. Control requests and browser logout

1. Send the statistics request without Authorization: expect 401.
2. Log in fresh: ordinary authorized access should work.
3. Capture a new authenticated request, then click Sign out in the app.
4. Confirm ZAP records POST /api/auth/logout.
5. Replay that captured pre-sign-out request: expect 401.
6. Save after-04-no-token.png, after-05-fresh-login.png and after-06-browser-logout.png.

### E. Persistence and failure handling

1. After logout, restart only the backend and replay the revoked token: expect 401.
2. Verify a separate active session still works.
3. In a controlled local check, temporarily make the backend unavailable and click Sign out. Expect an error instead of a successful redirect. Restore service and retry.
4. Do not disrupt a shared database to simulate faults; the isolated tests cover database failures.

Redact credentials in report copies. Preserve original requests/responses privately with timestamps showing the baseline → logout → replay order. Do not replace actual screenshots with simulated responses.

## 8. Before/after tracking

| Check | Before: observed | Fixed automated expectation | Live ZAP after-fix evidence |
| --- | --- | --- | --- |
| Authenticated statistics | 200 | 200 | Pending |
| Logout | 200 without revocation | 200 after session deletion | Pending |
| Original token after logout | 200: vulnerable | 401 | Pending |
| No Authorization | Missing-token rejection body | 401 | Pending |
| Fresh login | Not a failure case | New session works | Pending |
| Replay after backend restart | Not tested | Revoked session stays absent | Pending |
| Browser Sign out | Local cleanup only in code | Server revocation first | Pending |

Record actual statuses, timestamps and screenshots after the live retest. Automated results are not a substitute for the assignment's ZAP after-fix evidence.

## 9. Git documentation

The Quizora-SSD checkout was clean on branch Aenuka-Zap-Fix before this patch was applied. Review only the files listed in section 4 before staging. Avoid git add . because environment files, screenshots and unrelated work may be included.

Suggested focused commits:

1. **fix(auth): revoke persisted login sessions on logout** — model, controller and middleware.
2. **fix(frontend): await server logout and report failures** — helper, context and layout.
3. **test(auth): cover token replay and document remediation** — tests, test command and F-01 README sections.
4. **fix(frontend): block iframe embedding to prevent clickjacking** — setupProxy.js and F-02 README sections.

The README describes both fixes. If making separate commits, stage its relevant hunks with git add -p after the file is tracked, or keep shared documentation in a final documentation commit. Suggested messages are not completed commits.

Review git diff --cached --stat and git diff --cached before each commit. Record actual commit IDs and test output in the report. No new commits have been created by this implementation and no commit IDs are invented here.

## 10. Remaining assignment work

Seven distinct confirmed vulnerabilities have not yet been established. The interim report preserves the frontend CSP/framing findings and rejected WebSocket PII alert. Student-role verification of quiz passcode/debug disclosure and direct question access remains pending.

Preserve original evidence before modifying each additional issue. Do not count duplicate endpoints or informational alerts as separate vulnerabilities.

References:

- [OWASP: Logout Functionality](https://wstg.owasp.org/v4.2/4-Web_Application_Security_Testing/06-Session_Management_Testing/06-Testing_for_Logout_Functionality/)
- [ZAP Requester tab](https://www.zaproxy.org/docs/desktop/addons/requester/tab/)
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- [Mongoose schema indexes](https://mongoosejs.com/docs/8.x/docs/guide.html#indexes)

## 11. F-02: frontend framing protection (clickjacking)

### Original evidence and impact

The test page at http://localhost:9001 embedded http://localhost:3000 in an iframe. The saved browser screenshot shows the authenticated administrator dashboard inside the red frame. ZAP captured the frontend HTML response without X-Frame-Options or a CSP frame-ancestors directive.

This confirms that a separate origin could frame the authenticated interface, a prerequisite for clickjacking (CWE-1021). A deceptive overlay or unauthorized action was not demonstrated. Ports 9001 and 3000 make these different origins even though both use localhost. This is not port hijacking.

### Root cause and change

The React development server serves the HTML separately from Express. Security headers on backend API responses do not protect frontend documents. The existing CSP meta tag controls scripts but cannot enforce frame-ancestors.

`frontend/src/setupProxy.js` uses Create React App's server-side middleware hook to add these response headers before frontend files or SPA fallback routes are served:

~~~http
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
~~~

The fix assumes Quizora does not need to be embedded in an iframe; all framing, including same-origin framing, is blocked. If an embedding workflow is introduced, its permitted origins must be explicitly designed and tested. Opening Quizora directly remains supported. The existing script policy in public/index.html remains in place; both policies apply. No client-side frame-breaking JavaScript is needed.

### Restart and retest using the original evidence page

1. Stop the running frontend with Ctrl+C in its terminal. The server-side hook requires a full restart.
2. From this branch, start it again:

~~~bash
cd ~/SSD/Quizora-SSD/frontend
npm start
~~~

3. In the ZAP-launched browser, open http://localhost:3000 directly and reload without cache. Confirm the application still loads and log in with a test account.
4. In ZAP History, select the new GET http://localhost:3000/ and inspect Response. Save a screenshot showing the URL, status and both framing headers as `after-framing-headers.png`.
5. Keep the original test page unchanged. If its server has stopped, restart it in another terminal:

~~~bash
python3 -m http.server 9001 --bind 127.0.0.1 --directory "$HOME/zap-evidence/framing-test"
~~~

6. Open http://localhost:9001 in the same browser and reload without cache. The iframe should no longer display Quizora. Firefox may show a blocked-page notice. Check the browser console for a frame-ancestors/X-Frame-Options refusal, rather than treating any blank frame as success.
7. Save `after-framing-blocked.png` with the address bar and iframe visible, and `after-framing-console.png` showing the policy refusal. Compare against the original screenshot of the embedded administrator dashboard.
8. Visit a normal frontend route directly and confirm navigation still works. An iframe HTTP request can return 200 even when the browser correctly refuses to display it.

| Check | Before | After |
| --- | --- | --- |
| Frontend framing headers | Absent in original capture | Verified on /, /login and /admin/dashboard: 200 with both headers |
| Authenticated dashboard in localhost:9001 iframe | Visible | Browser/ZAP retest pending |
| Direct frontend navigation | Worked | Browser retest pending |

### HTTP validation performed

On 28 September 2026, the real CRA frontend was started temporarily at 127.0.0.1:3101. Requests to `/`, `/login` and `/admin/dashboard` returned 200, React HTML, `Content-Security-Policy: frame-ancestors 'none'` and `X-Frame-Options: DENY`. The temporary process was stopped after verification.

CRA 5's normal startup failed when explicitly bound to loopback because its allowedHosts value was undefined. The isolated validation launcher supplied `localhost` to its existing dev-server config factory; host checks stayed enabled. No installed dependency or application startup script was changed. Restart the normal app and collect the actual port-3000 browser/ZAP evidence separately.

### Deployment boundary

This hook protects `npm start` (the CRA development server). `npm run build` creates static files and cannot attach HTTP headers. When deploying that build, configure the server hosting the frontend to send the same two headers on HTML and SPA fallback responses. For example, if deploying with Nginx, add the following to the frontend server block:

~~~nginx
add_header Content-Security-Policy "frame-ancestors 'none'" always;
add_header X-Frame-Options "DENY" always;
~~~

If that server already defines a CSP, add frame-ancestors to its existing policy. Check location-level header overrides and verify actual deployed responses. Production server configuration has not been deployed or tested here.

Commit this finding separately from F-01: stage `frontend/src/setupProxy.js` and the corresponding README documentation, review the staged diff, then use `fix(frontend): block iframe embedding to prevent clickjacking`. Do not stage secrets or the private ZAP session.

References:

- [MDN: CSP frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)
- [Create React App: server middleware hook](https://create-react-app.dev/docs/proxying-api-requests-in-development/)
