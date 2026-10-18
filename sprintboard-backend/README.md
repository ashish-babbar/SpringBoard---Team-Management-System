# SprintBoard Backend

Express 4 + MongoDB/Mongoose API built to match the SprintBoard React frontend. It uses database-backed opaque sessions in `HttpOnly` cookies, a CSRF double-submit token, role and task-ownership authorization, bcrypt password hashing, validated request bodies, rate limits, private file storage, and centralized error responses.

## Requirements

- Node.js 20 or newer
- MongoDB 6+ (local or managed)
- npm
- Optional SMTP account for invite and password-reset emails

## 1. Configure and start

```bash
npm install
cp .env.example .env
```

Set `MONGODB_URI`, `FRONTEND_ORIGIN`, `APP_ORIGIN`, and a private writable `UPLOAD_DIR` in `.env`. On Windows PowerShell use `Copy-Item .env.example .env`.

Create indexes and then the first administrator. Set a unique password of at least 12 characters in `.env` as `ADMIN_PASSWORD`, then run:

```bash
npm run db:indexes
npm run seed:admin
npm run dev
```

The API listens on `http://localhost:4000` by default. Health checks: `GET http://localhost:4000/health` or `GET http://localhost:4000/api/health`.

For a disposable development database, `npm run seed:demo` adds sample teams, tasks, and users. It is blocked when `NODE_ENV=production`. The default seeded admin is `ashish@example.com` / `DemoAdminPass123!`; employees use `DemoEmployeePass123!`. Set distinct `DEMO_ADMIN_PASSWORD` and `DEMO_EMPLOYEE_PASSWORD` values to override these defaults. **Never seed demo accounts in a real environment.**

Without SMTP, development invitations show a one-time setup link in the admin dialog for manual sharing. In production, set `ALLOW_MANUAL_INVITES=true` to enable this option without SMTP; configure `APP_ORIGIN` as the publicly reachable HTTPS frontend URL first. Treat setup links like passwords: send them privately and note that they expire after 30 minutes. A `localhost` link only works on the computer hosting the app.

## 2. Connect the provided React frontend

The accompanying frontend integration includes a Vite `/api` proxy to `http://localhost:4000`, so run the API and frontend in separate terminals:

```bash
# terminal 1, in sprintboard-backend
npm run dev

# terminal 2, in sprintboard-frontend
npm install
# set VITE_DEMO_MODE=false in .env, then:
npm run dev
```

In `sprintboard-frontend/.env`, set:

```env
VITE_DEMO_MODE=false
VITE_API_BASE_URL=/api
```

The frontend never stores a session token in web storage. `GET /api/auth/me` sets the initial readable CSRF cookie when signed out. After login, the server rotates it and binds it to the current session. The API uses `credentials: 'include'` and sends `X-CSRF-Token` on mutating requests.

For production, normally serve both through one HTTPS origin and reverse-proxy `/api` to this service. If you intentionally use separate origins, set `FRONTEND_ORIGIN` to the exact trusted origin(s), configure the frontend CSP `connect-src`, use HTTPS, and review the `SameSite` cookie policy. Do not use wildcard credentialed CORS.

## API contract

All successful responses are JSON with `{ "data": ... }` unless a `204 No Content` response is documented. Errors use `{ "message", "code", "requestId", "errors?" }`.

| Method | Endpoint | Access / purpose |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/auth/me` | Current user; also initializes the CSRF cookie for a signed-out browser |
| `POST` | `/api/auth/login` | `{ email, password }`; sets HttpOnly session + readable CSRF cookies |
| `POST` | `/api/auth/logout` | Authenticated, CSRF-protected; revokes current DB session |
| `POST` | `/api/auth/forgot-password` | `{ email }`; generic response to prevent account enumeration |
| `POST` | `/api/auth/reset-password` | `{ token, password }`; one-time 30-minute token; password must be 12+ characters |
| `GET` | `/api/tasks` | Admin: all tasks; Employee: assigned tasks only; supports `page`, `limit`, `q`, `status`, `priority`, `team`, `assigneeId`, `dueBefore`, `dueAfter`, `sortBy`, `order` |
| `POST` | `/api/tasks` | Admin; creates and optionally assigns a task |
| `GET` | `/api/tasks/:id` | Admin or assigned employee; accepts task code (`SB-0001`) or Mongo ObjectId |
| `PATCH` | `/api/tasks/:id` | Admin task editing/assignment |
| `PATCH` | `/api/tasks/:id/status` | Admin, or assigned employee changing status only |
| `POST` | `/api/tasks/:id/attachments` | Admin or assigned employee; multipart field `attachment` |
| `DELETE` | `/api/tasks/:id` | Admin; removes task and attached stored files |
| `GET`, `POST` | `/api/teams` | Read by workspace members; creation is Admin-only |
| `PATCH`, `DELETE` | `/api/teams/:id` | Admin-only; delete requires no members/tasks |
| `GET` | `/api/users` | Basic active member list for the workspace UI |
| `POST` | `/api/users/invite` | Admin; multipart is not used; creates a pending account and emails a setup link |
| `PATCH` | `/api/users/me` | Update current user's name/email |
| `POST` | `/api/users/me/avatar` | multipart field `avatar`; JPEG, PNG or WebP, max 2 MB |
| `PATCH` | `/api/users/:id/role` | Admin-only role management |
| `DELETE` | `/api/users/:id` | Admin-only account deactivation + session revocation |
| `GET` | `/api/notifications` | Current user's notifications only |
| `PATCH` | `/api/notifications/:id/read` | Current user's notification only |
| `PATCH` | `/api/notifications/read-all` | Mark current user's notifications read |
| `GET` | `/api/dashboard` | Current-user-scoped statistics and recent activity |
| `GET` | `/api/files/:publicId` | Authenticated download; task attachments restricted to Admin/assigned employee |

## Data model overview

- `User`: role (`Admin`/`Employee`), bcrypt password hash, active flag, workspace team name, avatar file ID.
- `Session`: hash of a random opaque session token, per-session CSRF hash, expiry and revocation state. Plain session tokens are only sent as cookies and are never stored in MongoDB.
- `Task`: readable code, title, description, team, assignee reference, priority, status, due date, and file metadata.
- `Team`, `Notification`, `ActivityLog`, `Counter`, `PasswordReset`, and `FileAsset` support the relevant UI/API flows.

## Security implemented

- Server-trusted authentication and role authorization; all employee task reads/updates/attachment downloads check assignment.
- Session token is random, hashed at rest, expires, and is revocable; logout and password reset invalidate sessions.
- Session cookie is `HttpOnly`, `SameSite=Lax` by default, and `Secure` in production; CSRF cookie/header is checked and bound to the session.
- bcrypt password hashing at cost 12, generic sign-in and password-recovery responses, 30-minute one-time reset links, and per-route rate limits.
- Helmet security headers, exact-origin credentialed CORS, request body limits, Zod validation with strict unknown-field rejection, and generic production 500 errors.
- Uploads use generated filenames and private disk storage outside public static paths. MIME is detected from file signatures rather than trusting the browser's MIME value; avatar and attachment size/type rules are enforced on the server. Files are served only through an authenticated authorization route.
- Request IDs and activity records support troubleshooting/auditing.

## Production deployment checklist

This is a strong backend starting point, **not a claim of third-party security certification or a substitute for deployment-specific testing**. Before real users/data:

1. Use HTTPS end-to-end and configure `NODE_ENV=production`, secure cookies, exact `FRONTEND_ORIGIN`, and the correct `TRUST_PROXY=true` only behind a trusted reverse proxy.
2. Use a private MongoDB deployment with least-privilege credentials, backups, monitoring, network allowlists, TLS, and an appropriate connection string. Avoid sharing development and production databases.
3. Configure and test SMTP delivery. Invitation/reset emails link to `/reset-password`; the integrated frontend contains a reset form that calls `/api/auth/reset-password`.
4. Store `UPLOAD_DIR` on a private persistent volume. On multiple backend instances, replace local disk storage with private S3-compatible object storage and a malware scanning pipeline; current disk storage is intended for a single instance with a durable volume.
5. Add central log shipping, alerting, dependency scanning, retention/deletion policies, security tests, API integration tests and load tests. For multiple API instances, replace the default in-memory rate-limit store with a shared store such as Redis. Review privacy/legal requirements for your deployment.
6. This backend is a **single workspace** implementation. If it will serve multiple customer organizations, add an organization/tenant ID to users, teams, tasks, sessions, notifications, activities and files, and include the authenticated tenant in every query. Do not deploy it as a multi-tenant SaaS without that isolation.
7. Validate real SMTP, filesystem permissions, reverse-proxy cookies, CSRF, CORS, refresh/direct navigation, backup restore, and every role path in a staging environment before release.

## Development commands

```bash
npm run dev       # watch mode
npm start         # production process
npm run check     # Node.js syntax check on main API files
npm test          # unit tests
npm run db:indexes # create declared indexes, including unique constraints
npm run seed:admin
npm run seed:demo # development only
```
