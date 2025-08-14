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
    **kwargs
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
    print(f"[DEBUG] save_results_to_qa received result: {result}")
    print(f"[DEBUG] result.get('gaze'): {result.get('gaze')}")
    
    if video_url:
        qa.video_url = video_url
    if thumbnail_url:
        qa.thumbnail_url=thumbnail_url
    qa.posture_result = result.get("posture")
    qa.face_result    = result.get("emotion")
    qa.gaze_result    = result.get("gaze")
    
    print(f"[DEBUG] qa.gaze_result after assignment: {qa.gaze_result}")

    qa.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(qa)
    return qa
