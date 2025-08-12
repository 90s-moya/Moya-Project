# app/routers/report.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.report_service import list_reports_by_user, get_report_by_id,get_result_by_id,get_result_detail_by_id
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
@router.get("/results/{result_id}", summary="리절트 단건 조회")
def get_result(result_id: str, db: Session = Depends(get_db)):
    data = get_result_by_id(db, result_id)
    if not data:
        raise HTTPException(status_code=404, detail="Result not found")
    return data

@router.get("/results/{result_id}/detail", summary="리절트 상세(비디오+분석 전체) 조회")
def get_result_detail(result_id: str, db: Session = Depends(get_db)):
    data = get_result_detail_by_id(db, result_id)
    if not data:
        raise HTTPException(status_code=404, detail="Result not found")
    return data