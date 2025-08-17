from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime
from uuid import UUID


# -------------------------------
# Question & Answer Schemas
# -------------------------------
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
    session_id: UUID


class QuestionAnswerPairRead(QuestionAnswerPairBase):
    id: UUID
    session_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

    @field_validator("id", "session_id", mode="before")
    def convert_uuid(cls, v):
        if isinstance(v, (bytes, bytearray)):  # DB에서 BINARY(16)로 오는 경우
            return UUID(bytes=v)
        return v


# -------------------------------
# Evaluation Session Schemas
# -------------------------------
class EvaluationSessionBase(BaseModel):
    user_id: UUID
    title: str


class EvaluationSessionCreate(EvaluationSessionBase):
    pass


class EvaluationSessionRead(EvaluationSessionBase):
    id: UUID
    created_at: datetime
    qa_pairs: List[QuestionAnswerPairRead] = []

    class Config:
        from_attributes = True

    @field_validator("id", "user_id", mode="before")
    def convert_uuid(cls, v):
        if isinstance(v, (bytes, bytearray)):
            return UUID(bytes=v)
        return v
