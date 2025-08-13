# app/routers/report.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.report_service import list_reports_by_user, get_report_by_id,get_result_by_id,get_result_detail_by_id,get_result_detail_secure
from pydantic import BaseModel
router = APIRouter(prefix="/reports", tags=["reports"])

class ReportRequest(BaseModel):
    user_id: str

@router.post("", summary="사용자별 리포트 목록")
def list_reports(req: ReportRequest, db: Session = Depends(get_db)):
    return list_reports_by_user(db, req.user_id)

@router.get("/{report_id}", summary="단일 리포트 상세")
def get_report(report_id: str, db: Session = Depends(get_db)):
    data = get_report_by_id(db, report_id)
    if not data:
        raise HTTPException(status_code=404, detail="Report not found")
    return data

# (신규) 단건 조회
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
        # 존재 X 또는 report-result 불일치
        raise HTTPException(status_code=404, detail="Result not found")
    return data