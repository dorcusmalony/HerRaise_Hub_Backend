# HerRaise_Hub_Backend

Production-ready Node.js backend for the HerRaise Hub platform — Comprehensive REST API built with Express and Sequelize (Postgres) supporting multilingual content, forum system, and real-time notifications.

---

## Key Features

### 🌍 **Multilingual Support**
- **Arabic/English** content fields across all models
- **Language detection** middleware
- **RTL text direction** support
- **Localized API responses**

### 💬 **Forum System**
- **6 Categories**: Mental Health, Leadership, Education, Equality Rights, Career Skills, Women's Health
- **Post Types**: Discussion, Question, Announcement
- **User Interactions**: Likes, Comments, Views tracking
- **User Tagging**: @mention system like Facebook
- **Nested Comments**: Reply system with notifications

### 🔔 **Notification System**
- **Real-time notifications** via Socket.IO
- **Push notifications** with web-push
- **Email notifications** via Nodemailer
- **Notification types**: Forum activity, opportunities, system updates

### 📁 **File Management**
- **Cloudinary integration** for media uploads
- **Multiple file types** support
- **Image optimization** and resizing

### 👥 **User Management**
- **JWT authentication** with role-based access
- **User profiles** with activity tracking
- **Mentor/Mentee** system
- **Admin dashboard** with analytics

### 🎯 **Opportunity Tracking**
- **Scholarships, internships, jobs**
- **Application tracking**
- **Deadline reminders**
- **Interest bookmarking**

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Forum
- `GET /api/forum/categories` - Get all categories
- `GET /api/forum/categories/:category/posts` - Get posts by category
- `POST /api/forum/posts` - Create new post
- `POST /api/forum/posts/:id/comments` - Add comment
- `POST /api/forum/posts/:id/like` - Like/unlike post
- `GET /api/forum/categories/:category/taggable-users` - Get users for tagging

### Multilingual
- `GET /api/translations?lang=ar` - Get UI translations
- `POST /api/switch-language` - Switch user language

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/mark-read` - Mark as read
- `POST /api/push-notifications/subscribe` - Subscribe to push notifications

---

## Tech Stack
- **Node.js 18+** - Runtime environment
- **Express.js** - Web framework
- **Sequelize ORM** - Database ORM
- **PostgreSQL** - Primary database
- **Socket.IO** - Real-time communication
- **Cloudinary** - Media storage
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Nodemailer** - Email service
- **Web-push** - Push notifications
- **Docker** - Containerization

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

### Schema Management Strategy

**Development Mode (Current):**
```bash
# .env
USE_MIGRATIONS=false  # Uses Sequelize auto-sync
```
- Automatically creates/updates tables on startup
- Faster iteration during development
- Suitable for capstone demonstration

**Migration Infrastructure:**
The project includes production-ready migrations in `src/migrations/`:
- `20250120-add-arabic-english-bilingual-support.js` - Adds Arabic/English bilingual support across all content tables, with transaction safety and rollback capability. Specifically designed for South Sudan's multilingual user base.

**To Use Migrations (Production):**
```bash
# 1. Set environment variable
USE_MIGRATIONS=true

# 2. Run migrations
npx sequelize-cli db:migrate

# 3. Start application
npm start
```

**Why Both Approaches Exist:**
- ✅ Auto-sync: Fast development, automatic schema updates
- ✅ Migrations: Production safety, version control, rollback capability
- 🎯 Best practice: Use auto-sync in dev, migrations in production

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
