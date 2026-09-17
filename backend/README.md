# BeTravel Backend Auth — Atlas Single DB V3

Backend authentication reusable for BeTravel, based on the previous FYCE auth architecture.

## What changed in V3

- Uses exactly one MongoDB database: the database written in `MONGODB_URI`.
- Does not use `MONGODB_DB_NAME`.
- Does not override Mongoose `dbName`.
- `src/server.js` loads `backend/.env` with `override: true`, preventing an old `MONGODB_URI` exported in the terminal from overriding the current `.env`.
- Startup logs only safe Mongo metadata: username, host, database. It never prints the password.
- Registration creates an active account immediately; no registration email OTP.
- Keeps password login, Google login, refresh token, logout, profile, and the existing forgot-password email flow.

## Required MongoDB configuration

Create `backend/.env` from `.env.example` and set:

```env
MONGODB_URI=mongodb+srv://<db_user>:<db_password>@wdp.w0bnsxm.mongodb.net/WDPPROJECT01
```

The backend will use `WDPPROJECT01` because that database is part of the URI.

Do not add this anymore:

```env
MONGODB_DB_NAME=betravel
```

V3 intentionally removed it.

## Full local `.env` example

```env
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173

MONGODB_URI=mongodb+srv://<db_user>:<db_password>@wdp.w0bnsxm.mongodb.net/WDPPROJECT01

JWT_ACCESS_SECRET=replace_with_a_long_random_secret
JWT_ACCESS_EXPIRES=15m

GOOGLE_CLIENT_ID=replace_with_google_web_client_id.apps.googleusercontent.com

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

Do not commit `.env`.

## Install and run

```bash
npm install
npm run dev
```

Expected startup output:

```text
MongoDB connection target: {
  username: '<db_user>',
  host: 'wdp.w0bnsxm.mongodb.net',
  database: 'WDPPROJECT01'
}
MongoDB Atlas connected successfully
Database name: WDPPROJECT01
BeTravel server running at http://localhost:3000
```

## If Atlas still says `bad auth`

If V3 prints the correct username, host, and `WDPPROJECT01` but then Atlas returns:

```text
bad auth : authentication failed
```

then the code is already connecting to the intended cluster/database. Atlas is rejecting the Database Access credential itself. Check the database username/password in Atlas. A database name change in code cannot repair an invalid Atlas password.

Network Access/IP problems normally surface as server-selection or timeout errors, not `bad auth`.

## Main auth endpoints

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/google
POST   /api/auth/google/link
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
PATCH  /api/auth/me
POST   /api/auth/forgot-password
POST   /api/auth/verify-reset-otp
POST   /api/auth/resend-reset-otp
POST   /api/auth/reset-password
```

Registration does not require email confirmation.
