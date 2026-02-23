from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.custom_question import CustomQuestion
from app.schemas.custom_question import CustomQuestionCreate, CustomQuestionUpdate, CustomQuestionResponse

router = APIRouter(prefix="/custom-questions", tags=["custom-questions"])


@router.get("", response_model=list[CustomQuestionResponse])
async def list_questions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.execute(
        select(CustomQuestion).where(CustomQuestion.created_by_id == current_user.id)
    )
    questions = result.scalars().all()
    return [CustomQuestionResponse.model_validate(q) for q in questions]


@router.post("", response_model=CustomQuestionResponse)
async def create_question(
    body: CustomQuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    q = CustomQuestion(
        question=body.question,
        type=body.type,
        required=body.required,
        created_by_id=current_user.id,
    )
    db.add(q)
    await db.flush()
    await db.refresh(q)
    return CustomQuestionResponse.model_validate(q)


@router.patch("/{question_id}", response_model=CustomQuestionResponse)
async def update_question(
    question_id: str,
    body: CustomQuestionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CustomQuestion).where(
            CustomQuestion.id == question_id,
            CustomQuestion.created_by_id == current_user.id,
        )
    )
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(q, k, v)
    await db.flush()
    await db.refresh(q)
    return CustomQuestionResponse.model_validate(q)


@router.delete("/{question_id}", status_code=204)
async def delete_question(
    question_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CustomQuestion).where(
            CustomQuestion.id == question_id,
            CustomQuestion.created_by_id == current_user.id,
        )
    )
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    await db.delete(q)
