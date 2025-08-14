# app/services/report_services.py
from typing import List, Dict, Any,Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from app.models import EvaluationSession, QuestionAnswerPair
import json

def _get_status(r) -> str:
    """
    QuestionAnswerPair의 상태를 판단하는 함수
    - IN_COMPLETE: 기본값 (분석이 완료되지 않음)
    - IN_PROGRESS: 진행중 (video_url은 있지만 분석 결과가 없음)
    - COMPLETED: 완료 (모든 분석 결과가 있음)
    """
    # 명시적으로 status가 설정되어 있다면 그 값을 사용
    if hasattr(r, 'status') and r.status:
        return r.status
    
    # 비디오 URL이 없으면 아직 시작되지 않음
    if not getattr(r, 'video_url', None):
        return "IN_COMPLETE"
    
    # 주요 분석 결과들이 모두 있으면 완료
    has_answer = r.answer is not None and r.answer.strip() != ""
    has_posture = getattr(r, 'posture_result', None) is not None
    has_face = getattr(r, 'face_result', None) is not None
    has_gpt_comment = getattr(r, 'gpt_comment', None) is not None
    
    if has_answer and has_posture and has_face and has_gpt_comment:
        return "COMPLETED"
    
    # 비디오는 있지만 분석이 완료되지 않았으면 진행중
    return "IN_PROGRESS"
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
        "status": _get_status(r),
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
        # IN_COMPLETE 상태가 아닌 결과만 필터링
        filtered_results = [r for r in results if _get_status(r) != "IN_COMPLETE"]
        
        # 결과가 있는 세션만 포함
        if filtered_results:
            out.append({
                "report_id": s.id,
                "title": s.title,
                "results": [
                    {
                        "result_id": r.id,
                        "created_at": r.created_at.isoformat() + "Z" if r.created_at else None,
                        "report_id": r.session_id,           # ✅ 채움
                        "report_title": s.title,             # ✅ 채움
                        "status": _get_status(r),
                        "order": r.order,
                        "suborder": r.sub_order,
                        "question": r.question,
                        "answer": r.answer,
                        "thumbnail_url": getattr(r, "thumbnail_url", None)  # ✅ 오타 수정
                    } for r in filtered_results
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
    # IN_COMPLETE 상태가 아닌 결과만 필터링
    filtered_results = [r for r in results if _get_status(r) != "IN_COMPLETE"]
    
    return {
        "report_id": s.id,
        "title": s.title,
        "results": [
            {
                "result_id": r.id,
                "created_at": (r.created_at.isoformat() + "Z") if r.created_at else None,
                "status": _get_status(r),
                "order": r.order,
                "suborder": r.sub_order,
                "question": r.question,
                "thumbnail_url": getattr(r, "thumbnail_url", None)
            }
            for r in filtered_results
        ]
    }

def get_result_detail_secure(db: Session, report_id: str, result_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    # result_id가 해당 report_id에 속하는지 + 그 report가 해당 user_id 소유인지 검증
    r = (
        db.query(QuestionAnswerPair)
        .join(EvaluationSession, QuestionAnswerPair.session_id == EvaluationSession.id)
        .options(joinedload(QuestionAnswerPair.session))
        .filter(
            and_(
                QuestionAnswerPair.id == result_id,
                QuestionAnswerPair.session_id == report_id,
            )
        )
        .first()
    )
    if not r:
        # result_id가 없거나 report_id와 매칭되지 않음
        return None

    # 소유자 검증
    if not r.session or str(r.session.user_id) != str(user_id):
        # 소유자 불일치 → 호출자에게 노출하지 않기 위해 여기서 None을 반환하고
        # 라우터에서 403 처리(또는 여기서 예외 던져도 됨)
        raise PermissionError("Forbidden")

    return {
        "result_id": r.id,
        "report_id": r.session_id,
        "report_title": r.session.title if r.session else None,
        "created_at": r.created_at.isoformat() + "Z" if r.created_at else None,
        "video_url": getattr(r, "video_url", None),
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
            "syll_art": float(r.syll_art) if getattr(r, "syll_art", None) not in (None, "") else None,
        },
        "posture_result": _maybe_load_json(getattr(r, "posture_result", None)),
        "face_result": _maybe_load_json(getattr(r, "face_result", None)),
    }
def update_report_title(db: Session, report_id: str, new_title: str) -> bool:
    """
    보고서(EvaluationSession)의 타이틀만 수정하는 함수
    :param db: SQLAlchemy Session
    :param report_id: EvaluationSession.id
    :param new_title: 변경할 타이틀
    :return: True(성공) / False(대상 없음)
    """
    s = db.query(EvaluationSession).filter(EvaluationSession.id == report_id).first()
    if not s:
        return False

    s.title = new_title
    db.commit()
    return True