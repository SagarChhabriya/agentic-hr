from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.job import Job
from app.models.application import Application
from app.models.assessment import Assessment, AssessmentQuestion
from app.models.assessment_attempt import AssessmentAttempt
from app.core.deadlines import assessment_deadline_utc, is_assessment_window_expired
from app.schemas.assessment import AssessmentCreate, AssessmentResponse

router = APIRouter(prefix="/assessments", tags=["assessments"])


class AddQuestionsBody(BaseModel):
    questions: list[dict] = Field(...)  # [{question_text, options, correct_index}]


class SubmitAttemptBody(BaseModel):
    application_id: str = Field(...)
    assessment_id: str = Field(...)
    answers: list[dict] = Field(...)  # [{question_id, selected_index}]


@router.get("", response_model=list[AssessmentResponse])
async def list_assessments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.execute(
        select(Assessment)
        .options(selectinload(Assessment.job))
        .where(Assessment.created_by_id == current_user.id)
    )
    assessments = result.unique().scalars().all()
    out = []
    for a in assessments:
        cnt_result = await db.execute(
            select(func.count(AssessmentQuestion.id)).where(AssessmentQuestion.assessment_id == a.id)
        )
        cnt = cnt_result.scalar() or 0
        out.append(
            AssessmentResponse(
                id=a.id,
                name=a.name,
                duration_minutes=a.duration_minutes,
                job_id=a.job_id,
                job_title=a.job.title if a.job else None,
                questions_count=cnt,
                created_at=a.created_at,
            )
        )
    return out


@router.post("", response_model=AssessmentResponse)
async def create_assessment(
    body: AssessmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    a = Assessment(
        name=body.name,
        duration_minutes=body.duration_minutes,
        job_id=body.job_id,
        created_by_id=current_user.id,
    )
    db.add(a)
    await db.flush()
    await db.refresh(a)
    if a.job_id:
        job_result = await db.execute(select(Job).where(Job.id == a.job_id))
        a.job = job_result.scalar_one_or_none()
    return AssessmentResponse(
        id=a.id,
        name=a.name,
        duration_minutes=a.duration_minutes,
        job_id=a.job_id,
        job_title=a.job.title if getattr(a, "job", None) else None,
        questions_count=0,
        created_at=a.created_at,
    )


@router.get("/{assessment_id}")
async def get_assessment(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recruiter fetches a single assessment with its questions."""
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.execute(
        select(Assessment)
        .options(selectinload(Assessment.questions), selectinload(Assessment.job))
        .where(Assessment.id == assessment_id, Assessment.created_by_id == current_user.id)
    )
    a = result.unique().scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    questions = sorted(a.questions, key=lambda q: q.order_index)
    return {
        "id": a.id,
        "name": a.name,
        "duration_minutes": a.duration_minutes,
        "job_id": a.job_id,
        "job_title": a.job.title if a.job else None,
        "created_at": a.created_at,
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "options": q.options,
                "correct_index": q.correct_index,
                "order_index": q.order_index,
            }
            for q in questions
        ],
    }


@router.delete("/{assessment_id}/questions")
async def clear_assessment_questions(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recruiter clears all questions from an assessment (to replace them)."""
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    a_result = await db.execute(
        select(Assessment).where(
            Assessment.id == assessment_id, Assessment.created_by_id == current_user.id
        )
    )
    a = a_result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    await db.execute(
        AssessmentQuestion.__table__.delete().where(AssessmentQuestion.assessment_id == assessment_id)
    )
    await db.flush()
    return {"ok": True}


@router.get("/{assessment_id}/for-attempt")
async def get_assessment_for_attempt(
    assessment_id: str,
    application_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Candidate gets assessment questions. Validates application belongs to them and job has this assessment."""
    if current_user.role != "CANDIDATE":
        raise HTTPException(status_code=403, detail="Candidates only")
    app_result = await db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.user_id == current_user.id,
        )
    )
    app = app_result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    a_result = await db.execute(
        select(Assessment)
        .options(selectinload(Assessment.questions))
        .where(Assessment.id == assessment_id, Assessment.job_id == app.job_id)
    )
    a = a_result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found for this application")
    if app.assessment_score is not None:
        raise HTTPException(status_code=400, detail="Assessment already completed")
    if is_assessment_window_expired(app):
        raise HTTPException(
            status_code=410,
            detail="The 24-hour assessment window has expired. Contact the recruiter for a new link.",
        )
    questions = sorted(a.questions, key=lambda q: q.order_index)
    return {
        "id": a.id,
        "name": a.name,
        "duration_minutes": a.duration_minutes,
        "application_id": application_id,
        "assessment_deadline_at": assessment_deadline_utc(app).isoformat(),
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "options": q.options,
                "order_index": q.order_index,
            }
            for q in questions
        ],
    }


@router.put("/{assessment_id}/questions")
async def add_assessment_questions(
    assessment_id: str,
    body: AddQuestionsBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recruiter adds questions to an assessment."""
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    a_result = await db.execute(
        select(Assessment).where(
            Assessment.id == assessment_id,
            Assessment.created_by_id == current_user.id,
        )
    )
    a = a_result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    for i, q in enumerate(body.questions):
        aq = AssessmentQuestion(
            assessment_id=a.id,
            question_text=q.get("question", q.get("question_text", "")),
            options=q.get("options", []),
            correct_index=int(q.get("correct_index", 0)),
            order_index=i,
        )
        db.add(aq)
    await db.flush()
    return {"ok": True, "added": len(body.questions)}


@router.post("/submit")
async def submit_assessment_attempt(
    body: SubmitAttemptBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Candidate submits assessment answers. Scores and stores the attempt with full answer details."""
    if current_user.role != "CANDIDATE":
        raise HTTPException(status_code=403, detail="Candidates only")
    app_result = await db.execute(
        select(Application).where(
            Application.id == body.application_id,
            Application.user_id == current_user.id,
        )
    )
    app = app_result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    a_result = await db.execute(
        select(Assessment)
        .options(selectinload(Assessment.questions))
        .where(Assessment.id == body.assessment_id, Assessment.job_id == app.job_id)
    )
    a = a_result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if app.assessment_score is not None:
        raise HTTPException(status_code=400, detail="Assessment already submitted")
    if is_assessment_window_expired(app):
        raise HTTPException(
            status_code=410,
            detail="The 24-hour assessment window has expired. Contact the recruiter for a new link.",
        )
    existing_attempt = await db.execute(
        select(AssessmentAttempt).where(
            AssessmentAttempt.application_id == app.id,
            AssessmentAttempt.assessment_id == a.id,
        )
    )
    if existing_attempt.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Assessment already submitted")
    q_map = {str(q.id): q for q in a.questions}
    correct = 0
    wrong = 0
    answers_with_result = []
    for ans in body.answers:
        qid = ans.get("question_id") or ans.get("questionId")
        sel = int(ans.get("selected_index", ans.get("selectedIndex", -1)))
        q = q_map.get(str(qid)) if qid else None
        is_correct = q and sel == q.correct_index if q else False
        if is_correct:
            correct += 1
        elif q and sel >= 0:
            wrong += 1
        answers_with_result.append({
            "question_id": qid,
            "question_text": q.question_text if q else None,
            "options": q.options if q else [],
            "correct_index": q.correct_index if q else None,
            "selected_index": sel,
            "is_correct": is_correct,
        })
    total = len(a.questions)
    score_pct = (correct / total * 100) if total else 0
    attempt = AssessmentAttempt(
        application_id=app.id,
        assessment_id=a.id,
        user_id=current_user.id,
        answers=answers_with_result,
        correct_count=correct,
        wrong_count=wrong,
        total_questions=total,
        score_percent=score_pct,
    )
    db.add(attempt)
    app.assessment_score = int(round(score_pct))
    # Keep pipeline on "assessment" after submit so candidate progress shows step 2 (not reset to "applied").
    app.status = "assessment"
    await db.flush()
    await db.refresh(attempt)
    return {
        "id": attempt.id,
        "correct_count": correct,
        "wrong_count": wrong,
        "total_questions": total,
        "score_percent": score_pct,
        "answers": answers_with_result,
    }
