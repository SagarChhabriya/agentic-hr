from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.candidate_profile import CandidateProfile
from app.schemas.candidate_profile import CandidateProfileUpdate, CandidateProfileResponse

router = APIRouter(prefix="/profile", tags=["profile"])

MAX_RESUME_SIZE = 5 * 1024 * 1024  # 5 MB


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
    # Serialize pydantic sub-models to dicts for JSON columns
    if "education" in data and data["education"] is not None:
        data["education"] = [e.model_dump() if hasattr(e, "model_dump") else e for e in data["education"]]
    if "work_experience" in data and data["work_experience"] is not None:
        data["work_experience"] = [e.model_dump() if hasattr(e, "model_dump") else e for e in data["work_experience"]]
    for k, v in data.items():
        setattr(profile, k, v)
    await db.flush()
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

    # AI-rank resume format/structure in background
    try:
        import pdfplumber, io
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        if text.strip():
            from app.core.ai import rank_resume
            ranking = rank_resume(text)
            profile.resume_score = ranking.get("score")
            profile.resume_score_justification = ranking.get("justification", "")
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
