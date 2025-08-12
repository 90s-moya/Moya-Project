# app/services/report_services.py
from typing import List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from app.models import EvaluationSession, QuestionAnswerPair

def list_reports_by_user(db: Session, user_id: str) -> List[Dict[str, Any]]:
    sessions = (
        db.query(EvaluationSession)
        .options(joinedload(EvaluationSession.qa_pairs))
        .filter(EvaluationSession.user_id == user_id)
        .order_by(EvaluationSession.created_at.desc())
        .all()
    )

    reports = []
    for s in sessions:
        results = sorted(
            s.qa_pairs,
            key=lambda x: (x.order, x.sub_order, x.created_at or x.id)
        )
        reports.append({
            "report_id": s.id,
            "title": s.title,  # EvaluationSession.title
            "results": [
                {
                    "result_id": r.id,
                    "created_at": (r.created_at.isoformat() + "Z") if r.created_at else None,
                    "status": getattr(r, "status", None),            # QuestionAnswerPair.status
                    "order": r.order,
                    "suborder": r.sub_order,
                    "question": r.question,
                    "thumbnail_url": getattr(r, "thumbnail_url", None)
                }
                for r in results
            ]
        })
    return reports


def get_report_by_id(db: Session, session_id: str) -> Dict[str, Any] | None:
    s = (
        db.query(EvaluationSession)
        .options(joinedload(EvaluationSession.qa_pairs))
        .filter(EvaluationSession.id == session_id)
        .first()
    )
    if not s:
        return None

    results = sorted(s.qa_pairs, key=lambda x: (x.order, x.sub_order, x.created_at or x.id))
    return {
        "report_id": s.id,
        "title": s.title,
        "results": [
            {
                "result_id": r.id,
                "created_at": (r.created_at.isoformat() + "Z") if r.created_at else None,
                "status": getattr(r, "status", None),
                "order": r.order,
                "suborder": r.sub_order,
                "question": r.question,
                "thumbnail_url": getattr(r, "thumbnail_url", None)
            }
            for r in results
        ]
    }
