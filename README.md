# ProgTrack MERN

React + Vite + Tailwind frontend, Express + MongoDB API, and authenticated Socket.IO team chat.

## Run locally

Requires Node.js 22+ and MongoDB 7+ running locally (or a MongoDB connection string).

1. `npm install --prefix backend` and `npm install --prefix frontend`.
2. Copy `backend/.env.example` to `backend/.env`. Set `JWT_SECRET` to a random secret of at least 32 characters (`openssl rand -hex 32`). Configure `MONGO_URI` if needed.
3. In separate terminals run `npm run dev --prefix backend` and `npm run dev --prefix frontend`.
4. Open http://localhost:5173. Register an account, then approve it using `npm run user --prefix backend -- approve person@example.com`.
5. Optionally create an approved administrator: set `ADMIN_PASSWORD` in your environment and run `npm run user --prefix backend -- create-admin admin@example.com`. `ADMIN_NAME` is optional. Do not put passwords in source files or commit them.

The API defaults to http://localhost:5000/api. Set `VITE_API_URL` in `frontend/.env` and `CLIENT_ORIGIN` in `backend/.env` when using another origin. Restart development servers after changing environment variables. If port 5000 is already in use (for example by macOS AirPlay), set `PORT=5050` and `VITE_API_URL=http://localhost:5050/api` in the corresponding environment files.

## Optional local development database

If MongoDB is not installed, run `npm run db --prefix backend` in a separate terminal before starting the API. This uses the development MongoDB launcher, binds only to `127.0.0.1:27017`, and keeps data in `backend/.local-data/mongodb` across restarts. The data directory and local `.env` files are excluded from Git. The first launch may download the MongoDB binary. This launcher is for local development only.

## Behavior

- Registration always creates an unapproved INTERN; an operator approves users using the CLI. Passwords are bcrypt hashed. JWTs expire after 12 hours, have no fallback secret, and are checked against active/approved users on protected requests.
- Auth Context restores the user from `/auth/me`. Tokens use sessionStorage by default, or localStorage when “Keep me signed in” is selected, and are attached as Bearer headers. These stores are accessible to JavaScript; serve over HTTPS and keep the application free of untrusted scripts. Logout removes the client token; it does not revoke an already-copied token before its expiry.
- Daily grids append validated, immutable submissions. A second intentional submission adds entries. Do not retry an uncertain submission without checking history. Task hours are decimal hours. Date filters and task days use UTC, with a default history window of 30 days. Team visibility is department scoped; ADMIN/CEO can see all departments. Users without departments see only their own tasks.
- Dashboard and analytics summarize the signed-in user's records, including all five task statuses. Activity shows real task submissions, not mock notifications.
- Chat is a shared room for all approved accounts. The latest 100 persisted messages load on entry/reconnection. Socket authentication derives sender identity from JWTs. Presence counts users across multiple tabs. Server-side revalidation occurs on every send and once per minute for idle sockets.
- Each authenticated tab starts a unique work session. Start/end are idempotent. Explicit logout waits for `/worklog/end`; page exit sends a best-effort keepalive request. Heartbeats run every 30 seconds; a server sweep closes sessions after 90 seconds without a heartbeat, at the last confirmed heartbeat. Browser crashes, offline devices, or heavily suspended background tabs cannot yield exact closing times. On recovery a new session is started. Analytics merges overlapping tab intervals and counts active sessions only through the last heartbeat.
- Email reminder scaffolding is not enabled. It is outside this conversion's authentication/task/chat scope and needs mail configuration and delivery dependencies before use.

## Verification

- `npm test --prefix backend`: real MongoDB integration tests using an isolated temporary database, HTTP requests, and Socket.IO clients. The first run downloads a MongoDB test binary; no application data is touched.
- `npm test --prefix frontend`: aggregation and overlapping-session tests.
- `npm run lint --prefix frontend`
- `npm run build --prefix frontend`

API routes: `/auth/register`, `/auth/login`, `/auth/me`; `/tasks/today`, `/tasks/history`, `/tasks/team`, `/tasks/submit-daily`, `/tasks/:id`; `/worklog`, `/worklog/start`, `/worklog/heartbeat`, `/worklog/end`; `/chat/messages`; `/health` (all under `/api`).

## Vercel frontend configuration

Import the repository with Root Directory `frontend`, framework Vite, build command `npm run build`, and output directory `dist`. The included `frontend/vercel.json` sends browser routes such as `/login` to the SPA entry point.

The frontend requires `VITE_API_URL`; there is no localhost fallback. Set `VITE_API_URL` to the actual HTTPS backend origin (for example `https://your-backend.example.com`) or its `/api` URL; the client normalizes either form. Redeploy after changing it. All existing requests use the shared client, including login and tasks; this project has no `/api/projects` endpoint.

On the backend host, set `CLIENT_ORIGIN` to the exact frontend HTTPS origin without a trailing slash, `MONGO_URI` to a hosted database connection, and `JWT_SECRET` to a newly generated secret of at least 32 characters. Both HTTP and Socket.IO allow `http://localhost:5173`, `https://project-trace-beta.vercel.app`, `https://project-trace-njgiy1d2n-nisarg2102s-projects.vercel.app`, `https://project-trace-ny2qt670x-nisarg2102s-projects.vercel.app`, and `https://project-trace-9r7zsba9l-nisarg2102s-projects.vercel.app`. `CLIENT_ORIGIN` adds exact allowed origins (comma-separated when needed). Wildcard domains are not accepted. CORS enables credentials for allowed origins. Authentication continues to use Bearer headers; the frontend does not send cross-origin cookies. Do not deploy with the local MongoDB URI or put backend secrets in `VITE_` variables.

The existing backend is a long-running Node server. A Vercel backend deployment also needs a compatible exported server entry point and external coordination for chat broadcasts/presence across function instances; frontend environment settings alone do not deploy that backend. Local demo accounts do not automatically exist in a hosted database.

The configured production API base is `https://projecttrace-backend.vercel.app/api` in `frontend/.env.production`. Login requests resolve to `https://projecttrace-backend.vercel.app/api/auth/login`. If Vercel already defines `VITE_API_URL`, set it to this same value because dashboard variables override the file; redeploy the frontend after the change.

The Express app establishes and reuses its MongoDB connection before database-backed API routes, including when a host imports `app.js` directly. `/api/health` only checks HTTP availability. Missing or unreachable database configuration returns `503`; set `MONGO_URI` on the backend deployment.

Use the stable frontend address `https://project-trace-beta.vercel.app` for normal sign-in. Individual deployment preview URLs change; an additional preview origin must be explicitly listed in backend `CLIENT_ORIGIN` (comma-separated) or the CORS allowlist, followed by a backend redeploy.
