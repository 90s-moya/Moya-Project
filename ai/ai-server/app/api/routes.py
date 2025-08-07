# app/api/routes.py
from fastapi import APIRouter, UploadFile, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models import EvaluationSession, QuestionAnswerPair
from app.schemas import EvaluationSessionRead, QuestionAnswerPairCreate
from app.utils.gpt import (
    ask_gpt_if_ends_async,
    parse_gpt_result,
    generate_initial_question,
    generate_followup_question,
    generate_second_followup_question
)
from app.utils.stt import transcribe_audio_async
from pydantic import BaseModel
import time
import asyncio

router = APIRouter()

class PromptStartRequest(BaseModel):
    userId: UUID
    text: str

# === GPT 결과 → enum 매핑 함수 ===

def map_end_type(result: dict) -> str:
    reason = result["reason_end"].lower()
    if result["is_ended"] and ("깔끔" in reason or "명확" in reason or "완결" in reason):
        return "OUTSTANDING"
    elif result["is_ended"]:
        return "NORMAL"
    else:
        return "INADEQUATE"

def map_stop_words(result: dict) -> str:
    reason = result.get("gpt_comment", "").lower()
    if "추임새 거의 없음" in reason or "매우 깔끔" in reason:
        return "OUTSTANDING"
    elif "약간 있음" in reason or "중간 정도" in reason:
        return "NORMAL"
    else:
        return "INADEQUATE"

# === 질문 3개 생성 ===
@router.post("/v1/prompt-start", response_model=EvaluationSessionRead)
async def make_question(payload: PromptStartRequest, db: Session = Depends(get_db)):
    try:
        userId = payload.userId
        text = payload.text

        question_text = await generate_initial_question(text)
        if not question_text:
            raise HTTPException(status_code=500, detail="GPT 질문 생성 실패")

        session = EvaluationSession(user_id=userId, created_at=datetime.utcnow())
        db.add(session)
        db.commit()
        db.refresh(session)

        qa_data = QuestionAnswerPairCreate(
            session_id=session.id,
            order=1,
            sub_order=0,
            question=question_text,
            answer="",
            is_ended=False,
            reason_end="",
            context_matched=False,
            reason_context=""
        )
        qa = QuestionAnswerPair(**qa_data.model_dump())
        db.add(qa)
        db.commit()
        db.refresh(qa)

        session.qa_pairs = [qa]
        return session

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === 꼬리질문 생성 & 평가 ===
@router.post("/v1/followup-question")
async def followup_question(
    session_id: UUID = Form(...),
    order: int = Form(...),
    sub_order: int = Form(...),
    audio: UploadFile = Form(...),
    db: Session = Depends(get_db)
):
    try:
        answer = await transcribe_audio_async(audio)

        # GPT 평가 대상: 이전 질문 (sub_order에 해당하는 질문)
        prev_qa = db.query(QuestionAnswerPair).filter_by(
            session_id=session_id, order=order, sub_order=sub_order
        ).first()
        if not prev_qa:
            raise HTTPException(status_code=404, detail="평가 대상 질문을 찾을 수 없습니다.")

        # GPT 평가
        gpt_result_text = await ask_gpt_if_ends_async([prev_qa.question], [answer])
        parsed_result = parse_gpt_result(gpt_result_text)
        if not parsed_result:
            raise HTTPException(status_code=500, detail="GPT 평가 파싱 실패")
        result = parsed_result[0]

        # 이전 질문에 답변 + 평가 결과 업데이트
        prev_qa.answer = answer
        prev_qa.end_type = map_end_type(result)
        prev_qa.reason_end = result["reason_end"]
        prev_qa.context_matched = result["context_matched"]
        prev_qa.reason_context = result["reason_context"]
        prev_qa.gpt_comment = result["gpt_comment"]
        prev_qa.stop_words = map_stop_words(result)

        # 꼬리질문 생성
        if sub_order == 0:
            followup = await generate_followup_question(prev_qa.question, answer)
        elif sub_order == 1:
            q0 = db.query(QuestionAnswerPair).filter_by(session_id=session_id, order=order, sub_order=0).first()
            q1 = prev_qa  # 현재 sub_order=1의 질문
            if not q0 or not q1:
                raise HTTPException(status_code=404, detail="이전 질문들이 존재하지 않습니다.")
            followup = await generate_second_followup_question(
                base_question=q0.question,
                answer1=q0.answer,
                followup1=q1.question,
                answer2=answer
            )
        else:
            raise HTTPException(status_code=400, detail="지원하지 않는 sub_order입니다.")

        # 새로운 꼬리질문 저장 (답변은 아직 없음)
        db.add(QuestionAnswerPair(
            session_id=session_id,
            order=order,
            sub_order=sub_order + 1,
            question=followup,
            answer="",
            created_at=datetime.utcnow()
        ))
        db.commit()

        return {"question": followup}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
