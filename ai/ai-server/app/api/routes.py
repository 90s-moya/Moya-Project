# app/api/routes.py
from fastapi import APIRouter, UploadFile, Form, HTTPException, Depends, File
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
from sqlalchemy import String



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
import logging, traceback

log = logging.getLogger(__name__)

@router.post("/v1/followup-question")
async def followup_question(
    session_id: str = Form(...),      # 문자열로 받고 strip 후 UUID 변환
    order: int = Form(...),
    sub_order: int = Form(...),       # 들어오지만 신뢰하지 않음(최신값 사용)
    audio: UploadFile = File(...),    # 파일은 File(...)
    db: Session = Depends(get_db)
):
    try:
        # 0) UUID 정리
        try:
            session_uuid = UUID(session_id.strip())
        except Exception:
            raise HTTPException(status_code=422, detail="session_id가 유효한 UUID가 아닙니다.")

        # 0-1) 컬럼 타입에 맞춰 비교값 결정
        session_col = QuestionAnswerPair.__table__.c.session_id
        if isinstance(session_col.type, String):
            session_filter_val = str(session_uuid)
        else:
            session_filter_val = session_uuid

        # 1) 세션 내 존재하는 (order, sub_order) 덤프
        exists = (db.query(QuestionAnswerPair.order, QuestionAnswerPair.sub_order)
                    .filter(QuestionAnswerPair.session_id == session_filter_val)
                    .order_by(QuestionAnswerPair.order, QuestionAnswerPair.sub_order)
                    .all())
        log.info(f"[followup] session={session_filter_val} exists={exists}")

        # 2) 해당 order의 최신 row 가져오기(클라이언트 sub_order는 신뢰 X)
        latest_qa = (db.query(QuestionAnswerPair)
                       .filter(QuestionAnswerPair.session_id == session_filter_val,
                               QuestionAnswerPair.order == order)
                       .order_by(QuestionAnswerPair.sub_order.desc())
                       .first())
        if not latest_qa:
            raise HTTPException(status_code=404, detail="해당 order의 질문을 찾을 수 없습니다.")

        # 3) 파일 읽기 → STT
        # content = await audio.read()
        # if not content:
        #     raise HTTPException(status_code=400, detail="업로드된 오디오가 비어있습니다.")
        answer = await transcribe_audio_async(audio)
        # 4) GPT 평가 (원문 로깅 + 파싱 실패시 안전값 사용)
        try:
            gpt_text = await ask_gpt_if_ends_async([latest_qa.question], [answer])
            log.info(f"[followup] gpt_raw={gpt_text[:500]}")
            parsed = parse_gpt_result(gpt_text)
            if not parsed:
                log.warning("[followup] GPT 평가 파싱 실패, 기본값 사용")
                parsed = [{
                    "is_ended": False,
                    "reason_end": "파싱 실패",
                    "context_matched": True,
                    "reason_context": "임시 기본값",
                    "gpt_comment": "임시 기본값"
                }]
        except Exception as ge:
            log.error(f"[followup] GPT 호출 실패: {ge}")
            parsed = [{
                "is_ended": False,
                "reason_end": "GPT 호출 실패",
                "context_matched": True,
                "reason_context": "임시 기본값",
                "gpt_comment": "임시 기본값"
            }]

        res = parsed[0]

        # 5) 최신 질문 row 업데이트
        latest_qa.answer = answer
        latest_qa.end_type = map_end_type(res)
        latest_qa.reason_end = res.get("reason_end", "")
        latest_qa.context_matched = res.get("context_matched", False)
        latest_qa.reason_context = res.get("reason_context", "")
        latest_qa.gpt_comment = res.get("gpt_comment", "")
        latest_qa.stop_words = map_stop_words(res)
        db.add(latest_qa)
        db.commit()
        db.refresh(latest_qa)

        # 6) 꼬리질문 생성
        if latest_qa.sub_order == 0:
            followup = await generate_followup_question(latest_qa.question, answer)
        elif latest_qa.sub_order == 1:
            q0 = (db.query(QuestionAnswerPair)
                    .filter_by(session_id=session_filter_val, order=order, sub_order=0)
                    .first())
            if not q0:
                raise HTTPException(status_code=404, detail="첫 질문이 존재하지 않습니다.")
            followup = await generate_second_followup_question(
                base_question=q0.question,
                answer1=q0.answer or "",
                followup1=latest_qa.question,
                answer2=answer
            )
        else:
            raise HTTPException(status_code=400, detail="지원하지 않는 sub_order입니다.")

        # 7) 새 row 저장(필수 필드 기본값 채움)
        new_pair = QuestionAnswerPair(
            session_id=session_filter_val,
            order=order,
            sub_order=latest_qa.sub_order + 1,
            question=followup,
            answer="",
            is_ended=False,
            reason_end="",
            context_matched=False,
            reason_context="",
            gpt_comment="",
            end_type="",
            stopwords="",
            created_at=datetime.utcnow()
        )
        db.add(new_pair)
        db.commit()
        db.refresh(new_pair)

        return {"question": followup, "next_sub_order": new_pair.sub_order}

    except HTTPException:
        raise
    except Exception as e:
        log.error("[followup] unexpected error: %s", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal error in followup_question")


# === 오디오 기반 질문 3개 평가 ===
@router.post("/v1/prompt-start", response_model=EvaluationSessionRead)
async def make_question(payload: PromptStartRequest, db: Session = Depends(get_db)):
    try:
        userId = payload.userId
        text = payload.text

        question_list = await generate_initial_question(text)  # ✅ 이건 리스트여야 함
        if not question_list or not isinstance(question_list, list):
            raise HTTPException(status_code=500, detail="GPT 질문 생성 실패")

        session = EvaluationSession(user_id=userId, created_at=datetime.utcnow())
        db.add(session)
        db.commit()
        db.refresh(session)

        qa_list = []
        for idx, q in enumerate(question_list):
            qa = QuestionAnswerPair(
                session_id=session.id,
                order=1,  # 하나의 질문 세트로 묶기
                sub_order=idx,
                question=q,
                answer="",
                is_ended=False,
                reason_end="",
                context_matched=False,
                reason_context="",
                gpt_comment="",
                end_type="",
                stop_words="",
                created_at=datetime.utcnow()
            )
            db.add(qa)
            qa_list.append(qa)

        db.commit()

        session.qa_pairs = qa_list
        return session

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

