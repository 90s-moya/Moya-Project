from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import UUID   # ✅ UUID4 대신 UUID 사용

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
    session_id: UUID   # 

class QuestionAnswerPairRead(QuestionAnswerPairBase):
    id: UUID           # 
    session_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# Evaluation session
class EvaluationSessionBase(BaseModel):
    user_id: UUID      # 
    title: str

class EvaluationSessionCreate(EvaluationSessionBase):
    pass

class EvaluationSessionRead(EvaluationSessionBase):
    id: UUID
    created_at: datetime
    qa_pairs: List[QuestionAnswerPairRead] = []

    class Config:
        from_attributes = True
