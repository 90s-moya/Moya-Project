# app/models.py

import uuid
from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base  # declarative_base()

class EvaluationSession(Base):
    __tablename__ = "evaluation_session"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    summary = Column(Text, nullable=True)
    original_text = Column(Text, nullable=True)  # 필요 없으면 삭제 가능

    qa_pairs = relationship("QuestionAnswerPair", back_populates="session", cascade="all, delete")


class QuestionAnswerPair(Base):
    __tablename__ = "question_answer_pair"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("evaluation_session.id"), nullable=False)

    order = Column(Integer, nullable=False)
    suborder = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)

    answer = Column(Text, nullable=True)
    stopwords = Column(Text, nullable=True)
    is_ended = Column(Boolean, nullable=True)
    reason_end = Column(Text, nullable=True)
    context_matched = Column(Boolean, nullable=True)
    reason_context = Column(Text, nullable=True)
    gpt_comment = Column(Text, nullable=True)
    end_type = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    session = relationship("EvaluationSession", back_populates="qa_pairs")
