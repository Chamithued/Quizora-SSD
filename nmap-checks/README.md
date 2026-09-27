# SE4030 — Nmap checks

## Outcome

These checks identified the application's local TCP listeners, HTTP behavior, and configuration concerns. **No exploitable vulnerability was confirmed by this Nmap evidence.** This does not mean the application is secure, and these results do not satisfy the assignment's requirement for seven distinct, validated vulnerabilities.

Confirmed observations include Express framework disclosure on the frontend, permissive frontend CORS responses, and differences in security headers between response types. Their security impact needs further validation. No security fixes or post-fix retests were performed during this workflow.

## Scope and environment

- Authorized local MERN application running inside the user's Kali Linux VM.
- Tool: Nmap 7.99; preliminary socket inventory with `ss`.
- Scan date: 2026-09-27. Retained Nmap results span approximately 03:24–03:32 EDT (UTC−04:00).
- Only scan targets: IPv4 loopback `127.0.0.1` and IPv6 loopback `::1`.
- Expected frontend: TCP 3000. Configured Express backend: TCP 8090.
- Repository configuration inspected during the session used a remote `mongodb+srv://` database connection. That remote database was not scanned; connection strings and credentials are not reproduced here.
- No external hosts or network ranges were scanned. No brute-force, denial-of-service, exploit, or write/delete HTTP tests were performed. The CORS script sent OPTIONS requests about methods; it did not execute those methods.

## Evidence inventory

| File | Check | Observed result |
| --- | --- | --- |
| [00 — listeners](se4030-00-original-listeners.txt) | `ss` TCP listener inventory | Header only. Inconclusive given subsequent open ports; do not use this as proof that services were absent throughout testing. |
| [01 — application ports](se4030-01-original-app-ports.txt) | Targeted TCP connection scan | Ports 3000 and 8090 open on IPv4 localhost. |
| [02 — services](se4030-02-original-services.txt) | Light service/version detection | Port 3000 identified as HTTP / Node.js (Express middleware). Port 8090 returned HTTP 404 and security headers but was not identified reliably by Nmap. No exact software version disclosed. |
| [03 — HTTP headers](se4030-03-original-http-headers.txt) | Headers at `/` | Frontend HEAD response disclosed Express and wildcard CORS headers; backend GET response included security headers. |
| [04 — all IPv4 TCP ports](se4030-04-original-all-tcp.txt) | TCP ports 1–65535 on `127.0.0.1` | Only 3000 and 8090 open; 65,533 ports closed. |
| [05 — all IPv6 TCP ports](se4030-05-original-ipv6-tcp.txt) | TCP ports 1–65535 on `::1` | Only 8090 open; 65,534 ports closed. |
| [06 — HTTP methods](se4030-06-original-http-methods.txt) | Method discovery at `/` | Both services reported GET, HEAD, POST, OPTIONS. No method vulnerability established. |
| [07 — frontend CORS](se4030-07-original-frontend-cors.txt) | OPTIONS requests with origin `http://127.0.0.1:9999` | HTTP 204; wildcard allowed origin; credentials flag; methods HEAD, GET, POST, PUT, DELETE, PATCH reported. |
| [08 — backend CORS](se4030-08-original-backend-cors.txt) | Same origin tested directly on 8090 | HTTP 204 and credentials/method headers, but no Access-Control-Allow-Origin in the recorded responses. No CORS access granted to that test origin by these responses. |

The origin containing port 9999 was a request-header value, not a scan destination. No server was required on that port.

## Findings and interpretation

### Local ports and MongoDB

Only the expected application ports were found. TCP 27017 was closed on both loopback addresses. There is no evidence here of an unexpected TCP listener, an unnecessary open port, or MongoDB exposed on its default local port. Services on other interfaces and the configured remote database were not assessed. A custom-port database behind another service cannot be ruled out solely from port numbers.

An open loopback port does not establish LAN or Internet exposure. The backend responding over both IPv4 and IPv6 is not itself a vulnerability. Nmap's `ppp` and `opsmessaging` labels in basic scans are port-table names, not proof that those protocols are running.

### Frontend framework disclosure — confirmed observation

Evidence 03 and 07 contain `X-Powered-By: Express` on port 3000. This reveals a framework name, usually an informational or low-severity hardening concern. It does not identify an exact Express version or establish a vulnerable dependency. A React development server may use Express internally.

### Frontend CORS — configuration concern, impact unconfirmed

Evidence 07 contains the following response headers for the test origin:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
```

Wildcard origins permit noncredentialed CORS access when the other browser requirements are met. They do not allow credentialed browser CORS access: browsers reject wildcard origins with credentialed requests. Therefore this evidence does not prove authenticated data theft, authorization bypass, or CSRF.

Advertising PUT, PATCH, and DELETE in a preflight response does not prove those routes exist or permit unauthorized modifications. These are not separate vulnerabilities. Reading public frontend HTML across origins alone does not demonstrate sensitive-data exposure.

The frontend OPTIONS response contains backend-like security headers, while the earlier frontend HEAD response does not. Different middleware or development-proxy handling is a hypothesis requiring code review; it has not been confirmed by these scans.

### Frontend security headers — response-specific gaps

The HEAD response in evidence 03 lacks a CSP header, X-Frame-Options, and X-Content-Type-Options. The OPTIONS responses in evidence 07 include them. Consequently, do not claim these headers are absent from every frontend response or present on the rendered page based on the preflight alone. A normal browser GET and functional validation are needed before reporting clickjacking, XSS, or MIME-sniffing impact. Missing CSP alone does not establish XSS.

### Backend CORS and security headers

Evidence 08 shows no Access-Control-Allow-Origin for the tested origin. Its HTTP 204 status and Access-Control-Allow-Credentials header alone do not grant browser cross-origin access. This is a negative result for this origin and path, not proof that every origin and API route is safe. The raw responses, rather than merely the missing Nmap script summary, support this conclusion.

Evidence 03 and 08 show CSP, framing restrictions, and `nosniff`. These are existing controls, not fixes introduced during this assessment. `X-XSS-Protection: 0` disables a deprecated browser filter and is not evidence of an XSS vulnerability. A Strict-Transport-Security header on an HTTP response is not evidence that HTTPS is configured. Rate-limit headers do not prove effective enforcement; no load test was performed.

## Commands executed

This is a historical command record, not a batch to rerun. Commands were run individually from the repository root. Their original output paths are retained below for accuracy; the files have since been moved into this folder. Future retests should use new filenames to avoid overwriting evidence.

```bash
ss -ltnp | tee se4030-00-original-listeners.txt
nmap -sT -Pn -n -p 3000,8090 --reason -oN se4030-01-original-app-ports.txt 127.0.0.1
nmap -sT -Pn -n -sV --version-light -p 3000,8090 --reason -oN se4030-02-original-services.txt 127.0.0.1
nmap -sT -Pn -n -p 3000,8090 --script "+http-headers" --reason -oN se4030-03-original-http-headers.txt 127.0.0.1
nmap -sT -Pn -n -p- --reason -oN se4030-04-original-all-tcp.txt 127.0.0.1
nmap -6 -sT -Pn -n -p- --reason -oN se4030-05-original-ipv6-tcp.txt ::1
nmap -sT -Pn -n -p 3000,8090 --script "+http-methods" -v --reason -oN se4030-06-original-http-methods.txt 127.0.0.1
nmap -sT -Pn -n -p 3000 --script "+http-cors" --script-args 'http-cors.origin=http://127.0.0.1:9999' --script-trace --reason 127.0.0.1 2>&1 | tee se4030-07-original-frontend-cors.txt
nmap -sT -Pn -n -p 8090 --script "+http-cors" --script-args 'http-cors.origin=http://127.0.0.1:9999' --script-trace --reason 127.0.0.1 2>&1 | tee se4030-08-original-backend-cors.txt
```

| Option | Purpose |
| --- | --- |
| `-sT` | TCP connect scan. |
| `-Pn` | Skip host discovery; the “user-set” host status is not an independent discovery result. |
| `-n` | Disable DNS lookups. |
| `-p` / `-p-` | Select listed ports / TCP ports 1–65535. |
| `-6` | Use IPv6. |
| `-sV --version-light` | Probe service identity using reduced-intensity version detection. |
| `--script +NAME` | Run the named script even when the usual service-selection rule would skip the port. |
| `--script-args` | Supply script parameters, such as the CORS origin header. |
| `--script-trace` | Print script requests and responses. |
| `-v` / `--reason` | Additional detail / reasons for port states. |
| `-oN` | Save normal Nmap output. |
| `2>&1 \| tee FILE` | Display and save stdout and stderr, including the script trace. |

## Evidence preservation and limitations

- All nine existing text files were moved without content changes. SHA-256 values were compared before and after the move. [SHA256SUMS](SHA256SUMS) records their hashes at organization time; it does not authenticate their original collection.
- Earlier commands reused output filenames. The retained 01 and 02 files contain the 03:24 scans, not all earlier attempts. Conversation output included a 03:21 scan with both ports closed. That was a different runtime state, not a security fix or retest.
- The initial header-only `ss` output is inconclusive. Service timing or execution restrictions could explain the discrepancy; the cause was not established.
- Screenshots were requested during testing, but none were present among the files organized here. Add any original screenshots separately without replacing text evidence.
- TCP loopback results do not assess UDP, other interfaces, firewall reachability from other machines, or the remote MongoDB deployment.
- HTTP checks concentrated on `/`. Authentication, object/role authorization, injection, uploads, token/session handling, sensitive API responses, and browser exploitability were not validated.
- Findings on a development server must be distinguished from production deployment behavior. Do not inflate configuration observations into seven distinct vulnerabilities.

## Next phase, fixes, and Git status

Nmap reconnaissance is paused. A web-application assessment and source review are needed to investigate authenticated API behavior and establish concrete impact. No additional tool or scan was started while organizing these files.

For each later validated issue, record its affected route/component, reproducible original evidence, impact, root cause, fix, and the same test after the fix. Give each independent fix a detailed commit explaining the before/after behavior and validation. Do not label service startup or shutdown as remediation.

The evidence is packaged separately from application changes on branch `Aenuka-Nmap`, with the documentation commit titled `docs(se4030): preserve localhost Nmap reconnaissance evidence`. It preserves nine original outputs and documents findings and limitations; it does not represent an application security fix. Existing unresolved conflicts were present in `backend/.env` and `frontend/package-lock.json`, alongside other existing changes. Those changes are excluded from the evidence commit and left untouched. Environment secrets must not be added to this evidence folder.

## References

- [Nmap reference guide](https://nmap.org/book/man.html)
- [HTTP headers script](https://nmap.org/nsedoc/scripts/http-headers.html)
- [HTTP methods script](https://nmap.org/nsedoc/scripts/http-methods.html)
- [HTTP CORS script](https://nmap.org/nsedoc/scripts/http-cors.html)
- [CORS script source and summary limitations](https://svn.nmap.org/nmap/scripts/http-cors.nse)
- [MDN: wildcard origins and credentialed CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors/CORSNotSupportingCredentials)
- [MDN: deprecated X-XSS-Protection](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection)
