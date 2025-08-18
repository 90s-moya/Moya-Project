# app/models.py
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, JSON, Index
from sqlalchemy.dialects.mysql import BINARY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import quoted_name

from app.database import Base

def generate_uuid() -> bytes:
    return uuid.uuid4().bytes  # BINARY(16) 기본값

class EvaluationSession(Base):
    __tablename__ = "evaluation_session"

    id = Column(BINARY(16), primary_key=True, default=generate_uuid)
    user_id = Column(BINARY(16), nullable=False)
    title = Column(String(100), default="AI 모의면접 결과")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    original_text = Column(Text)

    qa_pairs = relationship(
        "QuestionAnswerPair",
        back_populates="session",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("ix_eval_user_created", "user_id", "created_at"),
    )


class QuestionAnswerPair(Base):
    __tablename__ = "question_answer_pair"

    id = Column(BINARY(16), primary_key=True, default=generate_uuid)
    session_id = Column(
        BINARY(16),
        ForeignKey("evaluation_session.id", ondelete="CASCADE"),
        nullable=False,
    )

    # 예약어 안전
    order = Column(quoted_name("order", True), Integer, nullable=False)
    sub_order = Column(Integer, nullable=False)

    question = Column(Text, nullable=False)
    video_url = Column(String)

    gaze_result = Column(JSON)
    posture_result = Column(JSON)
    face_result = Column(JSON)

    answer = Column(Text)
    stopwords = Column(Text)
    is_ended = Column(Boolean)
    reason_end = Column(Text)
    context_matched = Column(Boolean)
    reason_context = Column(Text)
    gpt_comment = Column(Text)
    end_type = Column(String)
    thumbnail_url = Column(String)
    speech_label = Column(String)
    syll_art = Column(String)  # 숫자로만 저장할 거면 Float로 변경 가능

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    session = relationship("EvaluationSession", back_populates="qa_pairs")

    __table_args__ = (
        Index("ix_qap_session_order_sub", "session_id", quoted_name("order", True), "sub_order"),
    )
