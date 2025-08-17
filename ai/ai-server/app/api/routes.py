# app/api/routes.py
from __future__ import annotations

import ast
import json
import logging
import re
import traceback
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.models import EvaluationSession, QuestionAnswerPair, generate_uuid
from app.schemas import EvaluationSessionRead
from app.services.analysis_db_service import get_or_create_qa_pair, save_results_to_qa
from app.services.analysis_service import analyze_all
from app.services.face_service import infer_face_video as infer_face
from app.services.gaze_service import infer_gaze
from app.utils.posture import analyze_video_bytes
from app.utils.urls import to_files_relative
from app.utils.uuid_tools import to_uuid_bytes, to_uuid_str
from app.utils.gpt import (
    ask_gpt_if_ends_async,
    generate_followup_question,
    generate_initial_question,
    generate_second_followup_question,
    parse_gpt_result,
)
from app.utils.stt import (
    transcribe_audio_async,  # 레거시
    transcribe_audio_bytes,
    transcribe_and_analyze,
)

router = APIRouter()
log = logging.getLogger(__name__)

MAX_FOLLOWUPS_PER_ORDER = 2

def _parse_questions_list(qs_raw):
    if isinstance(qs_raw, list):
        return [str(x).strip() for x in qs_raw]
    if isinstance(qs_raw, str):
        cleaned = re.sub(r'^```(?:json)?\s*|\s*```$', '', qs_raw.strip(), flags=re.MULTILINE)
        try:
            v = json.loads(cleaned)
            if isinstance(v, list):
                return [str(x).strip() for x in v]
        except Exception:
            pass
        try:
            v = ast.literal_eval(cleaned)
            if isinstance(v, list):
                return [str(x).strip() for x in v]
        except Exception:
            pass
        items = re.findall(r'"([^"]+)"', cleaned)
        if items:
            return [x.strip() for x in items]
    raise HTTPException(status_code=500, detail="GPT 질문 파싱 실패")

def map_end_type(result: Dict[str, Any]) -> str:
    reason = (result.get("reason_end") or "").lower()
    if result.get("is_ended") and any(k in reason for k in ("깔끔", "명확", "완결")):
        return "OUTSTANDING"
    if result.get("is_ended"):
        return "NORMAL"
    return "INADEQUATE"

def map_stop_words(result: Dict[str, Any]) -> str:
    comment = (result.get("gpt_comment") or "").lower()
    if "추임새 거의 없음" in comment or "매우 깔끔" in comment:
        return "OUTSTANDING"
    if "약간 있음" in comment or "중간 정도" in comment:
        return "NORMAL"
    return "INADEQUATE"

def _is_unanswered(col):
    return or_(col.is_(None), col == "")

class PromptStartRequest(BaseModel):
    userId: UUID
    text: str

@router.post("/v1/prompt-start", response_model=EvaluationSessionRead)
async def prompt_start(payload: PromptStartRequest, db: Session = Depends(get_db)):
    try:
        user_id = payload.userId
        text = payload.text

        qs_raw = await generate_initial_question(text)
        qs = _parse_questions_list(qs_raw)
        if not qs:
            raise HTTPException(status_code=500, detail="GPT 질문 생성 실패")

        # ✅ default에 의존하지 말고 id도 확실히 bytes 지정
        session = EvaluationSession(
            id=generate_uuid(),
            user_id=to_uuid_bytes(user_id),
            created_at=datetime.utcnow(),
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        qa_list = []
        for idx, q in enumerate(qs[:3], start=1):
            qa = QuestionAnswerPair(
                session_id=session.id,  # bytes
                order=idx,
                sub_order=0,
                question=q,
                answer=None,
                is_ended=False,
                reason_end="",
                context_matched=False,
                reason_context="",
                gpt_comment="",
                end_type="",
                stopwords="",
                created_at=datetime.utcnow(),
            )
            db.add(qa)
            qa_list.append(qa)

        db.commit()
        session.qa_pairs = qa_list
        return session  # Pydantic 모델에서 bytes->UUID 변환

    except HTTPException:
        raise
    except Exception as e:
        log.exception("prompt-start 실패: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/v1/followup-question")
async def followup_question(
    background_tasks: BackgroundTasks,
    session_id: str = Form(...),
    order: int = Form(...),
    sub_order: int = Form(...),
    audio: UploadFile = File(...),
    question_index: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    try:
        try:
            session_uuid = UUID(session_id.strip())
        except Exception:
            raise HTTPException(status_code=422, detail="session_id가 유효한 UUID가 아닙니다.")
        session_val = to_uuid_bytes(session_uuid)

        current = (
            db.query(QuestionAnswerPair)
              .filter(
                  QuestionAnswerPair.session_id == session_val,
                  QuestionAnswerPair.order == order,
                  _is_unanswered(QuestionAnswerPair.answer),
              )
              .order_by(QuestionAnswerPair.sub_order.asc())
              .first()
        )

        if not current:
            base = (
                db.query(QuestionAnswerPair)
                  .filter_by(session_id=session_val, order=order, sub_order=0)
                  .first()
            )
            if base:
                follow1 = (
                    db.query(QuestionAnswerPair)
                      .filter_by(session_id=session_val, order=order, sub_order=1)
                      .first()
                )
                if (base.answer or "") != "" and not follow1:
                    next_q = await generate_followup_question(base.question, base.answer or "")
                    current = QuestionAnswerPair(
                        session_id=session_val,
                        order=order,
                        sub_order=1,
                        question=next_q.strip(),
                        answer=None,
                        is_ended=False,
                        reason_end="",
                        context_matched=False,
                        reason_context="",
                        gpt_comment="",
                        end_type="",
                        stopwords="",
                        created_at=datetime.utcnow(),
                    )
                    db.add(current)
                    db.commit()
                    db.refresh(current)
                else:
                    if follow1 and (follow1.answer or "") != "":
                        follow2 = (
                            db.query(QuestionAnswerPair)
                              .filter_by(session_id=session_val, order=order, sub_order=2)
                              .first()
                        )
                        if not follow2:
                            next_q = await generate_second_followup_question(
                                base_question=base.question,
                                answer1=base.answer or "",
                                followup1=follow1.question,
                                answer2=follow1.answer or "",
                            )
                            current = QuestionAnswerPair(
                                session_id=session_val,
                                order=order,
                                sub_order=2,
                                question=next_q.strip(),
                                answer=None,
                                is_ended=False,
                                reason_end="",
                                context_matched=False,
                                reason_context="",
                                gpt_comment="",
                                end_type="",
                                stopwords="",
                                created_at=datetime.utcnow(),
                            )
                            db.add(current)
                            db.commit()
                            db.refresh(current)

        if not current:
            current = (
                db.query(QuestionAnswerPair)
                  .filter(
                      QuestionAnswerPair.session_id == session_val,
                      _is_unanswered(QuestionAnswerPair.answer),
                  )
                  .order_by(QuestionAnswerPair.order.asc(),
                            QuestionAnswerPair.sub_order.asc())
                  .first()
            )

        if not current:
            log.info("[followup] no unanswered rows found → finished")
            return {"finished": True, "analysis": None}

        log.info("[followup] session=%s -> current(order=%s, sub=%s, id=%s)",
                 to_uuid_str(session_val), current.order, current.sub_order, to_uuid_str(current.id))

        raw_q = (current.question or "").strip()
        if raw_q.startswith("["):
            try:
                arr = json.loads(raw_q)
                idx = question_index if question_index is not None else 0
                if idx < 0 or idx >= len(arr):
                    raise HTTPException(status_code=400, detail="question_index 범위 오류")
                chosen = arr[idx]
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=400, detail="초기 질문 리스트 파싱 실패")

            current.question = str(chosen).strip()
            db.add(current)
            db.commit()
            db.refresh(current)

        audio_bytes = await audio.read()
        filename = audio.filename or "audio.wav"
        content_type = audio.content_type or "audio/wav"
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="오디오가 비어있습니다.")

        answer = await transcribe_audio_bytes(audio_bytes, filename, content_type)

        try:
            gpt_text = await ask_gpt_if_ends_async([current.question], [answer])
            parsed = parse_gpt_result(gpt_text) or []
        except Exception as ge:
            log.error("[followup] GPT 호출 실패: %s", ge)
            parsed = []

        if not parsed:
            parsed = [{
                "is_ended": False,
                "reason_end": "파싱/호출 실패",
                "context_matched": True,
                "reason_context": "임시 기본값",
                "gpt_comment": "임시 기본값",
            }]

        res = parsed[0]
        is_ended = bool(res.get("is_ended", False))
        log.info("[followup] ended=%s, order=%s, sub=%s", is_ended, current.order, current.sub_order)

        current.answer = answer
        current.end_type = map_end_type(res)
        current.reason_end = res.get("reason_end", "")
        current.context_matched = res.get("context_matched", False)
        current.reason_context = res.get("reason_context", "")
        current.gpt_comment = res.get("gpt_comment", "")
        current.stopwords = map_stop_words(res)
        db.add(current)
        db.commit()
        db.refresh(current)

        background_tasks.add_task(_bg_analyze_and_persist, current.id, audio_bytes)

        if current.sub_order < MAX_FOLLOWUPS_PER_ORDER:
            if current.sub_order == 0:
                next_q = await generate_followup_question(current.question, answer)
            else:
                q0 = (
                    db.query(QuestionAnswerPair)
                      .filter_by(session_id=session_val, order=current.order, sub_order=0)
                      .first()
                )
                if not q0:
                    raise HTTPException(status_code=404, detail="첫 질문이 존재하지 않습니다.")
                next_q = await generate_second_followup_question(
                    base_question=q0.question,
                    answer1=q0.answer or "",
                    followup1=current.question,
                    answer2=answer,
                )

            exists = (
                db.query(QuestionAnswerPair.id)
                  .filter_by(session_id=session_val,
                             order=current.order,
                             sub_order=current.sub_order + 1)
                  .first()
            )
            if not exists:
                new_pair = QuestionAnswerPair(
                    session_id=session_val,
                    order=current.order,
                    sub_order=current.sub_order + 1,
                    question=next_q.strip(),
                    answer=None,
                    is_ended=False,
                    reason_end="",
                    context_matched=False,
                    reason_context="",
                    gpt_comment="",
                    end_type="",
                    stopwords="",
                    created_at=datetime.utcnow(),
                )
                db.add(new_pair)
                db.commit()
                db.refresh(new_pair)
            else:
                new_pair = (
                    db.query(QuestionAnswerPair)
                      .filter_by(session_id=session_val,
                                 order=current.order,
                                 sub_order=current.sub_order + 1)
                      .first()
                )

            return {
                "order": new_pair.order,
                "sub_order": new_pair.sub_order,
                "question": new_pair.question,
                "switch_order": False,
                "analysis": None,
            }

        next_row = (
            db.query(QuestionAnswerPair)
              .filter(
                  QuestionAnswerPair.session_id == session_val,
                  QuestionAnswerPair.order == current.order + 1,
                  QuestionAnswerPair.sub_order == 0,
                  _is_unanswered(QuestionAnswerPair.answer),
              )
              .first()
        )
        if next_row:
            return {
                "order": current.order + 1,
                "sub_order": 0,
                "question": next_row.question,
                "switch_order": True,
                "analysis": None,
            }

        return {"finished": True, "analysis": None}

    except HTTPException:
        raise
    except Exception as e:
        log.error("[followup] unexpected error: %s", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal error in followup_question")

@router.post("/v1/analyze/complete")
async def analyze_complete(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    order: int = Form(...),
    sub_order: int = Form(...),
    device: str = Form("cuda"),
    stride: int = Form(5),
    return_points: bool = Form(False),
    calib_data: Optional[str] = Form(None),
    return_debug: bool = Form(False),
    db: Session = Depends(get_db),
):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="빈 파일")

    parsed_calib_data = None
    if calib_data:
        try:
            parsed_calib_data = json.loads(calib_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid calib_data JSON: {e}")

    qa = get_or_create_qa_pair(db, session_id=session_id, order=order, sub_order=sub_order)

    try:
        out = analyze_all(
            data,
            device=device,
            stride=stride,
            return_points=return_points,
            calib_data=parsed_calib_data,
            return_debug=return_debug,
        )
    except Exception as e:
        log.exception("complete analysis 실패")
        raise HTTPException(status_code=500, detail=f"complete analysis 실패: {e}")

    try:
        dbg = out.get("debug") if isinstance(out, dict) else None
        if dbg:
            log.info("[ffmpeg] pipeline=%s encoder=%s decoder=%s scale=%s",
                     dbg.get("pipeline"), dbg.get("encoder"), dbg.get("decoder"), dbg.get("scale"))
    except Exception:
        pass

    qa = save_results_to_qa(db, qa, video_url=qa.video_url, result=out)

    resp = {
        "result_id": to_uuid_str(qa.id),
        "report_id": to_uuid_str(qa.session_id),
        "order": qa.order,
        "sub_order": qa.sub_order,
        "video_url": qa.video_url,
        "thumbnail_url": getattr(qa, "thumbnail_url", None),
        "posture_result": qa.posture_result,
        "face_result": qa.face_result,
        "gaze_result": qa.gaze_result,
        "created_at": qa.created_at.isoformat() + "Z" if qa.created_at else None,
    }
    if return_debug and isinstance(out, dict) and out.get("debug") is not None:
        resp["preprocess_debug"] = out["debug"]
    return resp

@router.post("/v1/analyze/complete-by-url")
async def analyze_complete_by_url(
    video_url: str = Form(...),
    session_id: str = Form(...),
    order: int = Form(...),
    sub_order: int = Form(...),
    device: str = Form("cuda"),
    stride: int = Form(5),
    return_points: bool = Form(False),
    thumbnail_url: Optional[str] = Form(None),
    calib_data: Optional[str] = Form(None),
    return_debug: bool = Form(False),
    db: Session = Depends(get_db),
):
    parsed_calib_data = None
    if calib_data:
        try:
            parsed_calib_data = json.loads(calib_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid calib_data JSON: {e}")

    qa = get_or_create_qa_pair(db, session_id=session_id, order=order, sub_order=sub_order, calib_data=parsed_calib_data)

    try:
        clean_url = video_url.strip().replace('\n', '').replace('\r', '')
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.get(clean_url)
            r.raise_for_status()
            data = r.content
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"URL 다운로드 실패: {e}")

    try:
        out = analyze_all(
            data,
            device=device,
            stride=stride,
            return_points=return_points,
            calib_data=parsed_calib_data,
            return_debug=return_debug,
        )
    except Exception as e:
        log.exception("URL 분석 실패")
        raise HTTPException(status_code=500, detail=f"URL 분석 실패: {e}")

    try:
        dbg = out.get("debug") if isinstance(out, dict) else None
        if dbg:
            log.info("[ffmpeg] pipeline=%s encoder=%s decoder=%s scale=%s",
                     dbg.get("pipeline"), dbg.get("encoder"), dbg.get("decoder"), dbg.get("scale"))
    except Exception:
        pass

    rel_video = to_files_relative(video_url)
    rel_thumb = to_files_relative(thumbnail_url)
    qa = save_results_to_qa(db, qa, video_url=rel_video, thumbnail_url=rel_thumb, result=out)

    resp = {
        "result_id": to_uuid_str(qa.id),
        "report_id": to_uuid_str(qa.session_id),
        "order": qa.order,
        "sub_order": qa.sub_order,
        "video_url": qa.video_url,
        "thumbnail_url": getattr(qa, "thumbnail_url", None),
        "posture_result": qa.posture_result,
        "face_result": qa.face_result,
        "gaze_result": qa.gaze_result,
        "created_at": qa.created_at.isoformat() + "Z" if qa.created_at else None,
    }
    if return_debug and isinstance(out, dict) and out.get("debug") is not None:
        resp["preprocess_debug"] = out["debug"]
    return resp

@router.post("/v1/face/predict")
async def face_predict(file: UploadFile = File(...), device: str = "cpu"):
    data = await file.read()
    if not data:
        raise HTTPException(400, "빈 파일")
    try:
        out = infer_face(data, device=device)
        return {"ok": True, "result": out}
    except Exception as e:
        raise HTTPException(500, f"face inference 실패: {e}")

@router.post("/v1/gaze/predict")
async def gaze_predict(file: UploadFile = File(...)):
    data = await file.read()
    if not data:
        raise HTTPException(400, "빈 파일")
    try:
        from fastapi import Response
        out = infer_gaze(data)

        def compress_heatmap_data(d):
            if isinstance(d, dict):
                result = {}
                for k, v in d.items():
                    if k == "heatmap_data" and isinstance(v, list):
                        result[k] = v
                    elif isinstance(v, dict):
                        result[k] = compress_heatmap_data(v)
                    elif isinstance(v, list):
                        result[k] = [compress_heatmap_data(i) if isinstance(i, dict) else i for i in v]
                    else:
                        result[k] = v
                return result
            return d

        compressed_out = compress_heatmap_data(out)
        result = {"ok": True, "result": compressed_out}
        json_str = json.dumps(result, separators=(',', ':'), ensure_ascii=False)
        return Response(content=json_str, media_type="application/json")
    except Exception as e:
        raise HTTPException(500, f"gaze inference 실패: {e}")

@router.post("/v1/posture/report")
async def posture_report(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".mp4", ".mov", ".avi", ".mkv")):
        raise HTTPException(
            status_code=415, detail="지원하지 않는 포맷입니다. mp4/mov/avi/mkv를 업로드 해주세요."
        )
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="업로드된 파일이 비어있습니다.")
    report = analyze_video_bytes(data)
    return JSONResponse(content=report)

async def _bg_analyze_and_persist(qa_id: bytes, audio_bytes: bytes):
    db = SessionLocal()
    try:
        analysis = await transcribe_and_analyze(audio_bytes)
        qa = db.get(QuestionAnswerPair, qa_id)
        if qa:
            try:
                if hasattr(qa, "speech_label") and hasattr(qa, "syll_art"):
                    qa.speech_label = analysis.get("label")
                    qa.syll_art = analysis.get("reason")
                elif hasattr(qa, "speech_analysis"):
                    qa.speech_analysis = analysis
                else:
                    payload = "\n[SPEECH_ANALYSIS]\n" + json.dumps(analysis, ensure_ascii=False)
                    qa.gpt_comment = (qa.gpt_comment or "") + payload
                db.add(qa)
                db.commit()
            except Exception:
                log.exception("[bg] 분석 결과 저장 실패 (qa_id=%s)", to_uuid_str(qa_id))
    except Exception as e:
        log.exception("Background analysis failed: %s", e)
    finally:
        db.close()
