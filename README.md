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
