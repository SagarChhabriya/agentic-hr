"""
migrate_to_supabase.py  –  standalone, uses asyncpg directly
=============================================================
Creates all tables in Supabase then bulk-imports CSV exports.

Usage (from e:\\agentic-hr\\backend):
  pip install asyncpg
  python scripts/migrate_to_supabase.py --csv-dir "e:\\agentic-hr\\csv_export"
"""

import asyncio
import csv
import os
import sys
import ssl
import json
import argparse
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlparse, unquote

# ── load .env manually (avoids multi-line JSON parse errors) ───────────────
_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    for _line in _env_path.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if not _line or _line.startswith("#") or "=" not in _line:
            continue
        _key, _, _val = _line.partition("=")
        _key = _key.strip()
        _val = _val.strip()
        # Skip multi-line / JSON / compound values
        if _key and " " not in _key and "{" not in _val and "\n" not in _val:
            os.environ.setdefault(_key, _val)

import asyncpg


# ── DDL for every table (in FK-safe creation order) ───────────────────────
# We generate DDL inline so we never import app.core (which creates an
# engine against Azure at module load time).

_DDL = [
    """
    CREATE TABLE IF NOT EXISTS users (
        id          TEXT PRIMARY KEY,
        email       TEXT,
        name        TEXT,
        role        TEXT,
        clerk_id    TEXT,
        created_at  TIMESTAMPTZ,
        updated_at  TIMESTAMPTZ
    )""",
    """
    CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          TEXT PRIMARY KEY,
        user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
        token       TEXT,
        expires_at  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ
    )""",
    """
    CREATE TABLE IF NOT EXISTS jobs (
        id               TEXT PRIMARY KEY,
        recruiter_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
        title            TEXT,
        description      TEXT,
        requirements     TEXT,
        location         TEXT,
        employment_type  TEXT,
        experience_level TEXT,
        salary_min       INTEGER,
        salary_max       INTEGER,
        skills_required  JSONB,
        is_active        BOOLEAN,
        created_at       TIMESTAMPTZ,
        updated_at       TIMESTAMPTZ
    )""",
    """
    CREATE TABLE IF NOT EXISTS candidate_profiles (
        id          TEXT PRIMARY KEY,
        user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
        resume_url  TEXT,
        skills      JSONB,
        experience  INTEGER,
        education   TEXT,
        bio         TEXT,
        created_at  TIMESTAMPTZ,
        updated_at  TIMESTAMPTZ
    )""",
    """
    CREATE TABLE IF NOT EXISTS applications (
        id                      TEXT PRIMARY KEY,
        job_id                  TEXT REFERENCES jobs(id) ON DELETE CASCADE,
        candidate_id            TEXT REFERENCES users(id) ON DELETE CASCADE,
        status                  TEXT,
        cover_letter            TEXT,
        resume_url              TEXT,
        assessment_score        INTEGER,
        interview_score         INTEGER,
        offer_sent_at           TIMESTAMPTZ,
        in_person_scheduled_at  TIMESTAMPTZ,
        in_person_notes         TEXT,
        applied_at              TIMESTAMPTZ,
        updated_at              TIMESTAMPTZ
    )""",
    """
    CREATE TABLE IF NOT EXISTS custom_questions (
        id          TEXT PRIMARY KEY,
        job_id      TEXT REFERENCES jobs(id) ON DELETE CASCADE,
        question    TEXT,
        created_at  TIMESTAMPTZ
    )""",
    """
    CREATE TABLE IF NOT EXISTS assessments (
        id           TEXT PRIMARY KEY,
        job_id       TEXT REFERENCES jobs(id) ON DELETE CASCADE,
        title        TEXT,
        description  TEXT,
        time_limit   INTEGER,
        pass_score   INTEGER,
        created_at   TIMESTAMPTZ,
        updated_at   TIMESTAMPTZ
    )""",
    """
    CREATE TABLE IF NOT EXISTS assessment_questions (
        id             TEXT PRIMARY KEY,
        assessment_id  TEXT REFERENCES assessments(id) ON DELETE CASCADE,
        question       TEXT,
        options        JSONB,
        correct_answer TEXT,
        order_index    INTEGER
    )""",
    """
    CREATE TABLE IF NOT EXISTS assessment_attempts (
        id             TEXT PRIMARY KEY,
        application_id TEXT REFERENCES applications(id) ON DELETE CASCADE,
        assessment_id  TEXT REFERENCES assessments(id) ON DELETE CASCADE,
        answers        JSONB,
        score          INTEGER,
        passed         BOOLEAN,
        started_at     TIMESTAMPTZ,
        completed_at   TIMESTAMPTZ
    )""",
    """
    CREATE TABLE IF NOT EXISTS job_custom_questions (
        id          TEXT PRIMARY KEY,
        job_id      TEXT REFERENCES jobs(id) ON DELETE CASCADE,
        question_id TEXT REFERENCES custom_questions(id) ON DELETE CASCADE
    )""",
    """
    CREATE TABLE IF NOT EXISTS interviews (
        id             TEXT PRIMARY KEY,
        application_id TEXT REFERENCES applications(id) ON DELETE CASCADE,
        room_name      TEXT,
        status         TEXT,
        scheduled_at   TIMESTAMPTZ,
        started_at     TIMESTAMPTZ,
        ended_at       TIMESTAMPTZ,
        created_at     TIMESTAMPTZ
    )""",
    """
    CREATE TABLE IF NOT EXISTS interview_sessions (
        id              TEXT PRIMARY KEY,
        interview_id    TEXT REFERENCES interviews(id) ON DELETE CASCADE,
        chat_transcript JSONB,
        llm_summary     TEXT,
        video_url       TEXT,
        created_at      TIMESTAMPTZ,
        updated_at      TIMESTAMPTZ
    )""",
    """
    CREATE TABLE IF NOT EXISTS interview_analyses (
        id           TEXT PRIMARY KEY,
        interview_id TEXT REFERENCES interviews(id) ON DELETE CASCADE,
        raw_analysis JSONB,
        created_at   TIMESTAMPTZ
    )""",
]

# Table names in the same FK-safe order as _DDL
_TABLE_ORDER = [
    "users", "refresh_tokens", "jobs", "candidate_profiles",
    "applications", "custom_questions", "assessments",
    "assessment_questions", "assessment_attempts",
    "job_custom_questions", "interviews",
    "interview_sessions", "interview_analyses",
]

# Exact columns accepted by each table (CSV columns NOT in this set are ignored)
_TABLE_COLS = {
    "users":                {"id", "email", "name", "role", "clerk_id", "created_at", "updated_at"},
    "refresh_tokens":       {"id", "user_id", "token", "expires_at", "created_at"},
    "jobs":                 {"id", "recruiter_id", "title", "description", "requirements",
                             "location", "employment_type", "experience_level",
                             "salary_min", "salary_max", "skills_required", "is_active",
                             "created_at", "updated_at"},
    "candidate_profiles":   {"id", "user_id", "resume_url", "skills", "experience",
                             "education", "bio", "created_at", "updated_at"},
    "applications":         {"id", "job_id", "candidate_id", "status", "cover_letter",
                             "resume_url", "assessment_score", "interview_score",
                             "offer_sent_at", "in_person_scheduled_at", "in_person_notes",
                             "applied_at", "updated_at"},
    "custom_questions":     {"id", "job_id", "question", "created_at"},
    "assessments":          {"id", "job_id", "title", "description", "time_limit",
                             "pass_score", "created_at", "updated_at"},
    "assessment_questions": {"id", "assessment_id", "question", "options",
                             "correct_answer", "order_index"},
    "assessment_attempts":  {"id", "application_id", "assessment_id", "answers",
                             "score", "passed", "started_at", "completed_at"},
    "job_custom_questions": {"id", "job_id", "question_id"},
    "interviews":           {"id", "application_id", "room_name", "status",
                             "scheduled_at", "started_at", "ended_at", "created_at"},
    "interview_sessions":   {"id", "interview_id", "chat_transcript", "llm_summary",
                             "video_url", "created_at", "updated_at"},
    "interview_analyses":   {"id", "interview_id", "raw_analysis", "created_at"},
}

# Columns that hold JSON / array data (stored as text in CSV → parse to dict/list)
_JSON_COLS = {
    "jobs": {"skills_required"},
    "candidate_profiles": {"skills"},
    "assessment_questions": {"options"},
    "assessment_attempts": {"answers"},
    "interview_sessions": {"chat_transcript"},
    "interview_analyses": {"raw_analysis"},
}


# ── Helpers ────────────────────────────────────────────────────────────────

def _parse_creds():
    """Return (host, port, user, password, database) from SUPABASE_DIRECT_URL."""
    raw = os.environ.get("SUPABASE_DIRECT_URL") or os.environ.get("SUPABASE_CONNECTION_URL") or ""
    if not raw:
        print("[ERROR] SUPABASE_DIRECT_URL not set in .env")
        sys.exit(1)
    # Strip driver prefix so urlparse works
    for prefix in ("postgresql+asyncpg://", "postgresql://"):
        if raw.startswith(prefix):
            raw = "http://" + raw[len(prefix):]
            break
    p = urlparse(raw)
    return {
        "host":     p.hostname,
        "port":     p.port or 5432,
        "user":     unquote(p.username or "postgres"),
        "password": unquote(p.password or ""),
        "database": (p.path or "/postgres").lstrip("/") or "postgres",
    }


def _coerce(col_name: str, table_name: str, value: str):
    """Convert a CSV cell to a suitable Python type for asyncpg."""
    if value is None or value.strip() == "" or value.strip().upper() in ("NULL", "NONE", "\\N"):
        return None

    v = value.strip()

    # JSON / JSONB columns — asyncpg requires a JSON *string*, not a Python object
    if col_name in _JSON_COLS.get(table_name, set()):
        if v.startswith("{") or v.startswith("["):
            try:
                parsed = json.loads(v)
                return json.dumps(parsed)   # re-serialize to string for asyncpg
            except Exception:
                pass
        return None

    # Boolean
    if v.lower() in ("true", "t", "yes", "1"):
        return True
    if v.lower() in ("false", "f", "no", "0"):
        return False

    # Integer
    try:
        return int(v)
    except ValueError:
        pass

    # Float (don't coerce – keep as text unless clearly numeric)
    # Datetime
    for fmt in (
        "%Y-%m-%d %H:%M:%S.%f+00", "%Y-%m-%d %H:%M:%S+00",
        "%Y-%m-%d %H:%M:%S.%f%z",  "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S.%f",    "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f%z",  "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
    ):
        try:
            dt = datetime.strptime(v, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            pass

    return v  # plain string


# ── Core ───────────────────────────────────────────────────────────────────

async def run(csv_dir: Path) -> None:
    creds = _parse_creds()
    print(f"\nConnecting to {creds['host']} as {creds['user']} ...")

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    conn: asyncpg.Connection = await asyncpg.connect(
        host=creds["host"],
        port=creds["port"],
        user=creds["user"],
        password=creds["password"],
        database=creds["database"],
        ssl=ssl_ctx,
    )
    print("Connected.\n")

    # 1. Drop (reverse FK order) then recreate
    print("[1/2] Dropping old tables and recreating ...")
    for table_name in reversed(_TABLE_ORDER):
        await conn.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
    for ddl in _DDL:
        await conn.execute(ddl)
    print("      [OK] All tables ready.\n")

    # Disable FK / trigger checks for the import session
    try:
        await conn.execute("SET session_replication_role = replica")
        print("      (FK checks disabled for import)\n")
    except Exception:
        print("      (could not disable FK checks – will skip violating rows)\n")

    # 2. Import CSVs
    print(f"[2/2] Importing CSVs from: {csv_dir}\n")
    csv_files = {f.stem.lower(): f for f in csv_dir.glob("*.csv")}

    for table_name in _TABLE_ORDER:
        if table_name not in csv_files:
            print(f"      [SKIP]   {table_name:<28} no CSV file found")
            continue

        path = csv_files[table_name]
        known_cols = _TABLE_COLS.get(table_name, set())
        # Try UTF-8 first, fall back to Windows-1252 (common for Excel CSV exports)
        try:
            path.read_bytes().decode("utf-8")
            enc = "utf-8-sig"
        except UnicodeDecodeError:
            enc = "cp1252"
        with open(path, newline="", encoding=enc) as fh:
            reader = csv.DictReader(fh)
            all_headers = reader.fieldnames or []
            # Only keep columns that exist in our schema
            headers = [h for h in all_headers if h in known_cols]
            skipped = set(all_headers) - set(headers)
            if skipped:
                print(f"             (ignoring old columns: {', '.join(sorted(skipped))})")
            rows = []
            for raw_row in reader:
                rows.append({
                    col: _coerce(col, table_name, raw_row[col])
                    for col in headers
                })

        if not rows:
            print(f"      [EMPTY]  {table_name:<28} 0 rows")
            continue

        # Clear then insert (safe re-run)
        await conn.execute(f'DELETE FROM "{table_name}"')

        cols = list(rows[0].keys())
        col_list     = ", ".join(f'"{c}"' for c in cols)
        placeholders = ", ".join(f"${i+1}" for i in range(len(cols)))
        insert_sql   = f'INSERT INTO "{table_name}" ({col_list}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'

        records = [[r[c] for c in cols] for r in rows]
        try:
            await conn.executemany(insert_sql, records)
            print(f"      [OK] {table_name:<26} {len(rows):>5} row(s)")
        except Exception as exc:
            # Fall back to row-by-row so one bad row doesn't drop the whole table
            ok = bad = 0
            for rec in records:
                try:
                    await conn.execute(insert_sql, *rec)
                    ok += 1
                except Exception:
                    bad += 1
            print(f"      [WARN] {table_name:<24} {ok} ok / {bad} skipped (FK or data errors)")

    await conn.close()

    print("\n Migration complete!")
    print("\nNext step — update DATABASE_URL in .env AND Azure App Service to:")
    print(f"  postgresql+asyncpg://{creds['user']}:{creds['password']}@{creds['host']}:{creds['port']}/{creds['database']}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv-dir", required=True,
                        help="Folder containing .csv exports (filename = table name)")
    args = parser.parse_args()
    asyncio.run(run(Path(args.csv_dir)))
