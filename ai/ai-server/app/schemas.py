from pydantic import BaseModel, UUID4
from typing import List, Optional
from datetime import datetime

# Q&A pair (기본 구조)
class QuestionAnswerPairBase(BaseModel):
    order: int
    question: str
    answer: str
    is_ended: bool
    reason_end: str
    context_matched: bool
    reason_context: str
    gpt_comment: Optional[str] = None


class QuestionAnswerPairCreate(QuestionAnswerPairBase):
    session_id: UUID4


class QuestionAnswerPairRead(QuestionAnswerPairBase):
    id: int
    session_id: UUID4
    created_at: datetime

    class Config:
        from_attributes = True  


# Evaluation session (기본 구조)
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
