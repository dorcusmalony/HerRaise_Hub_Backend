# HerRaise_Hub_Backend

Docker (quick start)

- Build image:
  docker build -t herraise_backend .

- Or use docker-compose to run app + Postgres:
  1. Make sure .env exists and includes PORT and Postgres settings (POSTGRES_HOST/PORT/DB/USER/PASSWORD).
  2. Start services:
     docker-compose up --build -d
  3. Stop services:
     docker-compose down

Notes:
- This project uses PostgreSQL only. The provided docker-compose.yml launches a `postgres` service and an `app` service.
- Default DB name used by the app is taken from POSTGRES_DB (fallback: "Her-connect").
- Ensure .env contains correct Postgres credentials or let docker-compose supply them for the local container.
- If you enable SEED_BADGES=true the server will seed badges on startup.

Quick Postman checks (auth)
- POST /api/auth/register  { "name", "email", "password" } -> returns JWT token
- POST /api/auth/login     { "email", "password" } -> returns JWT token
- PUT  /api/auth/change-password  (Authorization: Bearer <token>) { "currentPassword", "newPassword" }
- POST /api/auth/logout    (Authorization: Bearer <token>)

Add logout example (Postman / curl / fetch)

- Postman:
  - Method: POST
  - URL: http://localhost:5000/api/auth/logout
  - Headers:
    - Authorization: Bearer <your_jwt_token>
    - Content-Type: application/json
  - Body: none

- Raw JSON for quick paste (Body → raw → JSON): {}
  (No body required; include the Authorization header.)

- curl:
  curl -X POST http://localhost:5000/api/auth/logout \
    -H "Authorization: Bearer <your_jwt_token>" \
    -H "Content-Type: application/json"

- JS fetch:
  fetch('http://localhost:5000/api/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer <your_jwt_token>'
    }
  }).then(r => r.json()).then(console.log).catch(console.error);

Postman quick request snippets (Body → raw → JSON)

- Register (mentee example)
  Method: POST
  URL: http://localhost:5000/api/auth/register
  Headers: Content-Type: application/json
  Body:
  {
    "name": "Amina Hassan",
    "email": "amina@example.com",
    "password": "SecurePass123!",
    "role": "mentee",
    "language": "en",
    "phoneNumber": "+211912345678",
    "location": { "city": "Juba", "state": "Central Equatoria" },
    "dateOfBirth": "2005-06-15",
    "interests": ["technology", "education", "leadership"],
    "educationLevel": "secondary"
  }

- Login
  Method: POST
  URL: http://localhost:5000/api/auth/login
  Headers: Content-Type: application/json
  Body:
  {
    "email": "test.user@example.com",
    "password": "TestPass123!"
  }

- Logout (protected)
  Method: POST
  URL: http://localhost:5000/api/auth/logout
  Headers:
    Content-Type: application/json
    Authorization: Bearer <your_jwt_token>
  Body:
  {}

- Change password (protected)
  Method: PUT
  URL: http://localhost:5000/api/auth/change-password
  Headers:
    Content-Type: application/json
    Authorization: Bearer <your_jwt_token>
  Body:
  {
    "currentPassword": "TestPass123!",
    "newPassword": "NewPass123!"
  }

- Forgot password
  Method: POST
  URL: http://localhost:5000/api/auth/forgot-password
  Headers: Content-Type: application/json
  Body:
  {
    "email": "test.user@example.com"
  }

- Reset password (use :resetToken from forgot response)
  Method: PUT
  URL: http://localhost:5000/api/auth/reset-password/<resetToken>
  Headers: Content-Type: application/json
  Body:
  {
    "password": "NewPass123!"
  }

Quick curl examples (replace placeholders)
- Register:
  curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Test User","email":"test.user@example.com","password":"TestPass123!"}'

- Login:
  curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test.user@example.com","password":"TestPass123!"}'

- Logout:
  curl -X POST http://localhost:5000/api/auth/logout -H "Authorization: Bearer <your_jwt_token>" -H "Content-Type: application/json"

- Change password:
  curl -X PUT http://localhost:5000/api/auth/change-password -H "Authorization: Bearer <your_jwt_token>" -H "Content-Type: application/json" -d '{"currentPassword":"TestPass123!","newPassword":"NewPass123!"}'

Troubleshooting
- If the server logs show "PostgreSQL (Sequelize) connected" and "Sequelize models synced", the DB connection is OK.
- Remove any remaining MONGO env vars; the app is Postgres-only.