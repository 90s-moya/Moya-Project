# app/services/analyze_db_service.py
from __future__ import annotations
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
from app.models import QuestionAnswerPair

def get_or_create_qa_pair(
    db: Session,
    session_id: str,
    order: int,
    sub_order: int,
) -> QuestionAnswerPair:
    qa = (
        db.query(QuestionAnswerPair)
        .filter(
            QuestionAnswerPair.session_id == session_id,
            QuestionAnswerPair.order == order,
            QuestionAnswerPair.sub_order == sub_order,
        )
        .one_or_none()
    )
    if qa is None:
        qa = QuestionAnswerPair(
            session_id=session_id,
            order=order,
            sub_order=sub_order,
        )
        db.add(qa)
        db.flush()  # id 부여
    return qa

def save_results_to_qa(
    db: Session,
    qa: QuestionAnswerPair,
    *,
    video_url: Optional[str],
    thumbnail_url:Optional[str],
    result: Dict[str, Any],
) -> QuestionAnswerPair:
    # analyze_all 결과 -> DB 컬럼 매핑
    # posture_result ← result["posture"]
    # face_result    ← result["emotion"]  (감정/표정 결과)
    if video_url:
        qa.video_url = video_url
    if thumbnail_url:
        qa.thumbnail_url=thumbnail_url
    qa.posture_result = result.get("posture")
    qa.face_result    = result.get("emotion")
    # gaze_result는 현재 분석 안 하므로 유지 (추후 gaze 추가 시 qa.gaze_result = result.get("gaze"))

    qa.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(qa)
    return qa
