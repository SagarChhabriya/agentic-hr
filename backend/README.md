# Backend API (FastAPI)

Python FastAPI backend for the HR Automation SaaS Platform.

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL (async via SQLAlchemy + asyncpg)
- **Authentication**: JWT (access + refresh tokens)
- **Validation**: Pydantic

## Project Structure

```
backend/
├── app/
│   ├── main.py           # App entry, CORS, routes
│   ├── core/             # Config, security, database
│   ├── models/           # SQLAlchemy models (User, RefreshToken)
│   ├── schemas/          # Pydantic request/response
│   └── api/              # Route modules (auth, deps)
├── requirements.txt
├── run.py                # Run with: python run.py
└── env.example
```

## Setup

1. **Create virtual environment**:
   ```bash
   python -m venv venv
   venv\Scripts\activate   # Windows
   # or: source venv/bin/activate  # Linux/Mac
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment variables** (create `backend/.env`):
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/postgres?pgbouncer=true
   JWT_ACCESS_SECRET=your-secret-min-32-chars
   JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
   CORS_ORIGIN=http://localhost:5173
   ```
   For Supabase use the Session pooler URI with `?pgbouncer=true`.

4. **Run the server**:
   ```bash
   python run.py
   # or: uvicorn app.main:app --reload --port 3000
   ```

API base: `http://localhost:3000/api/v1`  
Docs: `http://localhost:3000/docs`## API Endpoints- `POST /api/v1/auth/register` - Register (body: email, password, firstName, lastName, role)
- `POST /api/v1/auth/login` - Login (returns accessToken, refreshToken, user)
- `GET /api/v1/auth/profile` - Current user (Bearer token)
- `POST /api/v1/auth/refresh` - Refresh tokens (body: refreshToken)
- `GET /health` - Health check## DatabaseTables are created on startup from SQLAlchemy models (`User`, `RefreshToken`). For migrations later you can add Alembic.
