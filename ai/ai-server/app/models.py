# app/models.py

import uuid
from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mysql import JSON as MySQLJSON
from datetime import datetime

from app.database import Base  # declarative_base()

class EvaluationSession(Base):
    __tablename__ = "evaluation_session"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False)
    title=Column(String(100),nullable=True,default="AI 모의면접 결과")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    original_text = Column(Text, nullable=True)  # 필요 없으면 삭제 가능

    qa_pairs = relationship("QuestionAnswerPair", back_populates="session", cascade="all, delete")


class QuestionAnswerPair(Base):
    __tablename__ = "question_answer_pair"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("evaluation_session.id"), nullable=False)

    order = Column(Integer, nullable=False)
    sub_order = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    video_url = Column(Text, nullable=True)

    posture_result = Column(MySQLJSON, nullable=True)
    face_result = Column(MySQLJSON, nullable=True) 
    answer = Column(Text, nullable=True)
    stopwords = Column(Text, nullable=True)
    is_ended = Column(Boolean, nullable=True)
    reason_end = Column(Text, nullable=True)
    context_matched = Column(Boolean, nullable=True)
    reason_context = Column(Text, nullable=True)
    gpt_comment = Column(Text, nullable=True)
    end_type = Column(Text, nullable=True)

    speech_label = Column(Text, nullable=True)
    syll_art = Column(Text, nullable=True)
    # 필요 컬럼 추가

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    session = relationship("EvaluationSession", back_populates="qa_pairs")
