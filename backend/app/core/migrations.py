"""
Lightweight startup migrations for columns that create_all() won't add
to existing tables. Uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS (Postgres 9.6+).
"""

import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)

_COLUMN_MIGRATIONS: list[tuple[str, str, str]] = [
    # (table, column, column_definition)
    ("applications", "cover_letter", "TEXT"),
    ("applications", "resume_url", "VARCHAR(1000)"),
    ("applications", "custom_answers", "JSONB"),
    ("applications", "assessment_score", "INTEGER"),
    ("applications", "interview_score", "INTEGER"),
    ("applications", "in_person_scheduled_at", "TIMESTAMP WITHOUT TIME ZONE"),
    ("applications", "in_person_notes", "TEXT"),
    ("applications", "offer_sent_at", "TIMESTAMP WITHOUT TIME ZONE"),
    ("applications", "assessment_deadline_at", "TIMESTAMP WITHOUT TIME ZONE"),
    ("applications", "updated_at", "TIMESTAMP DEFAULT NOW()"),
    ("candidate_profiles", "resume_score", "DOUBLE PRECISION"),
    ("candidate_profiles", "resume_score_justification", "TEXT"),
    ("candidate_profiles", "expected_salary_min", "INTEGER"),
    ("candidate_profiles", "expected_salary_max", "INTEGER"),
    ("jobs", "company_id", "VARCHAR(36)"),
]


async def run_startup_migrations(engine: AsyncEngine) -> None:
    """Add missing columns to existing tables. Each migration runs in its own transaction."""
    for table, column, col_def in _COLUMN_MIGRATIONS:
        try:
            async with engine.begin() as conn:
                stmt = text(
                    f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_def}"
                )
                await conn.execute(stmt)
            logger.info("Ensured column %s.%s exists", table, column)
        except Exception as e:
            err = str(e).lower()
            if "already exists" in err or "duplicate" in err:
                logger.info("Column %s.%s already exists", table, column)
            else:
                logger.error("Migration for %s.%s failed: %s", table, column, e)
                raise
