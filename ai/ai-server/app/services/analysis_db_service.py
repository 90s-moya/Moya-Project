# app/services/analysis_db_service.py
from __future__ import annotations
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session

from app.models import QuestionAnswerPair, EvaluationSession, generate_uuid
from app.utils.uuid_tools import to_uuid_bytes

def get_or_create_qa_pair(
    db: Session,
    session_id: str,
    order: int,
    sub_order: int,
    **kwargs,
) -> QuestionAnswerPair:
    # 문자열 UUID -> bytes
    sid = to_uuid_bytes(session_id.strip())

    # 세션 존재 확인 (없으면 생성)
    session = (
        db.query(EvaluationSession)
        .filter(EvaluationSession.id == sid)
        .one_or_none()
    )
    if session is None:
        # user_id NOT NULL이므로 더미라도 bytes 필요
        session = EvaluationSession(
            id=sid,
            user_id=generate_uuid(),
            title="AI 모의면접 결과",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(session)
        try:
            db.flush()
        except Exception:
            db.rollback()
            session = (
                db.query(EvaluationSession)
                .filter(EvaluationSession.id == sid)
                .one_or_none()
            )
            if session is None:
                raise

    qa = (
        db.query(QuestionAnswerPair)
        .filter(
            QuestionAnswerPair.session_id == sid,
            QuestionAnswerPair.order == order,
            QuestionAnswerPair.sub_order == sub_order,
        )
        .one_or_none()
    )
    if qa is None:
        qa = QuestionAnswerPair(
            session_id=sid,
            order=order,
            sub_order=sub_order,
            question="Analysis Session",
            answer="",  # 미답변 판별 로직과 호환되게 빈 문자열
            is_ended=False,
            reason_end="",
            context_matched=False,
            reason_context="",
            gpt_comment="",
            end_type="",
            stopwords="",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(qa)
        db.flush()  # PK 부여
    return qa

def save_results_to_qa(
    db: Session,
    qa: QuestionAnswerPair,
    *,
    video_url: Optional[str] = None,
    thumbnail_url: Optional[str] = None,
    result: Dict[str, Any],
) -> QuestionAnswerPair:
    if video_url:
        qa.video_url = video_url
    if thumbnail_url:
        qa.thumbnail_url = thumbnail_url

    qa.posture_result = result.get("posture")
    qa.face_result = result.get("emotion")
    qa.gaze_result = result.get("gaze")
    qa.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(qa)
    return qa
