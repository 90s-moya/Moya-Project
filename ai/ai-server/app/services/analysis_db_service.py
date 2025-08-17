# app/services/analyze_db_service.py
from __future__ import annotations
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import UUID
import uuid

from app.models import QuestionAnswerPair, EvaluationSession

# UUID 변환 유틸
def to_uuid_bytes(u) -> bytes:
    if isinstance(u, (bytes, bytearray)):
        return bytes(u)
    if isinstance(u, UUID):
        return u.bytes
    return UUID(str(u)).bytes


def get_or_create_qa_pair(
    db: Session,
    session_id: str,
    order: int,
    sub_order: int,
    **kwargs
) -> QuestionAnswerPair:
    # session_id 정리 (개행 제거) + bytes 변환
    session_id = session_id.strip()
    session_id_bytes = to_uuid_bytes(session_id)

    # 먼저 세션이 존재하는지 확인하고, 없으면 생성
    session = db.query(EvaluationSession).filter(EvaluationSession.id == session_id_bytes).one_or_none()
    if session is None:
        # user_id NOT NULL이면 임시 UUID 채움 (또는 적절한 값으로 교체)
        session = EvaluationSession(
            id=session_id_bytes,
            user_id=uuid.uuid4().bytes,
            title="AI 모의면접 결과",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(session)
        try:
            db.flush()
        except Exception:
            db.rollback()
            # 경쟁조건 등으로 이미 생성되었을 수 있으니 재조회
            session = db.query(EvaluationSession).filter(EvaluationSession.id == session_id_bytes).one_or_none()
            if session is None:
                raise

    qa = (
        db.query(QuestionAnswerPair)
        .filter(
            QuestionAnswerPair.session_id == session_id_bytes,
            QuestionAnswerPair.order == order,
            QuestionAnswerPair.sub_order == sub_order,
        )
        .one_or_none()
    )
    if qa is None:
        qa = QuestionAnswerPair(
            session_id=session_id_bytes,
            order=order,
            sub_order=sub_order,
            question="Analysis Session",  # 기본값
            answer="",                    # 빈 문자열
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
        db.flush()  # id 부여
    return qa


def save_results_to_qa(
    db: Session,
    qa: QuestionAnswerPair,
    *,
    video_url: Optional[str] = None,
    thumbnail_url: Optional[str] = None,
    result: Dict[str, Any],
) -> QuestionAnswerPair:
    # analyze_all 결과 -> DB 컬럼 매핑
    # posture_result ← result["posture"]
    # face_result    ← result["emotion"]
    if video_url:
        qa.video_url = video_url
    if thumbnail_url:
        qa.thumbnail_url = thumbnail_url

    qa.posture_result = result.get("posture")
    qa.face_result    = result.get("emotion")
    qa.gaze_result    = result.get("gaze")

    qa.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(qa)
    return qa
