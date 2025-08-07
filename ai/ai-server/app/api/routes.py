# app/api/routes.py
from fastapi import APIRouter, UploadFile, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models import EvaluationSession, QuestionAnswerPair
from app.schemas import EvaluationSessionRead
from app.utils.gpt import ask_gpt_if_ends_async, parse_gpt_result
from pydantic import BaseModel
import time
import os
from app.utils.gpt import generate_initial_question
from app.schemas import QuestionAnswerPairCreate
from app.utils.stt import transcribe_audio_async

class PromptStartRequest(BaseModel):
    userId: UUID
    text: str

router = APIRouter()


@router.post("/v1/prompt-start", response_model=EvaluationSessionRead)
async def make_question(payload: PromptStartRequest, db: Session = Depends(get_db)):
    try:
        userId = payload.userId
        text = payload.text

        # 1. GPT 호출로 첫 질문 생성
        gpt_start = time.time()
        question_text = await generate_initial_question(text)  # 비동기 호출
        gpt_end = time.time()
        print(f"[⏱ GPT 호출 시간] {gpt_end - gpt_start:.2f}초")

        if not question_text:
            raise HTTPException(status_code=500, detail="GPT 질문 생성 실패")

        # 2. EvaluationSession 생성
        session = EvaluationSession(
            user_id=userId,
            summary=None,
            created_at=datetime.utcnow()
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        # 3. 첫 QuestionAnswerPair 생성
        qa_data = QuestionAnswerPairCreate(
            session_id=session.id,
            order=1,
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

        # 4. 세션 객체에 QA 리스트 포함
        session.qa_pairs = [qa]
        return session

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/v1/prompt-stt/", response_model=EvaluationSessionRead)
async def evaluate_single_pair(
    userId: UUID = Form(...),
    question: str = Form(...),
    answer: UploadFile = Form(...),
    db: Session = Depends(get_db)
):
    try:
        # STT 처리
        stt_start = time.time()
        answer_text = await transcribe_audio_async(answer)
        stt_end = time.time()
        print(f"[⏱ STT 처리 시간] {stt_end - stt_start:.2f}초")

        # GPT 분석
        gpt_start = time.time()
        gpt_text = await ask_gpt_if_ends_async([question], [answer_text])
        gpt_end = time.time()
        print(f"[⏱ GPT 호출 시간] {gpt_end - gpt_start:.2f}초")

        parsed_result = parse_gpt_result(gpt_text)
        if not parsed_result:
            raise HTTPException(status_code=500, detail="GPT 응답 파싱 실패")

        result = parsed_result[0]

        # DB 저장
        session = EvaluationSession(user_id=userId)
        db.add(session)
        db.flush()
        qa = QuestionAnswerPair(
            session_id=session.id,
            order=1,
            question=question,
            answer=answer_text,
            is_ended=result["is_ended"],
            reason_end=result["reason_end"],
            context_matched=result["context_matched"],
            reason_context=result["reason_context"],
            gpt_comment=result["gpt_comment"]
        )
        db.add(qa)
        db.commit()
        db.refresh(session)
        return session

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/prompt-start", response_model=EvaluationSessionRead)
async def evaluate_audio_pair(
    user_id: UUID = Form(...),
    question1: UploadFile = Form(...),
    answer1: UploadFile = Form(...),
    question2: UploadFile = Form(...),
    answer2: UploadFile = Form(...),
    question3: UploadFile = Form(...),
    answer3: UploadFile = Form(...),
    db: Session = Depends(get_db)
):
    try:
        # STT 병렬 처리
        stt_start = time.time()
        q_files = [question1, question2, question3]
        a_files = [answer1, answer2, answer3]

        question_list, answer_list = await asyncio.gather(
            asyncio.gather(*[transcribe_audio_async(f) for f in q_files]),
            asyncio.gather(*[transcribe_audio_async(f) for f in a_files])
        )
        stt_end = time.time()
        print(f"[⏱ 총 STT 처리 시간] {stt_end - stt_start:.2f}초")

        # GPT 분석
        gpt_start = time.time()
        gpt_text = await ask_gpt_if_ends_async(question_list, answer_list)
        gpt_end = time.time()
        print(f"[⏱ GPT 호출 시간] {gpt_end - gpt_start:.2f}초")

        evaluations = parse_gpt_result(gpt_text)

        # DB 저장
        session = EvaluationSession(user_id=user_id)
        db.add(session)
        db.flush()
        for i, eva in enumerate(evaluations):
            qa = QuestionAnswerPair(
                session_id=session.id,
                order=i+1,
                question=question_list[i],
                answer=answer_list[i],
                is_ended=eva["is_ended"],
                reason_end=eva["reason_end"],
                context_matched=eva["context_matched"],
                reason_context=eva["reason_context"],
                gpt_comment=eva["gpt_comment"]
            )
            db.add(qa)
        db.commit()
        db.refresh(session)
        return session

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
