# CONFIG LICENSE SERVER

License key server for the **DAT Packager** web app. Admin-only key creation,
server-side verification — the frontend never sees or checks the key
database, it only calls the API.

```
USER → ENTER KEY → POST /api/auth/verify → SERVER → DATABASE → VERIFY → SUCCESS / FAILED
```

## Project layout

```
CONFIG_LICENSE_SERVER/
├── frontend/         User web app (DAT Packager + license gate)
├── admin/             Admin panel (login + dashboard pages)
│   └── public/         Admin panel CSS/JS (statically served)
├── server/
│   ├── index.js         Express app entrypoint
│   ├── db.js             SQLite connection + schema
│   ├── models/license.js  All license read/write logic
│   ├── routes/
│   │   ├── adminRoutes.js  /api/admin/*  (key management, protected)
│   │   └── authRoutes.js   /api/auth/*   (user key verification)
│   ├── middleware/
│   │   ├── adminAuth.js     JWT cookie check for admin routes/pages
│   │   └── rateLimit.js     Basic login brute-force protection
│   └── utils/keygen.js     Secure key generation + duration math
├── database/          SQLite file is created here on first run
├── package.json
├── .env.example
├── .gitignore
└── start.sh
```

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set real values:
   ```
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=<a strong password>
   SESSION_SECRET=<random string, e.g. `openssl rand -hex 32`>
   DATABASE_PATH=./database/license.db
   PORT=3000
   ```
   The server refuses to start if `SESSION_SECRET` or `ADMIN_PASSWORD` are
   still the placeholder values.

3. **Start the server**
   ```bash
   npm start
   ```
   or use the convenience script, which installs deps and copies `.env` for
   you on first run:
   ```bash
   ./start.sh
   ```
   The SQLite database and its table are created automatically on first run
   — no manual migration step needed.

## Using it

1. Go to `http://localhost:3000/admin/login` and log in with the admin
   credentials from `.env`.
2. The dashboard gives you all key-management actions, each mapped 1:1 to
   an admin API endpoint:

   | Button | What it does |
   |---|---|
   | **+ CREATE KEY** | Picks a duration (1/7/30/90/365 days or Lifetime), server generates a new key and saves it to the DB |
   | **↻ LIST KEYS** | Refreshes the table + stats from the database |
   | **Copy** (per row) | Copies that key to your clipboard, ready to send to a customer |
   | **Ban** (per row) | Immediately marks the key `BANNED` — blocks it even if it's already in use |
   | **Unban** (per row) | Reactivates a previously banned key |
   | **Extend** (per row) | Resets the key's expiry to `now + <chosen duration>` |
   | **Delete** (per row) | Permanently removes the key from the database |

3. Send the copied key to your customer through whatever channel you sell it
   on.
4. The customer opens `http://localhost:3000/` (the DAT Packager web app),
   pastes the key into the **License Key** field, and clicks **VERIFY KEY**.
5. The server checks the key against the database:
   - Valid & active → access granted, DAT Packager unlocks.
   - Not found → "Invalid key".
   - Past its expiry date → "Key expired".
   - Manually banned by admin → "Key banned".
6. Ban / Unban / Delete take effect immediately — even for a customer with
   an already-open session, since `/api/auth/session` re-checks the DB on
   every reload.

## Security notes

- All verification logic lives on the server (`server/routes/authRoutes.js`,
  `server/models/license.js`). The frontend only ever calls
  `POST /api/auth/verify` — it contains no key list and no validation logic
  of its own.
- Admin routes (`/api/admin/*`) and the `/admin/dashboard` page are gated by
  a signed, httpOnly JWT cookie (`server/middleware/adminAuth.js`). There is
  no public admin sign-up route — the only admin account is the one defined
  in `.env`.
- `/api/admin/login` is rate-limited (10 attempts / 15 min per IP) to slow
  down brute-force attempts.
- Cookies are `httpOnly` and `sameSite: strict`; set `NODE_ENV=production`
  behind HTTPS to also mark them `secure`.
- `.env` is excluded via `.gitignore` — never commit real credentials.
- This setup uses a single SQLite file and in-memory rate limiting, which is
  fine for one server instance. If you ever run multiple instances behind a
  load balancer, move rate limiting and sessions to a shared store (e.g.
  Redis) instead.

## API reference

### User-facing (`/api/auth`)
| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/auth/verify` | `{ key }` | Verifies a license key, sets a session cookie on success |
| GET  | `/api/auth/session` | – | Checks if the current cookie is still a valid, active license |
| POST | `/api/auth/logout` | – | Clears the user session cookie |

### Admin-only (`/api/admin`, requires admin session cookie except `/login`)
| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/admin/login` | `{ username, password }` | Logs the admin in |
| POST | `/api/admin/logout` | – | Logs the admin out |
| GET  | `/api/admin/keys` | – | Lists all keys + stats (total/active/expired/banned) |
| POST | `/api/admin/keys/create` | `{ duration }` | `duration`: `1_DAY`\|`7_DAYS`\|`30_DAYS`\|`90_DAYS`\|`365_DAYS`\|`LIFETIME` |
| POST | `/api/admin/keys/ban` | `{ id }` | Bans a key |
| POST | `/api/admin/keys/unban` | `{ id }` | Reactivates a banned key |
| POST | `/api/admin/keys/delete` | `{ id }` | Permanently deletes a key |
| POST | `/api/admin/keys/extend` | `{ id, duration }` | Resets a key's expiry to `now + duration` |

## Troubleshooting

- **`better-sqlite3` fails to install / build**: it needs a C++ build
  toolchain (Python + a compiler). On Debian/Ubuntu: `sudo apt install -y
  build-essential python3`. On Windows, install the "Desktop development
  with C++" workload via Visual Studio Build Tools.
- **Server exits immediately on start**: check the console message — it
  refuses to boot until you replace the placeholder `SESSION_SECRET` and
  `ADMIN_PASSWORD` in `.env`.
