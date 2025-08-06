# app/api/routes.py
from fastapi import APIRouter, UploadFile, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models import EvaluationSession, QuestionAnswerPair
from app.schemas import EvaluationSessionRead
from app.utils.stt import transcribe_audio
from app.utils.gpt import ask_gpt_if_ends, parse_gpt_result
from fastapi import File
router = APIRouter()

@router.post("/v1/prompt-stt/", response_model=EvaluationSessionRead)
async def evaluate_single_pair(
    userId: UUID = Form(...),
    question: str = Form(...),
    answer: UploadFile = Form(...),
    db: Session = Depends(get_db)
):
    try:
        answer_text = transcribe_audio(answer)
        gpt_text = ask_gpt_if_ends([question], [answer_text])
        parsed_result = parse_gpt_result(gpt_text)

        if not parsed_result:
            raise HTTPException(status_code=500, detail="GPT 응답 파싱 실패")

        result = parsed_result[0]

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
        print("[1] Whisper 변환 시작:", datetime.now())

        q_files = [question1, question2, question3]
        a_files = [answer1, answer2, answer3]
        question_list = [transcribe_audio(f) for f in q_files]
        answer_list = [transcribe_audio(f) for f in a_files]

        print("🎤 Whisper 변환 완료:", datetime.now())
        gpt_text = ask_gpt_if_ends(question_list, answer_list)
        print("🤖 GPT 응답 완료:", datetime.now())

        session = EvaluationSession(user_id=user_id)
        db.add(session)
        db.flush()

        evaluations = parse_gpt_result(gpt_text)

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