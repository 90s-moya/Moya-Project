# app/routers/report.py
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import EvaluationSession
from app.services.report_service import (
    list_reports_by_user,
    get_report_by_id,
    get_result_by_id,
    get_result_detail_by_id,
    get_result_detail_secure,
    update_report_title as svc_update_report_title,
)
from app.utils.uuid_tools import to_uuid_bytes

router = APIRouter(prefix="/reports", tags=["reports"])

class ReportRequest(BaseModel):
    user_id: UUID

class TitleUpdateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="변경할 보고서 제목")

@router.post("", summary="사용자별 리포트 목록")
def list_reports(req: ReportRequest, db: Session = Depends(get_db)):
    return list_reports_by_user(db, str(req.user_id))

@router.get("/{report_id}", summary="단일 리포트 상세")
def get_report(report_id: str, db: Session = Depends(get_db)):
    data = get_report_by_id(db, report_id)
    if not data:
        raise HTTPException(status_code=404, detail="Report not found")
    return data

@router.get("/{report_id}/results/{result_id}/detail", summary="리절트 상세(보안 검증)")
def read_result_detail_secure(
    report_id: str,
    result_id: str,
    user_id: str = Query(..., description="소유자 검증용 사용자 ID"),
    db: Session = Depends(get_db),
):
    try:
        data = get_result_detail_secure(db, report_id, result_id, user_id)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not data:
        raise HTTPException(status_code=404, detail="Result not found")
    return data

@router.post("/{report_id}/title", summary="리포트 타이틀 수정(보안 검증)")
def update_report_title(
    report_id: str,
    body: TitleUpdateRequest,
    user_id: str = Query(..., description="소유자 검증용 사용자 ID"),
    db: Session = Depends(get_db),
):
    # 1) 존재 + 소유자 검증
    s = db.query(EvaluationSession).filter(EvaluationSession.id == to_uuid_bytes(report_id)).first()
    if not s:
        raise HTTPException(status_code=404, detail="Report not found")
    if s.user_id != to_uuid_bytes(user_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    # 2) 업데이트
    ok = svc_update_report_title(db, report_id, body.title)
    if not ok:
        raise HTTPException(status_code=404, detail="Report not found")

    return {
        "report_id": report_id,
        "title": body.title,
        "updated": True,
    }
