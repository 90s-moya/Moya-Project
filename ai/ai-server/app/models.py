from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.mysql import BINARY
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base

def generate_uuid():
    return uuid.uuid4().bytes  # BINARY(16)

class EvaluationSession(Base):
    __tablename__ = "evaluation_session"

    id = Column(BINARY(16), primary_key=True, default=generate_uuid)
    user_id = Column(BINARY(16), nullable=False)
    title = Column(String(100), default="AI 모의면접 결과")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    original_text = Column(String)

    qa_pairs = relationship("QuestionAnswerPair", back_populates="session", cascade="all, delete-orphan")


class QuestionAnswerPair(Base):
    __tablename__ = "question_answer_pair"

    id = Column(BINARY(16), primary_key=True, default=generate_uuid)
    session_id = Column(BINARY(16), ForeignKey("evaluation_session.id"), nullable=False)

    order = Column("order", Integer, nullable=False)
    sub_order = Column(Integer, nullable=False)
    question = Column(String, nullable=False)
    video_url = Column(String)
    gaze_result = Column(JSON)
    posture_result = Column(JSON)
    face_result = Column(JSON)
    answer = Column(String)
    stopwords = Column(String)
    is_ended = Column(Boolean)
    reason_end = Column(String)
    context_matched = Column(Boolean)
    reason_context = Column(String)
    gpt_comment = Column(String)
    end_type = Column(String)
    thumbnail_url = Column(String)
    speech_label = Column(String)
    syll_art = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    session = relationship("EvaluationSession", back_populates="qa_pairs")
