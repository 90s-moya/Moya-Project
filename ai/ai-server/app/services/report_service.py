# app/services/report_services.py
from typing import List, Dict, Any,Optional
from sqlalchemy.orm import Session, joinedload
from app.models import EvaluationSession, QuestionAnswerPair
import json
def get_result_by_id(db: Session, result_id: str) -> Optional[Dict[str, Any]]:
    r = (
        db.query(QuestionAnswerPair)
        .options(joinedload(QuestionAnswerPair.session))
        .filter(QuestionAnswerPair.id == result_id)
        .first()
    )
    if not r:
        return None

    created = r.created_at.isoformat() + "Z" if r.created_at else None

    return {
        "result_id": r.id,
        "report_id": r.session_id,
        "report_title": getattr(r.session, "title", None) if r.session else None,
        "created_at": created,
        "status": getattr(r, "status", None),              # 모델에 있으면 반환
        "order": r.order,
        "suborder": r.sub_order,
        "question": r.question,
        "answer": r.answer,
        "thumbnail_url": getattr(r, "thumbnail_url", None) # 모델에 있으면 반환
    }

def list_reports_by_user(db, user_id: str):
    sessions = (db.query(EvaluationSession)
                  .options(joinedload(EvaluationSession.qa_pairs))
                  .filter(EvaluationSession.user_id == user_id)
                  .order_by(EvaluationSession.created_at.desc())
                  .all())

    out = []
    for s in sessions:
        results = sorted(s.qa_pairs, key=lambda x: (x.order, x.sub_order, x.created_at or x.id))
        out.append({
            "report_id": s.id,
            "title": s.title,
            "results": [
                {
                    "result_id": r.id,
                    "created_at": r.created_at.isoformat() + "Z" if r.created_at else None,
                    "report_id": r.session_id,           # ✅ 채움
                    "report_title": s.title,             # ✅ 채움
                    "status": getattr(r, "status", None),
                    "order": r.order,
                    "suborder": r.sub_order,
                    "question": r.question,
                    "answer": r.answer,
                    "thumbnail_url": getattr(r, "thumbnail_url", None)  # ✅ 오타 수정
                } for r in results
            ]
        })
    return out
def _maybe_load_json(val):
    # MySQL JSON이면 그대로(dict), TEXT면 파싱
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return None


def get_result_detail_by_id(db: Session, result_id: str):
    r = (db.query(QuestionAnswerPair)
            .options(joinedload(QuestionAnswerPair.session))  # title 가져오려고
            .filter(QuestionAnswerPair.id == result_id)
            .first())
    if not r:
        return None

    return {
        "result_id": r.id,
        "report_id": r.session_id,
        "report_title": r.session.title if r.session else None,
        "created_at": r.created_at.isoformat() + "Z" if r.created_at else None,
        "video_url": r.video_url,  # 컬럼 없으면 추가: Column(Text)
        "verbal_result": {
            "answer": r.answer,
            "stopwords": r.stopwords,
            "is_ended": r.is_ended,
            "reason_end": r.reason_end,
            "context_matched": r.context_matched,
            "reason_context": r.reason_context,
            "gpt_comment": r.gpt_comment,
            "end_type": r.end_type,
            "speech_label": r.speech_label,
            "syll_art": float(r.syll_art) if r.syll_art not in (None, "") else None,
        },
        "posture_result": _maybe_load_json(r.posture_result),  # JSON/Text 모두 대응
        "face_result": _maybe_load_json(r.face_result),
    }

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
