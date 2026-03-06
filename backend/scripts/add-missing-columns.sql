-- Run this script against your Azure PostgreSQL database to fix the grey screen.
-- Connect using: psql "your-connection-string" or Azure Portal Query Editor
-- Or use: Azure Data Studio, pgAdmin, or any PostgreSQL client

-- Add missing columns to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS cover_letter TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_url VARCHAR(1000);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS custom_answers JSONB;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS assessment_score INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_score INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add missing columns to candidate_profiles table (if needed)
ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS resume_score DOUBLE PRECISION;
ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS resume_score_justification TEXT;
ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS expected_salary_min INTEGER;
ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS expected_salary_max INTEGER;
