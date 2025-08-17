import uuid
from sqlalchemy import Column, DateTime, Text, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.mysql import BINARY, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class EvaluationSession(Base):
    __tablename__ = "evaluation_session"

    id = Column(BINARY(16), primary_key=True, default=uuid.uuid4)
    user_id = Column(BINARY(16), nullable=False)
    title = Column(Text, nullable=True, default="AI 모의면접 결과")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    original_text = Column(Text, nullable=True)

    qa_pairs = relationship("QuestionAnswerPair", back_populates="session", cascade="all, delete")


class QuestionAnswerPair(Base):
    __tablename__ = "question_answer_pair"

    id = Column(BINARY(16), primary_key=True, default=uuid.uuid4)
    session_id = Column(BINARY(16), ForeignKey("evaluation_session.id"), nullable=False)

    order = Column(Integer, nullable=False)
    sub_order = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    video_url = Column(Text, nullable=True)
    gaze_result = Column(JSON, nullable=True)
    posture_result = Column(JSON, nullable=True)
    face_result = Column(JSON, nullable=True)
    answer = Column(Text, nullable=True)
    stopwords = Column(Text, nullable=True)
    is_ended = Column(Boolean, nullable=True)
    reason_end = Column(Text, nullable=True)
    context_matched = Column(Boolean, nullable=True)
    reason_context = Column(Text, nullable=True)
    gpt_comment = Column(Text, nullable=True)
    end_type = Column(Text, nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    speech_label = Column(Text, nullable=True)
    syll_art = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    session = relationship("EvaluationSession", back_populates="qa_pairs")
