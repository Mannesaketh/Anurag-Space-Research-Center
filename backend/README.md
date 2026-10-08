# Anurag Space Research Center backend

Spring Boot 3.5, Java 21, Spring Security, PostgreSQL, JDBC, and Flyway. The full-stack Docker image serves the React application and its `/api` from the same origin. The existing static preview still does not host Java or PostgreSQL.

## Local development

1. Install Docker with Compose, or Java 21 and Maven 3.9 plus a running PostgreSQL instance.
2. Copy `backend/.env.example` to `backend/.env`. Set a strong `DATABASE_PASSWORD`, a random `JWT_SECRET` of at least 32 bytes, and your actual university email as `DEVELOPER_EMAIL`. Generate a signing secret using `openssl rand -base64 48`. Do not commit credentials.
3. From the project root, run `docker compose --env-file backend/.env -f backend/compose.yml up --build -d`. Open **http://localhost:8080** for the complete application, including Google sign-in. The image builds React with `VITE_API_URL=/api`; no frontend environment file is needed for this full-stack deployment. PostgreSQL is private to the Compose network, and data persists in the `research-data` volume.
4. For a separate Vite development frontend only, copy the root `.env.example` to `.env.local`, set `VITE_API_URL=http://localhost:8080/api`, and restart Vite. Change `FRONTEND_URL` and `ALLOWED_ORIGINS` in `backend/.env` to the exact Vite origin (usually `http://localhost:3000`) and recreate the API container. Keep the defaults at `http://localhost:8080` when using the Docker-served application.
5. Register the developer email in the app. In local development only, view its verification email at `http://localhost:8025` (Mailpit), open the verification link, verify, and sign in. Complete the profile. The developer can now grant admin access using the access-management screen.

Mailpit is a local test mailbox, not real university-email delivery. Never use it as proof of ownership in a public deployment. Production needs your organisation’s SMTP service.

Check local services with `docker compose --env-file backend/.env -f backend/compose.yml ps` and `curl http://localhost:8080/actuator/health`. Check public Google configuration at `http://localhost:8080/api/auth/providers`. Stop services with `docker compose --env-file backend/.env -f backend/compose.yml down`; do not add `-v` unless you intend to erase the database.

When `VITE_API_URL` is omitted, the frontend checks the same-origin `/api/auth/providers` endpoint once before opening sign-in. It enables the connection only for a successful JSON response with the application's identity marker and Google-provider configuration. HTML fallbacks, unrelated APIs, network failures, and timeouts do not enable authentication. Public privacy/terms pages do not trigger discovery. You can recheck a newly started backend using **Check sign-in connection**. The full-stack Docker build still explicitly sets `VITE_API_URL=/api`.

Without a connected backend, the frontend shows sign-in but keeps the entire workspace locked. There are no unauthenticated preview/onboarding entry points or browser role selectors. With a connected backend, it requires a server-issued authenticated session and loads server data rather than sample records. An unreachable API does **not** silently fall back to demo authentication. After verified sign-in, students complete their profile before accessing the workspace; admin/developer permissions come only from the backend. Automatic discovery does not deploy a backend or authorize a Google Cloud origin.

### Running without Docker

Export `DATABASE_URL` (a JDBC PostgreSQL URL), `DATABASE_USER`, `DATABASE_PASSWORD`, `JWT_SECRET`, `DEVELOPER_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM`, `FRONTEND_URL`, and `ALLOWED_ORIGINS` in your shell or deployment secret manager. For local HTTP only, set `COOKIE_SECURE=false`.

```sh
cd backend
mvn spring-boot:run
```

For SMTP authentication/TLS, configure `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_AUTH=true`, and `SMTP_STARTTLS=true` as appropriate for your provider. Do not put SMTP or database credentials in any `VITE_*` variable.

## Hosted setup with Render

The root `render.yaml` is an optional deployment blueprint for the full-stack application and managed PostgreSQL. **It selects paid Starter and Basic database plans. Review current pricing before creating services.** Nothing is deployed or purchased by adding this file.

1. Put this repository in your GitHub or GitLab account. In Render, choose **New → Blueprint**, connect that repository, and select `render.yaml`.
2. Enter your real **@anurag.edu.in** email for `DEVELOPER_EMAIL` and your institution-approved public support/privacy email for `VITE_PUBLIC_SUPPORT_EMAIL`. The support address is intentionally public and is included in the frontend build; never put a secret in this field. The blueprint generates `JWT_SECRET` and wires database credentials automatically; do not put them in the frontend or commit them. Deploy only after reviewing the plans and cost.
3. Wait for the web service and database to become healthy. Open the HTTPS URL shown in Render. React and Spring Boot share this URL, so authentication cookies stay first-party. `RENDER_EXTERNAL_URL` supplies the default frontend URL and CORS origin; set `FRONTEND_URL` and `ALLOWED_ORIGINS` explicitly if using a custom domain.
4. In Google Cloud Console, open your existing Web OAuth client. Add that exact HTTPS origin under **Authorized JavaScript origins**. Use only scheme, host, and optional port, not `/api` or a page path. For this implementation, no redirect URI or Google client secret is required. Configure consent-screen test users or organisation access if Google requires them.
5. Open the deployed app in a top-level browser tab, click **Continue with Google**, and choose your verified university Google Workspace account. The current implementation opens Google's account chooser in a popup, then creates a server-verified application session; it is not a full-page OAuth redirect. Complete your student profile after sign-in. The server-configured developer email can then grant admin access.
6. Google login does not need SMTP. To enable password registration and emailed verification links, add your organisation's `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_AUTH`, `SMTP_STARTTLS`, and `MAIL_FROM` in Render. Until SMTP is configured, password signup/resend cannot deliver verification emails. The blueprint excludes SMTP from the health check so this does not block Google-only operation.

Smoke checks after deployment:

```sh
curl https://YOUR-SERVICE.onrender.com/actuator/health
curl https://YOUR-SERVICE.onrender.com/api/auth/providers
```

Health should report `UP`, and the provider response should contain your supplied Google client ID. `/api/auth/me` should return 401 before sign-in, not a preview account. The developer role is granted only after your configured university identity is verified, never from a browser role selector. Static Make publishing does not deploy this Java service; use the full-stack service URL for live login. For an embedded app, browser identity and popup restrictions may require using that top-level URL.

### Google consent-screen links

The application includes public `/privacy` and `/terms` pages. They do not require authentication and do not open access to protected workspace APIs. Both are **drafts for institutional review**. Before using them as official production policies, the institution must approve their contents, confirm retention, request handling, and legal terms, provide its public support contact, and remove the draft notice. Rebuild/redeploy after changing the public contact address or policy text.

After deployment, use the actual service URL in Google Auth Platform → Branding:

| Field | Value |
| --- | --- |
| Application home page | Your actual HTTPS service origin |
| Application privacy policy link | Your actual HTTPS service origin followed by `/privacy` |
| Application terms of service link | Your actual HTTPS service origin followed by `/terms` |

Do not enter the placeholder `YOUR-SERVICE` or an assumed Render hostname. Copy the real URL from the Render dashboard. Authorized domains must comply with Google's domain-ownership requirements; a domain you control and can verify is recommended for a production consent screen. If using a custom domain, attach it to the Render service, update `FRONTEND_URL` and `ALLOWED_ORIGINS`, and authorize its HTTPS origin in the Google OAuth client.

## Security and deployment

- Registration accepts only `@anurag.edu.in` addresses. All accounts must verify their email using a single-use, hashed token expiring after 24 hours. `/api/auth/resend` issues a replacement after checking the account password.
- Only the server-configured `DEVELOPER_EMAIL` receives the developer role after verified registration. No role field is accepted from registration or login. Other accounts start as students unless the developer has explicitly assigned an admin role.
- Passwords use BCrypt with cost 12; accepted length is 12–72 UTF-8 bytes. Login and verification endpoints are rate-limited. Configure an additional trusted-proxy/edge rate limit for a production deployment.
- JWTs expire after eight hours and are stored only in HttpOnly cookies, not local storage. Logout invalidates all tokens for that account. Every authenticated request reloads the current role, so role revocation takes effect without waiting for JWT expiry.
- Mutating requests require an `X-XSRF-TOKEN` header obtained from `/api/auth/csrf`. The frontend refreshes that token before each mutation rather than retaining a stale token across cookie changes, including sign-out. Credentialed CORS permits only configured origins. Admin endpoints and developer-only role management have independent server-side guards.
- Profile edits target the authenticated account, never a user-supplied account ID. Photo uploads are limited to 2 MB, validated by actual JPEG/PNG bytes and decoder metadata, limited to 128–4096 px, center-cropped to 400 × 400, and re-encoded to remove embedded payloads/metadata. Shared member records exclude contact numbers, emails, and roll numbers.
- Budget and role APIs are restricted. Task completion is restricted to the assigned account. Team requests require an admin approval. The six configured research domains are CanSat, CubeSat, Rocket, Drones, Robotics, and Rovers. CubeSat supports profile interests, team approvals, task assignment, updates/notifications, and budget entries just like the other domains.
- Flyway manages the PostgreSQL schema. There are no seeded users, fake updates, or fictional budgets in the live service.

For production, deploy the API and PostgreSQL to infrastructure you control. Publish the frontend with `VITE_API_URL=/api` and route `/api` to Spring Boot through the **same HTTPS origin**. Keep `COOKIE_SECURE=true`, set `ALLOWED_ORIGINS` and `FRONTEND_URL` to that origin, configure real SMTP, use encrypted database connections/backups, restrict network access, and store secrets in a secret manager. This same-origin setup avoids cross-site/third-party-cookie restrictions. Do not deploy the local Compose configuration or Mailpit as a public production stack.

Frontend environment values are compiled into the build; rebuild/publish after changing `VITE_API_URL`. The frontend preview should use synthetic data, not sensitive student or financial records.

## Google sign-in and verification

1. In Google Cloud Console, configure the OAuth consent screen and create an OAuth client of type **Web application**. Request only the standard identity information (OpenID, email, and profile); no Drive, Calendar, or other API access is required.
2. Add your exact frontend URL under **Authorized JavaScript origins**: `http://localhost:8080` for the full-stack local setup, `http://localhost:3000` if using the separate Vite frontend, and your actual HTTPS frontend origin for production. This implementation uses the Google Identity Services popup/ID-token flow; it does not require a server redirect URI or an OAuth client secret.
3. The supplied web client ID, `985258970603-bj0jdb6q98u455c60fjhorh1n9opqbqn.apps.googleusercontent.com`, is configured as the backend default and in `backend/.env.example`. Override `GOOGLE_CLIENT_ID` in the backend environment if you change Google projects; explicitly set it to an empty string to disable Google sign-in. Compose passes this value from `backend/.env`. Restart/redeploy Spring Boot after configuration changes. The frontend obtains this public client ID from `/api/auth/providers`; never add a Google client secret to the browser.
4. Configure `VITE_API_URL` and the existing database, JWT, origin, and cookie settings as documented above. Google sign-in stays explicitly unavailable until both the backend connection and the client ID are configured.
5. Sign in with a verified **@anurag.edu.in Google Workspace account**. Google’s signed token must include the matching hosted-domain claim. Personal Gmail accounts and unrelated domains are rejected. A university Workspace administrator may need to allow the OAuth application, and external/testing consent screens may need an explicit test-user list.

The server verifies Google’s RS256 signature against Google’s public signing keys, issuer, audience/authorized party, expiration, issued time, verified email, hosted domain, and a five-minute browser-bound, single-use nonce. Mutating Google endpoints also require CSRF. A verified Google identity can create a student account or link the matching university account; roles come only from the server’s developer-email/access-grant settings or existing account. Students must still complete their profile. Google ID tokens are never stored in local storage or the database.

Google-only accounts do not receive a known local password. When Google verifies an existing unverified registration, its old password is replaced with an unguessable hash so a pre-registration attacker cannot sign in afterward. Previously verified accounts retain their local password. Identity-subject collisions or an unexpected email change require an administrator review instead of automatic relinking.

This code does not provision a Google Cloud project or deploy the API. The supplied client ID is configured, but real Google sign-in still requires a running configured backend and the exact frontend origin authorised in that Google Cloud project. Configuring a client ID does not verify its ownership or authorised origins. If an embedded preview blocks Google popups or browser identity features, test from the app’s authorised top-level URL.

On initial load the app shows the uploaded logo, then sign-in unless an existing backend session is authenticated. Without a configured backend, the sign-in page labels Google as unavailable and keeps all workspace routes locked. A direct route, reload, failed login, or a missing/expired session never grants access.

## API

All `/api` endpoints except authentication bootstrap require the session cookie. Obtain CSRF before any POST, PUT, or DELETE.

| Endpoint | Access / purpose |
| --- | --- |
| `GET /api/auth/csrf` | Get CSRF token |
| `POST /api/auth/register`, `/verify`, `/resend`, `/login` | University registration, verification, resend, sign-in |
| `GET /api/auth/providers` | Public Google web client configuration; empty when unavailable |
| `POST /api/auth/google/challenge`, `POST /api/auth/google` | One-time nonce / verify Google ID token and issue app session |
| `GET /api/auth/me`, `POST /api/auth/logout` | Session / invalidate sessions |
| `GET, PUT /api/profiles/me` | Own profile |
| `POST, DELETE /api/profiles/me/photo` | Own photo, multipart field `file` |
| `GET /api/profiles/{id}/photo` | Authenticated shared profile photo |
| `GET /api/updates` | Published announcements and opportunities |
| `POST /api/updates`, `DELETE /api/updates/{id}` | Admin/developer publishing |
| `GET /api/notifications`, `POST /api/notifications/read` | Per-account read state; frontend refreshes every 15 seconds |
| `GET, POST /api/access`, `DELETE /api/access/{email}` | Developer-only grants/revocation; no invitation emails are sent |
| `GET /api/projects`, `GET /api/members` | Real project/member directory |
| `POST /api/teams/{domain}/requests` | Request membership |
| `GET /api/teams/requests`, `POST /api/teams/{domain}/requests/{id}/approve` | Admin/developer team approvals |
| `GET /api/tasks`, `PUT /api/tasks/{id}` | Own tasks / completion |
| `POST /api/tasks` | Admin/developer task assignment |
| `GET /api/learning`, `PUT /api/learning/{lesson}` | Own self-reported learning progress / mark complete or undo |
| `GET, POST /api/budget` | Admin/developer budget summaries and ledger entries |
| `GET /actuator/health` | Minimal health status |

The AI guide, external news ingestion, and team document uploads are not implemented by this service. Existing static research links and downloadable checklists remain available. Notifications use database-backed polling, not WebSocket push or email broadcasts.

The Resources page includes eight free, self-paced learning paths (24 sessions), open research references, and engineering tools. CubeSat materials include the Cal Poly design specification and NASA’s CubeSat 101 handbook. Robotics materials include Gazebo tutorials, ROS 2 integration, and a digital-twin learning path covering modelling, topic bridging, and validation against recorded physical measurements. Gazebo/ROS 2 run locally; the app does not host a simulator or provide live physical-robot synchronisation. Learning content is linked to external providers; the app does not host those courses or issue certificates. Progress is self-reported and stored per authenticated account in PostgreSQL. Preview progress is stored only in the current browser. Optional premium features, certificates, or hardware from external providers may cost extra.

## Verification

```sh
cd backend
mvn test
mvn package
```

Integration tests start a temporary real PostgreSQL process via embedded-postgres; Docker is not required for these tests. They exercise Flyway migrations, authentication, university-email verification, CSRF, immediate role grant/revocation, admin/developer boundaries, per-account notifications, profile/photo validation, task ownership, and logout invalidation. Do not run embedded PostgreSQL tests as root.

`HttpRuntimeIntegrationTest` also starts Spring Boot on a random local HTTP port and checks health, the supplied default Google client ID, real CSRF cookie/header handling, HttpOnly Google challenge cookies, anonymous-account rejection, untrusted-origin rejection, and public frontend routing without opening protected APIs. Frontend routing uses a test HTML fixture, not a built React bundle. The server and test database are temporary; this does not deploy a persistent backend.

Google-specific tests cover nonce expiry/replay, account linking, pre-registration password protection, and server-owned roles. Signature and identity-claim tests use locally signed RSA fixtures; the Google database-flow tests mock the identity verifier. These tests do not sign in to a real Google account or activate an OAuth client.
