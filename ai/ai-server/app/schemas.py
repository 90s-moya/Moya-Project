# app/schemas.py
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

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

    model_config = ConfigDict(from_attributes=True)

    @field_validator("id", "session_id", mode="before")
    @classmethod
    def _bytes_to_uuid(cls, v):
        if isinstance(v, (bytes, bytearray)):
            return UUID(bytes=bytes(v))
        if isinstance(v, str):
            return UUID(v)
        return v

class EvaluationSessionBase(BaseModel):
    user_id: UUID
    title: str

class EvaluationSessionCreate(EvaluationSessionBase):
    pass

class EvaluationSessionRead(EvaluationSessionBase):
    id: UUID
    created_at: datetime
    qa_pairs: List[QuestionAnswerPairRead] = []

    model_config = ConfigDict(from_attributes=True)

    @field_validator("id", "user_id", mode="before")
    @classmethod
    def _bytes_to_uuid(cls, v):
        if isinstance(v, (bytes, bytearray)):
            return UUID(bytes=bytes(v))
        if isinstance(v, str):
            return UUID(v)
        return v
