# app/schemas.py

from pydantic import BaseModel, UUID4
from typing import List, Optional
from datetime import datetime

# Q&A pair (기본 구조)
class QuestionAnswerPairBase(BaseModel):
    order: int
    sub_order: int
    question: str
    answer: Optional[str] = ""
    is_ended: Optional[bool] = False
    reason_end: Optional[str] = ""
    context_matched: Optional[bool] = False
    reason_context: Optional[str] = ""
    gpt_comment: Optional[str] = ""
    stopwords: Optional[str] = ""
    end_type: Optional[str] = ""

class QuestionAnswerPairCreate(QuestionAnswerPairBase):
    session_id: UUID4

class QuestionAnswerPairRead(QuestionAnswerPairBase):
    id: int
    session_id: UUID4
    created_at: datetime

    class Config:
        from_attributes = True  # SQLAlchemy -> Pydantic 매핑

# Evaluation session
class EvaluationSessionBase(BaseModel):
    user_id: UUID4
    summary: Optional[str] = None

class EvaluationSessionCreate(EvaluationSessionBase):
    pass

class EvaluationSessionRead(EvaluationSessionBase):
    id: UUID4
    created_at: datetime
    qa_pairs: List[QuestionAnswerPairRead] = []

    class Config:
        from_attributes = True
