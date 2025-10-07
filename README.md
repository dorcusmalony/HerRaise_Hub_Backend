

# HerRaise_Hub_Backend

Production-ready Node.js backend for the HerRaise Hub platform — REST API built with Express and Sequelize (Postgres).  
This README summarizes the codebase, quick-start steps, API surface, frontend integration guidance (login/auth), deployment notes and troubleshooting.

---

## Highlights
- Express.js API with structured routers and controllers.
- Sequelize + PostgreSQL (models and automated DB-creation logic in [src/config/database.js](HerRaise_Hub_Backend/src/config/database.js)).
- JWT-based authentication (tokens returned in login/register responses).
- Role-based authorization middleware at [src/middleware/auth.js](HerRaise_Hub_Backend/src/middleware/auth.js).
- Important routes:
  - Auth: [src/routes/authRoutes.js](HerRaise_Hub_Backend/src/routes/authRoutes.js)
  - Goals: [src/routes/goalRoutes.js](HerRaise_Hub_Backend/src/routes/goalRoutes.js)
  - Resources: [src/routes/resourceRoutes.js](HerRaise_Hub_Backend/src/routes/resourceRoutes.js)
  - Reports: [src/routes/reportRoutes.js](HerRaise_Hub_Backend/src/routes/reportRoutes.js)
- App entry: [server.js](HerRaise_Hub_Backend/server.js) and [src/app.js](HerRaise_Hub_Backend/src/app.js)

---

## Tech stack
- Node 18
- Express 5
- Sequelize ORM + pg (Postgres)
- JWT (jsonwebtoken)
- Bcrypt for password hashing
- Docker / docker-compose (optional)

---

## Quick start (local)

Prerequisites:
- Node 18+, npm
- PostgreSQL running (or use docker-compose)

1. Install
   npm install

2. Create `.env` (copy existing .env and set secrets). Main vars:
   - POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
   - JWT_SECRET, JWT_EXPIRE
   - PORT (default 5000)

3. Start (development)
   npm run dev

4. Or use Docker (recommended for parity)
   docker-compose up --build

The server exposes the API on http://localhost:5000/api and health check at /health. See start logic in [server.js](HerRaise_Hub_Backend/server.js).

---

## Database & migrations
- The project contains SQL migration scripts in `db/migrations/`.
- `src/config/database.js` will attempt to ensure the Postgres database exists, define models and sync them. The file also includes custom logic for fixing legacy nulls and recreating the Reports table when needed.

---

## Authentication (login flow)
- Endpoints:
  - POST /api/auth/register → returns `{ success, token, user }`
  - POST /api/auth/login → returns `{ success, token, user }`
  - GET /api/auth/me → protected, returns current user
  - POST /api/auth/logout → protected
  - Password flows: POST /api/auth/forgot-password, PUT /api/auth/reset-password/:resetToken, PUT /api/auth/change-password

- Token: The server returns a JWT in the JSON response (not an httpOnly cookie). Protected routes require:
  Header: Authorization: Bearer <token>
  See protect middleware: [src/middleware/auth.js](HerRaise_Hub_Backend/src/middleware/auth.js)

Successful login response example:
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": { "id":"...", "name":"...", "email":"..." }
}
```

---

## Postman / cURL examples

Login (Postman body → raw JSON)
{
  "email": "test.user@example.com",
  "password": "TestPass123!"
}

cURL:
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test.user@example.com","password":"TestPass123!"}'

Protected request example (use token from login):
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json"




 Axios with interceptor:
```javascript
import axios from 'axios';
const api = axios.create({ baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('authToken');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
export default api;
```

Notes:
- Current backend returns token in JSON — frontend must add Authorization header on subsequent requests.
- For production, prefer httpOnly, Secure cookies to mitigate XSS. To switch:
  - Backend should set cookie with `res.cookie('refreshToken', ...)` and `withCredentials`/credentials:'include' enabled on frontend.
  - Configure CORS to allow credentials and restrict origin.

---

## CORS & Security
- App currently calls `app.use(cors())` in [src/app.js](HerRaise_Hub_Backend/src/app.js). For production:
  - Restrict origin to your frontend URL.
  - Add `credentials: true` on server and `withCredentials: true` on client when using cookie auth.
  - Ensure HTTPS in production and set cookies with `httpOnly`, `secure`, `SameSite` appropriately.

---



## Running in Docker (recommended)
- Build & start:
  docker-compose up --build
- Dockerfile and docker-compose are provided. The docker-compose runs Postgres and the app. Default port: 5000.



## Troubleshooting
- Port 5000 in use → run `npx kill-port 5000` or change the port.
- DB connection errors → verify Postgres creds in `.env` and that Postgres is reachable.
- If migrations alter enums/tables, check `db/migrations/*` scripts and logs (there are scripts for Reports enum issues).
- Look at logs printed by `src/config/database.js` during startup for DB fixes and sync progress.

---

## Contributing
- Follow the existing project structure: routes → controllers → models → utils.
- Use `npm run dev` during development.

---

## License & contact
- Repo: https://github.com/dorcusmalony/HerRaise_Hub_Backend
- For issues open an issue on the repository.
