from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, require_platform_admin
from app.models.user import User
from app.models.company import Company
from app.schemas.company import CompanyUpsert, CompanyResponse, CompanyRejectRequest

router = APIRouter(prefix="/companies", tags=["companies"])


def _to_response(c: Company) -> CompanyResponse:
    return CompanyResponse(
        id=c.id,
        owner_user_id=c.owner_user_id,
        name=c.name,
        website=c.website,
        description=c.description,
        industry=c.industry,
        company_size=c.company_size,
        headquarters=c.headquarters,
        logo_url=c.logo_url,
        verification_status=c.verification_status,
        rejection_reason=c.rejection_reason,
        verified_at=c.verified_at,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


@router.get("/me", response_model=Optional[CompanyResponse])
async def get_my_company(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.execute(select(Company).where(Company.owner_user_id == current_user.id))
    row = result.scalar_one_or_none()
    return _to_response(row) if row else None


@router.put("/me", response_model=CompanyResponse)
async def upsert_my_company(
    body: CompanyUpsert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role == "ADMIN":
        raise HTTPException(status_code=400, detail="Admins do not maintain employer company profiles here")

    result = await db.execute(select(Company).where(Company.owner_user_id == current_user.id))
    company = result.scalar_one_or_none()

    if company:
        company.name = body.name
        company.website = body.website
        company.description = body.description
        company.industry = body.industry
        company.company_size = body.company_size
        company.headquarters = body.headquarters
        company.logo_url = body.logo_url
        if company.verification_status == "verified":
            company.verification_status = "pending"
            company.verified_at = None
            company.verified_by_user_id = None
            company.rejection_reason = None
        elif company.verification_status == "rejected":
            company.verification_status = "pending"
            company.rejection_reason = None
    else:
        company = Company(
            owner_user_id=current_user.id,
            name=body.name,
            website=body.website,
            description=body.description,
            industry=body.industry,
            company_size=body.company_size,
            headquarters=body.headquarters,
            logo_url=body.logo_url,
            verification_status="pending",
        )
        db.add(company)

    await db.commit()
    await db.refresh(company)
    return _to_response(company)


@router.get("/pending", response_model=list[CompanyResponse])
async def list_pending_companies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    result = await db.execute(
        select(Company).where(Company.verification_status == "pending").order_by(Company.created_at.asc())
    )
    return [_to_response(c) for c in result.scalars().all()]


@router.post("/{company_id}/verify", response_model=CompanyResponse)
async def verify_company(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    from datetime import datetime

    company.verification_status = "verified"
    company.rejection_reason = None
    company.verified_at = datetime.utcnow()
    company.verified_by_user_id = current_user.id
    await db.commit()
    await db.refresh(company)
    return _to_response(company)


@router.post("/{company_id}/reject", response_model=CompanyResponse)
async def reject_company(
    company_id: str,
    body: CompanyRejectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    company.verification_status = "rejected"
    company.rejection_reason = body.reason
    company.verified_at = None
    company.verified_by_user_id = None
    await db.commit()
    await db.refresh(company)
    return _to_response(company)
