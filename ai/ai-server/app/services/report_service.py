# app/services/report_service.py
from __future__ import annotations

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from uuid import UUID
import json

from app.models import EvaluationSession, QuestionAnswerPair


# ========= UUID 유틸 =========
def to_uuid_bytes(u) -> bytes:
    if isinstance(u, (bytes, bytearray)):
        return bytes(u)
    if isinstance(u, UUID):
        return u.bytes
    return UUID(str(u)).bytes


def to_uuid_str(v) -> str:
    if isinstance(v, (bytes, bytearray)):
        return str(UUID(bytes=v))
    if isinstance(v, UUID):
        return str(v)
    return str(v)


# ========= 내부 상태 계산 =========
def _get_status(r) -> str:
    """
    QuestionAnswerPair의 상태를 판단
    - IN_COMPLETE: 시작 안함
    - IN_PROGRESS: 진행 중
    - COMPLETED  : 완료
    """
    if hasattr(r, "status") and r.status:
        return r.status

    # 비디오 URL이 없으면 아직 시작되지 않음
    if not getattr(r, "video_url", None):
        return "IN_COMPLETE"

    has_answer = (r.answer or "").strip() != ""
    has_posture = getattr(r, "posture_result", None) is not None
    has_face = getattr(r, "face_result", None) is not None
    has_gpt_comment = getattr(r, "gpt_comment", None) is not None

    if has_answer and has_posture and has_face and has_gpt_comment:
        return "COMPLETED"
    return "IN_PROGRESS"


def _maybe_load_json(val):
    # MySQL JSON이면 dict/list, TEXT면 파싱 시도
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return None


# ========= 단건 조회 =========
def get_result_by_id(db: Session, result_id: str) -> Optional[Dict[str, Any]]:
    rid_bytes = to_uuid_bytes(result_id)
    r = (
        db.query(QuestionAnswerPair)
        .options(joinedload(QuestionAnswerPair.session))
        .filter(QuestionAnswerPair.id == rid_bytes)
        .first()
    )
    if not r:
        return None

    created = r.created_at.isoformat() + "Z" if r.created_at else None

    return {
        "result_id": to_uuid_str(r.id),
        "report_id": to_uuid_str(r.session_id),
        "report_title": getattr(r.session, "title", None) if r.session else None,
        "created_at": created,
        "status": _get_status(r),
        "order": r.order,
        "suborder": r.sub_order,
        "question": r.question,
        "answer": r.answer,
        "thumbnail_url": getattr(r, "thumbnail_url", None),
    }


# ========= 사용자별 리포트 목록 =========
def list_reports_by_user(db: Session, user_id: str) -> List[Dict[str, Any]]:
    uid_bytes = to_uuid_bytes(user_id)

    sessions = (
        db.query(EvaluationSession)
        .options(joinedload(EvaluationSession.qa_pairs))
        .filter(EvaluationSession.user_id == uid_bytes)
        .order_by(EvaluationSession.created_at.desc())
        .all()
    )

    out: List[Dict[str, Any]] = []
    for s in sessions:
        results = sorted(
            s.qa_pairs,
            key=lambda x: (x.order, x.sub_order, x.created_at or x.id),
        )
        filtered_results = [r for r in results if _get_status(r) != "IN_COMPLETE"]

        if filtered_results:
            out.append(
                {
                    "report_id": to_uuid_str(s.id),
                    "title": s.title,
                    "results": [
                        {
                            "result_id": to_uuid_str(r.id),
                            "created_at": r.created_at.isoformat() + "Z" if r.created_at else None,
                            "report_id": to_uuid_str(r.session_id),
                            "report_title": s.title,
                            "status": _get_status(r),
                            "order": r.order,
                            "suborder": r.sub_order,
                            "question": r.question,
                            "answer": r.answer,
                            "thumbnail_url": getattr(r, "thumbnail_url", None),
                        }
                        for r in filtered_results
                    ],
                }
            )
    return out


# ========= 리절트 상세(비보안) =========
def get_result_detail_by_id(db: Session, result_id: str) -> Optional[Dict[str, Any]]:
    rid_bytes = to_uuid_bytes(result_id)
    r = (
        db.query(QuestionAnswerPair)
        .options(joinedload(QuestionAnswerPair.session))
        .filter(QuestionAnswerPair.id == rid_bytes)
        .first()
    )
    if not r:
        return None

    return {
        "result_id": to_uuid_str(r.id),
        "report_id": to_uuid_str(r.session_id),
        "report_title": r.session.title if r.session else None,
        "created_at": r.created_at.isoformat() + "Z" if r.created_at else None,
        "video_url": r.video_url,
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


# ========= 리포트 단건 조회 =========
def get_report_by_id(db: Session, session_id: str) -> Optional[Dict[str, Any]]:
    sid_bytes = to_uuid_bytes(session_id)
    s = (
        db.query(EvaluationSession)
        .options(joinedload(EvaluationSession.qa_pairs))
        .filter(EvaluationSession.id == sid_bytes)
        .first()
    )
    if not s:
        return None

    results = sorted(s.qa_pairs, key=lambda x: (x.order, x.sub_order, x.created_at or x.id))
    filtered_results = [r for r in results if _get_status(r) != "IN_COMPLETE"]

    return {
        "report_id": to_uuid_str(s.id),
        "title": s.title,
        "results": [
            {
                "result_id": to_uuid_str(r.id),
                "created_at": (r.created_at.isoformat() + "Z") if r.created_at else None,
                "status": _get_status(r),
                "order": r.order,
                "suborder": r.sub_order,
                "question": r.question,
                "thumbnail_url": getattr(r, "thumbnail_url", None),
            }
            for r in filtered_results
        ],
    }


# ========= 리절트 상세(보안 검증) =========
def get_result_detail_secure(
    db: Session,
    report_id: str,
    result_id: str,
    user_id: str,
) -> Optional[Dict[str, Any]]:
    rid_bytes = to_uuid_bytes(result_id)
    sid_bytes = to_uuid_bytes(report_id)
    uid_bytes = to_uuid_bytes(user_id)

    r = (
        db.query(QuestionAnswerPair)
        .join(EvaluationSession, QuestionAnswerPair.session_id == EvaluationSession.id)
        .options(joinedload(QuestionAnswerPair.session))
        .filter(
            and_(
                QuestionAnswerPair.id == rid_bytes,
                QuestionAnswerPair.session_id == sid_bytes,
                EvaluationSession.user_id == uid_bytes,  # 소유자 검증을 쿼리 단계에서 수행
            )
        )
        .first()
    )
    if not r:
        # 존재 X, report-result 불일치, 혹은 소유자 불일치
        return None

    return {
        "result_id": to_uuid_str(r.id),
        "report_id": to_uuid_str(r.session_id),
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


# ========= 타이틀만 수정 (서비스 버전; 현재 라우터에서 직접 처리 중) =========
def update_report_title(db: Session, report_id: str, new_title: str) -> bool:
    sid_bytes = to_uuid_bytes(report_id)
    s = db.query(EvaluationSession).filter(EvaluationSession.id == sid_bytes).first()
    if not s:
        return False
    s.title = new_title
    db.commit()
    return True
