import json
import logging
import re

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.candidate_profile import CandidateProfile
from app.schemas.candidate_profile import CandidateProfileUpdate, CandidateProfileResponse

router = APIRouter(prefix="/profile", tags=["profile"])
logger = logging.getLogger(__name__)

MAX_RESUME_SIZE = 5 * 1024 * 1024  # 5 MB


def _parse_json_from_llm(raw: str) -> dict | None:
    """Parse JSON from LLM output; tolerate markdown code fences."""
    s = (raw or "").strip()
    if not s:
        return None
    m = re.search(r"```(?:json)?\s*(\{[\s\S]*\})\s*```", s)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    start = s.find("{")
    end = s.rfind("}") + 1
    if start < 0 or end <= start:
        return None
    try:
        return json.loads(s[start:end])
    except json.JSONDecodeError:
        return None


def _apply_resume_extraction(profile: CandidateProfile, parsed: dict) -> None:
    """Apply extracted resume fields (overwrite when AI returns a value)."""
    if parsed.get("phone"):
        profile.phone = str(parsed["phone"])[:50]
    if parsed.get("address"):
        profile.address = str(parsed["address"])[:500]
    if parsed.get("city"):
        profile.city = str(parsed["city"])[:100]
    if parsed.get("country"):
        profile.country = str(parsed["country"])[:100]
    if parsed.get("bio"):
        profile.bio = str(parsed["bio"])[:5000]
    skills = parsed.get("skills")
    if isinstance(skills, list) and skills:
        profile.skills = [str(x).strip() for x in skills if str(x).strip()][:80]
    if parsed.get("experience_years") is not None:
        try:
            ey = int(parsed["experience_years"])
            if 0 <= ey <= 80:
                profile.experience_years = ey
        except (TypeError, ValueError):
            pass
    edu = parsed.get("education")
    if isinstance(edu, list) and edu:
        profile.education = edu
    wx = parsed.get("work_experience")
    if isinstance(wx, list) and wx:
        profile.work_experience = wx
    if parsed.get("linkedin_url"):
        profile.linkedin_url = str(parsed["linkedin_url"])[:500]
    if parsed.get("github_url"):
        profile.github_url = str(parsed["github_url"])[:500]
    if parsed.get("portfolio_url"):
        profile.portfolio_url = str(parsed["portfolio_url"])[:500]


def _to_response(profile: CandidateProfile, user: User) -> CandidateProfileResponse:
    return CandidateProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        email=user.email,
        first_name=user.first_name or "",
        last_name=user.last_name or "",
        phone=profile.phone,
        address=profile.address,
        city=profile.city,
        country=profile.country,
        bio=profile.bio,
        skills=profile.skills or [],
        experience_years=profile.experience_years,
        education=profile.education or [],
        work_experience=profile.work_experience or [],
        linkedin_url=profile.linkedin_url,
        portfolio_url=profile.portfolio_url,
        github_url=profile.github_url,
        resume_url=profile.resume_url,
        resume_filename=profile.resume_filename,
        resume_score=profile.resume_score,
        resume_score_justification=profile.resume_score_justification,
        expected_salary_min=profile.expected_salary_min,
        expected_salary_max=profile.expected_salary_max,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.get("", response_model=CandidateProfileResponse)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = CandidateProfile(user_id=current_user.id)
        db.add(profile)
        await db.flush()
        await db.refresh(profile)
    return _to_response(profile, current_user)


@router.put("", response_model=CandidateProfileResponse)
async def update_profile(
    body: CandidateProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = CandidateProfile(user_id=current_user.id)
        db.add(profile)
        await db.flush()

    data = body.model_dump(exclude_unset=True)
    for k in ("expected_salary_min", "expected_salary_max"):
        if k in data and data[k] is not None:
            try:
                data[k] = int(data[k])
            except (ValueError, TypeError):
                data[k] = None
    # Serialize pydantic sub-models to dicts for JSON columns
    if "education" in data and data["education"] is not None:
        data["education"] = [e.model_dump() if hasattr(e, "model_dump") else e for e in data["education"]]
    if "work_experience" in data and data["work_experience"] is not None:
        data["work_experience"] = [e.model_dump() if hasattr(e, "model_dump") else e for e in data["work_experience"]]
    for k, v in data.items():
        setattr(profile, k, v)
    await db.flush()

    # Re-evaluate resume score when profile is updated and resume exists
    if profile.resume_url:
        try:
            import httpx
            import pdfplumber
            import io
            from app.core.ai import rank_resume
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(profile.resume_url)
                if resp.status_code == 200 and resp.content:
                    with pdfplumber.open(io.BytesIO(resp.content)) as pdf:
                        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
                    if text.strip():
                        ranking = rank_resume(text)
                        raw_score = ranking.get("score", 0.5)
                        profile.resume_score = round(float(raw_score) * 100, 1) if raw_score is not None else None
                        profile.resume_score_justification = ranking.get("justification", "")
                        await db.flush()
        except Exception:
            pass

    await db.refresh(profile)
    return _to_response(profile, current_user)


@router.post("/resume", response_model=CandidateProfileResponse)
async def upload_resume(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    contents = await file.read()
    if len(contents) > MAX_RESUME_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5 MB limit")

    from app.core.storage import upload_resume as storage_upload, delete_resume as storage_delete

    result = await db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = CandidateProfile(user_id=current_user.id)
        db.add(profile)
        await db.flush()

    if profile.resume_url:
        try:
            storage_delete(profile.resume_url)
        except Exception:
            pass

    url = storage_upload(contents, current_user.id, file.filename)
    profile.resume_url = url
    profile.resume_filename = file.filename

    try:
        import pdfplumber
        import io

        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        if text.strip():
            from app.core.ai import rank_resume, _chat

            ranking = rank_resume(text)
            raw_score = ranking.get("score", 0.5)
            profile.resume_score = round(float(raw_score) * 100, 1) if raw_score is not None else None
            profile.resume_score_justification = ranking.get("justification", "")

            try:
                extract_prompt = (
                    "Extract ALL structured data from this resume. Return ONLY valid JSON with keys: "
                    "phone, address, city, country, bio (2-3 sentence professional summary), "
                    "skills (array of strings), experience_years (integer or null), "
                    "education (array of {institution, degree, field_of_study, start_year, end_year}), "
                    "work_experience (array of {company, title, description, start_date, end_date, current}), "
                    "linkedin_url, github_url, portfolio_url. Use null for unknown. "
                    "Never guess city, country, or address — only fill from explicit resume text; otherwise null. "
                    "Include EVERY job in work_experience."
                )
                raw = _chat(
                    extract_prompt,
                    f"Resume text:\n{text[:12000]}",
                    temperature=0.2,
                    max_tokens=4096,
                )
                parsed = _parse_json_from_llm(raw)
                if parsed:
                    _apply_resume_extraction(profile, parsed)
                else:
                    logger.warning("Resume JSON extraction returned no parseable object")
            except Exception as e:
                logger.warning("Resume field extraction failed: %s", e)
    except Exception:
        pass

    await db.flush()
    await db.refresh(profile)
    return _to_response(profile, current_user)


@router.delete("/resume", response_model=CandidateProfileResponse)
async def remove_resume(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile or not profile.resume_url:
        raise HTTPException(status_code=404, detail="No resume found")

    from app.core.storage import delete_resume as storage_delete
    try:
        storage_delete(profile.resume_url)
    except Exception:
        pass

    profile.resume_url = None
    profile.resume_filename = None
    await db.flush()
    await db.refresh(profile)
    return _to_response(profile, current_user)
