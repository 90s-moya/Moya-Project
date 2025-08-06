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

    qa_pairs = relationship("QuestionAnswerPair", back_populates="session", cascade="all, delete")
    original_text = Column(Text, nullable=False) 


class QuestionAnswerPair(Base):
    __tablename__ = "question_answer_pair"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("evaluation_session.id"), nullable=False)

    order = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)

    is_ended = Column(Boolean, nullable=False)
    reason_end = Column(Text, nullable=False)
    context_matched = Column(Boolean, nullable=False)
    reason_context = Column(Text, nullable=False)
    gpt_comment = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("EvaluationSession", back_populates="qa_pairs")
