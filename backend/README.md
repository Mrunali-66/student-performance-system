# Student Performance Management System — Backend

Flask + MySQL authentication backend with JWT, bcrypt, role-based and branch-based access control.

---

## Tech Stack

| Layer         | Technology                         |
|---------------|------------------------------------|
| Framework     | Flask 3.0                          |
| Database      | MySQL 8+ via PyMySQL               |
| ORM           | Flask-SQLAlchemy 3.1               |
| Auth          | Flask-JWT-Extended 4.6             |
| Password hash | bcrypt 4.2                         |
| CORS          | Flask-Cors 4.0                     |
| Config        | python-dotenv                      |

---

## Folder Structure

```
backend/
├── app.py                   # Application factory + entry point
├── config.py                # Centralized config (reads .env)
├── requirements.txt
├── .env.example             # Copy to .env and fill in values
│
├── database/
│   ├── __init__.py          # SQLAlchemy db instance
│   └── init_db.py           # Raw DDL — creates DB + tables
│
├── models/
│   ├── __init__.py
│   ├── user.py              # users table ORM model
│   └── token_blocklist.py   # revoked JWTs (logout support)
│
├── routes/
│   ├── __init__.py
│   └── auth_routes.py       # /api/auth/* blueprint
│
├── services/
│   ├── __init__.py
│   └── auth_service.py      # Register / Login / Logout logic
│
├── middleware/
│   ├── __init__.py
│   └── rbac.py              # role_required / branch_required decorators
│
└── utils/
    ├── __init__.py
    ├── validators.py         # Input validation
    └── responses.py         # Standardized JSON helpers
```

---

## Database Schema

### `users`
| Column       | Type                          | Notes                        |
|--------------|-------------------------------|------------------------------|
| id           | INT PK AUTO_INCREMENT         |                              |
| username     | VARCHAR(80) UNIQUE NOT NULL   | Duplicate check on register  |
| password     | VARCHAR(255) NOT NULL         | bcrypt hash                  |
| role         | ENUM('student','teacher')     |                              |
| branch       | ENUM(4 branches)              | See allowed values below     |
| created_at   | DATETIME DEFAULT NOW()        |                              |

**Allowed branches:**
- `Data Science`
- `Python Development`
- `Java Development`
- `AI & Machine Learning`

### `token_blocklist`
| Column     | Type              | Notes                    |
|------------|-------------------|--------------------------|
| id         | INT PK            |                          |
| jti        | VARCHAR(36) UNIQUE| JWT ID added on logout   |
| created_at | DATETIME          |                          |

---

## API Endpoints

All auth endpoints are prefixed with `/api/auth`.

### POST `/api/auth/register`
Register a new user.

**Request body:**
```json
{
  "username": "john_doe",
  "password": "secret123",
  "role": "student",
  "branch": "Data Science"
}
```

**Success 201:**
```json
{
  "message": "Registration successful.",
  "token": "<JWT>",
  "user": { "id": 1, "username": "john_doe", "role": "student", "branch": "Data Science", "created_at": "..." }
}
```

**Errors:**
- `400` — validation error (missing/invalid fields)
- `409` — username already taken

---

### POST `/api/auth/login`
Login with credentials.

**Request body:**
```json
{ "username": "john_doe", "password": "secret123" }
```

**Success 200:**
```json
{
  "message": "Login successful.",
  "token": "<JWT>",
  "user": { "id": 1, "username": "john_doe", "role": "student", "branch": "Data Science", "created_at": "..." }
}
```

**Errors:**
- `400` — missing fields
- `401` — invalid credentials

---

### POST `/api/auth/logout`
Revoke the current JWT (token blocklist).

**Headers:** `Authorization: Bearer <token>`

**Success 200:**
```json
{ "message": "Logged out successfully." }
```

---

### GET `/api/auth/me`
Get the current user's profile.

**Headers:** `Authorization: Bearer <token>`

**Success 200:**
```json
{ "user": { "id": 1, "username": "john_doe", "role": "student", "branch": "Data Science", "created_at": "..." } }
```

---

### GET `/api/auth/verify`
Validate a stored JWT (used on frontend page refresh).

**Headers:** `Authorization: Bearer <token>`

**Success 200:**
```json
{ "valid": true, "user": { ... } }
```

---

### GET `/api/branches`
Public — returns all allowed branches.

```json
{ "branches": ["Data Science", "Python Development", "Java Development", "AI & Machine Learning"] }
```

---

### GET `/health`
Public health check.

```json
{ "status": "ok", "message": "Student Performance Management System API is running." }
```

---

## RBAC Decorators (middleware/rbac.py)

Use these decorators on any future route after `@jwt_required()`:

```python
from flask_jwt_extended import jwt_required
from middleware.rbac import teacher_required, student_required, branch_required

@app.route("/teacher/dashboard")
@jwt_required()
@teacher_required          # 403 if role != teacher
def teacher_dashboard():
    ...

@app.route("/ds-only")
@jwt_required()
@branch_required("Data Science", "AI & Machine Learning")   # 403 if wrong branch
def ds_only():
    ...
```

---

## Setup Instructions

### 1. Prerequisites
- Python 3.11+
- MySQL 8.0+

### 2. Clone / place files
```bash
cd your_project/
# place the backend/ folder here
```

### 3. Create virtual environment
```bash
cd backend/
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 4. Install dependencies
```bash
pip install -r requirements.txt
```

### 5. Configure environment
```bash
cp .env.example .env
# Open .env and fill in:
#   DB_PASSWORD=your_mysql_root_password
#   JWT_SECRET_KEY=a_long_random_string
```

### 6. MySQL — create the database user (optional but recommended)
```sql
-- In MySQL shell
CREATE USER 'spms_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON student_performance_db.* TO 'spms_user'@'localhost';
FLUSH PRIVILEGES;
```
Then update `DB_USER` and `DB_PASSWORD` in `.env`.

### 7. Run the server
```bash
python app.py
```

The app will:
1. Create `student_performance_db` database if it doesn't exist
2. Create `users` and `token_blocklist` tables
3. Start on `http://localhost:5000`

---

## Quick test with curl

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"pass123","role":"student","branch":"Data Science"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"pass123"}'

# Me (replace TOKEN)
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer TOKEN"

# Logout
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer TOKEN"
```

---

## Security notes

- Passwords are hashed with **bcrypt** (adaptive cost factor, never stored in plaintext)
- JWTs contain `role` and `branch` claims — no DB lookup needed for RBAC
- Logout is implemented via **token blocklist** — revoked tokens are permanently rejected
- JWT secret key is loaded from `.env` — never hardcode it
- CORS is restricted to the frontend origin defined in `.env`
