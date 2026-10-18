# SprintBoard Frontend

A responsive React + Vite implementation based on the SprintBoard Figma file. It includes admin and employee workspaces, task workflows, team management, reports, notifications, authentication screens, profile settings, and a changeable profile photo.

## Source design

The frontend follows the SprintBoard Figma screens: [Open the Figma design](https://www.figma.com/design/3mrUjoI0UmtosBnN6VraKR).

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell, copy `.env.example` to `.env` manually if `cp` is unavailable.

## Demo mode

Demo mode is opt-in. Set `VITE_DEMO_MODE=true` only when evaluating the UI without a backend. Sign in with:
- Email: `ashish@example.com`
- Password: `DemoPass123!`

Demo mode accepts any syntactically valid email and password with at least 8 characters. The sample admin role is tied to `ashish@example.com`; other emails use the employee view. This is only for UI evaluation; it is not authentication and must never be used as a production access control.

Demo changes live in React memory and are reset on a full page refresh.

## Production API mode

Set:

```env
VITE_DEMO_MODE=false
VITE_API_BASE_URL=/api
```

Configure your reverse proxy so `/api` is served by the backend on the same origin. The frontend uses `fetch` with `credentials: "include"` and does not store JWTs or session tokens in `localStorage` or `sessionStorage`.

### Expected API contract

Successful endpoints may return the resource directly or inside `{ "data": ... }`.

- `POST /auth/login` — accepts `{ email, password }`; server sets a secure HttpOnly session/JWT cookie.
- `GET /auth/me` — returns the authenticated user.
- `POST /auth/logout` — invalidates the session/cookie server-side.
- `POST /auth/forgot-password` — accepts `{ email }`; always use a generic response to avoid account enumeration.
- `GET /tasks` — task list, optionally `{ items: [...] }` in the response.
- `POST /tasks` — creates a task; send selected member IDs in `assigneeIds`.
- `PATCH /tasks/:id` — admin task update.
- `PATCH /tasks/:id/status` — status-only employee update; the server verifies that the employee is among the task's assignees.
- `POST /tasks/:id/attachments` — multipart field `attachment`.
- `GET /teams`, `POST /teams`
- `GET /users`, `POST /users/invite`
- `PATCH /users/me` — update profile.
- `POST /users/me/avatar` — multipart field `avatar`; returns `{ avatarUrl }`.
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`

## Security notes — important

The frontend includes protected route rendering, role-aware navigation, input limits, file type/size checks, safe text rendering, same-origin API configuration, cookie credentials, CSRF header support when a readable `csrfToken` cookie is supplied, no client-side token storage, and generic recovery UI. **These are not a substitute for backend security.**

Before production:
1. Enforce authentication and role/ownership checks on every API endpoint. Never trust role values, assignee IDs, task IDs, or hidden UI controls sent by the browser.
2. Use `Secure`, `HttpOnly`, and appropriate `SameSite` cookie attributes; implement server-side CSRF validation for unsafe requests; configure exact CORS origins if cross-origin deployment is unavoidable.
3. Hash passwords with Argon2id or bcrypt, rate-limit login and password reset, rotate/invalidate sessions on logout, and return generic auth/recovery errors.
4. Validate request bodies and file contents on the server. Use an allowlist for MIME/content signatures, size limits, generated storage names, malware scanning where appropriate, and private object storage. Do not trust client-side `accept` attributes.
5. Use HTTPS, security headers (including CSP), dependency scanning, audit logs, least-privilege database credentials, backups, and centralized error handling.
6. Set `VITE_API_BASE_URL` to the correct deployment path. Never put secrets in `VITE_*` environment variables; they are exposed to the browser bundle.
7. Configure SPA fallback routing and test direct navigation/refresh on every route.

## Deployment security headers

`public/_headers` is included for static hosts that support Netlify-style headers. `vercel.json` adds headers for Vercel deployments. The CSP permits same-origin API requests; if the backend is intentionally hosted on a different origin, add that exact trusted origin to `connect-src` and configure the backend's CORS policy for the specific frontend origin. Do not use wildcard credentialed CORS.

Review the CSP against your hosting setup before deploying. The external Google Fonts import is allowed by the included policy; self-host fonts if you want to remove that external dependency.

## Build

```bash
npm run build
npm run preview
```

The build output is written to `dist/`. Run a dependency audit and integration/security tests against your actual backend before deploying.
