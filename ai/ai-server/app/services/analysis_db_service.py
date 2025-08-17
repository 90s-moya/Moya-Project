# app/services/analyze_db_service.py
from __future__ import annotations
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
from app.models import QuestionAnswerPair, EvaluationSession

def get_or_create_qa_pair(
    db: Session,
    session_id: str,
    order: int,
    sub_order: int,
    **kwargs
) -> QuestionAnswerPair:
    # session_id 정리 (개행문자 제거)
    session_id = session_id.strip()
    
    # 먼저 세션이 존재하는지 확인하고, 없으면 생성
    session = db.query(EvaluationSession).filter(EvaluationSession.id == session_id).one_or_none()
    if session is None:
        print(f"[DEBUG] Creating new evaluation session: {session_id}")
        try:
            session = EvaluationSession(
                id=session_id,
                user_id="analysis_user",  # 기본값
                title="AI 모의면접 결과",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(session)
            db.flush()
        except Exception as e:
            # 중복 키 오류 등이 발생하면 기존 세션을 다시 조회
            print(f"[DEBUG] Session creation failed, fetching existing: {e}")
            db.rollback()
            session = db.query(EvaluationSession).filter(EvaluationSession.id == session_id).one_or_none()
            if session is None:
                raise e
    
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
            question="Analysis Session",  # 기본값 설정
            answer="",  # 빈 문자열로 초기화
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
