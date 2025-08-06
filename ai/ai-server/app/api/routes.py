# app/api/routes.py
from fastapi import APIRouter, UploadFile, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models import EvaluationSession, QuestionAnswerPair
from app.schemas import EvaluationSessionRead
from app.utils.stt import save_uploadfile_to_temp, transcribe_audio_from_path
from app.utils.gpt import ask_gpt_if_ends_async, parse_gpt_result
import asyncio
import time
from concurrent.futures import ProcessPoolExecutor
import os

router = APIRouter()

# CPU 병렬 처리를 위한 프로세스 풀 생성 (코어 수 자동 감지)
process_pool = ProcessPoolExecutor()

# Whisper 비동기 래퍼 (프로세스 풀 사용)
async def transcribe_audio_async(file_obj: UploadFile) -> str:
    loop = asyncio.get_event_loop()
    temp_path = save_uploadfile_to_temp(file_obj)
    try:
        return await loop.run_in_executor(process_pool, transcribe_audio_from_path, temp_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

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
