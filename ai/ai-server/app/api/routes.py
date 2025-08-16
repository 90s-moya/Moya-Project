# app/api/routes.py
from __future__ import annotations

import json
import logging
import traceback, re, ast
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID
from app.utils.urls import to_files_relative
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Tuple
from sqlalchemy import String
from sqlalchemy.orm import Session
import httpx
from app.database import get_db, SessionLocal
from app.models import EvaluationSession, QuestionAnswerPair
from app.schemas import EvaluationSessionRead
from app.services.analysis_service import analyze_all
from app.services.analysis_db_service import get_or_create_qa_pair, save_results_to_qa

from app.services.face_service import infer_face
from app.services.gaze_service import (
    infer_gaze, 
    start_calibration, 
    add_calibration_point, 
    run_calibration, 
    save_calibration, 
    list_calibrations,
    load_calibration_for_tracking
)
from app.utils.gpt import (
    ask_gpt_if_ends_async,
    generate_followup_question,
    generate_initial_question,          # list[str] 3개 반환
    generate_second_followup_question,
    parse_gpt_result,
)
from app.utils.stt import (
    transcribe_audio_async,             # (레거시) 필요 시 유지
    transcribe_audio_bytes,             # 빠른 경로: 최소 STT
    transcribe_and_analyze,                # 백그라운드: 상세 분석
)
from app.utils.posture import analyze_video_bytes

router = APIRouter()
log = logging.getLogger(__name__)

# 한 대질문에서 최대 꼬리질문 2개(sub_order: 0 -> 1 -> 2)
MAX_FOLLOWUPS_PER_ORDER = 2


def _parse_questions_list(qs_raw):
    """
    GPT가 ```json ...``` 형태나 문자열 배열로 반환해도
    무조건 list[str]로 변환. (generate_initial_question이 list를 반환하지만 안전망)
    """
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


# --------------------------
# 매핑 유틸
# --------------------------
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


# --------------------------
# 시작: 대질문 3개 생성
# --------------------------
class PromptStartRequest(BaseModel):
    userId: UUID
    text: str


@router.post("/v1/prompt-start", response_model=EvaluationSessionRead)
async def prompt_start(payload: PromptStartRequest, db: Session = Depends(get_db)):
    try:
        user_id = payload.userId
        text = payload.text

        qs_raw = await generate_initial_question(text)     # list[str]
        qs = _parse_questions_list(qs_raw)                 # 안전망

        if not qs:
            raise HTTPException(status_code=500, detail="GPT 질문 생성 실패")

        # 세션 생성
        session = EvaluationSession(user_id=str(user_id), created_at=datetime.utcnow())
        db.add(session)
        db.commit()
        db.refresh(session)

        # 질문 3개 저장: order=1..3, sub_order=0
        qa_list = []
        for idx, q in enumerate(qs[:3], start=1):
            qa = QuestionAnswerPair(
                session_id=session.id,
                order=idx,
                sub_order=0,
                question=q,
                answer="",
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
        return session

    except HTTPException:
        raise
    except Exception as e:
        log.exception("prompt-start 실패: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------
# 꼬리질문 생성 & 평가 (빠른 경로 + 백그라운드 분석)
# --------------------------
@router.post("/v1/followup-question")
async def followup_question(
    background_tasks: BackgroundTasks,
    session_id: str = Form(...),          # 세션 UUID 문자열
    order: int = Form(...),               # 요청한 대질문 번호(우선 사용)
    sub_order: int = Form(...),           # 무시(하위호환용)
    audio: UploadFile = File(...),
    question_index: Optional[int] = Form(None),  # 과거 리스트 문자열 호환
    db: Session = Depends(get_db),
):
    try:
        # 1) 세션 UUID 정합성
        try:
            session_uuid = UUID(session_id.strip())
        except Exception:
            raise HTTPException(status_code=422, detail="session_id가 유효한 UUID가 아닙니다.")

        # 2) 세션 컬럼 타입 정합성
        session_col = QuestionAnswerPair.__table__.c.session_id
        session_val = str(session_uuid) if isinstance(session_col.type, String) else session_uuid

        # 3) 현재 질문 선택: ① 요청 order의 미답변 우선 ② 없으면 보정 생성 ③ 그래도 없으면 전역 미답변
        # 3-1) 요청 order에서 미답변 중 가장 작은 sub_order
        current = (
            db.query(QuestionAnswerPair)
              .filter(
                  QuestionAnswerPair.session_id == session_val,
                  QuestionAnswerPair.order == order,
                  QuestionAnswerPair.answer == ""
              )
              .order_by(QuestionAnswerPair.sub_order.asc())
              .first()
        )

        # 3-2) 없으면 보정 생성
        if not current:
            base = (
                db.query(QuestionAnswerPair)
                  .filter_by(session_id=session_val, order=order, sub_order=0)
                  .first()
            )
            if base:
                # base가 답변완료이고 sub_order=1이 없으면 생성
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
                        answer="",
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
                    # follow1이 있고 그것도 답변완료인데 sub_order=2가 없으면 생성
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
                                answer="",
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

        # 3-3) 그래도 없으면 세션 전역 미답변 중 가장 앞
        if not current:
            current = (
                db.query(QuestionAnswerPair)
                  .filter(
                      QuestionAnswerPair.session_id == session_val,
                      QuestionAnswerPair.answer == ""
                  )
                  .order_by(QuestionAnswerPair.order.asc(),
                            QuestionAnswerPair.sub_order.asc())
                  .first()
            )
        if not current:
            return {"finished": True, "analysis": None}

        log.info("[followup] session=%s -> current(order=%s, sub=%s, id=%s)",
                 session_val, current.order, current.sub_order, current.id)

        # 4) 과거 데이터 호환: question이 리스트 문자열이면 1회 정규화
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

        # 5) 오디오를 한 번만 읽어서 bytes 확보
        audio_bytes = await audio.read()
        filename = audio.filename or "audio.wav"
        content_type = audio.content_type or "audio/wav"

        # 5-0) 빠른 STT (최소 처리) → 다음 질문을 서빙하기 위한 텍스트만 확보
        answer = await transcribe_audio_bytes(audio_bytes, filename, content_type)

        # 6) GPT 평가 (가볍게 유지)
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

        # 7) 현재 row 업데이트 (빠른 경로: 답변/평가 결과까지만 저장)
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

        # 7-1) 음성 분석은 백그라운드에서 실행하여 DB에만 저장
        background_tasks.add_task(_bg_analyze_and_persist, current.id, audio_bytes)

        # 8) 같은 order에서 꼬리질문 계속 (종결 여부 무시)
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

            # 중복 생성 방지
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
                    answer="",
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
                "switch_order": False,  # 같은 order 유지
                "analysis": None,       # 이제 즉시 분석값은 반환하지 않음
            }

        # 9) 다음 order로 스위치 (sub_order=0, 미답변)
        next_row = (
            db.query(QuestionAnswerPair)
              .filter_by(session_id=session_val, order=current.order + 1, sub_order=0)
              .first()
        )
        if next_row and (next_row.answer or "") == "":
            return {
                "order": current.order + 1,
                "sub_order": 0,
                "question": next_row.question,
                "switch_order": True,
                "analysis": None,
            }

        # 10) 모든 질문 종료
        return {"finished": True, "analysis": None}

    except HTTPException:
        raise
    except Exception as e:
        log.error("[followup] unexpected error: %s", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal error in followup_question")


# --------------------------
# (선택) 분석 관련 라우트
# --------------------------
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
    # ↓↓↓ 새로 추가: 디버그를 응답에도 포함하고 싶으면 true 로
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

    # (1) QA 조회/생성
    qa = get_or_create_qa_pair(db, session_id=session_id, order=order, sub_order=sub_order)

    # (2) 분석 실행 (+ 디버그)
    try:
        out = analyze_all(
            data,
            device=device,
            stride=stride,
            return_points=return_points,
            calib_data=parsed_calib_data,
            return_debug=return_debug,   # ← 전달
        )
    except Exception as e:
        log.exception("complete analysis 실패")
        raise HTTPException(status_code=500, detail=f"complete analysis 실패: {e}")

    # FFmpeg/전처리 디버그를 서버 로그에 남김
    try:
        dbg = out.get("debug") if isinstance(out, dict) else None
        if dbg:
            log.info(
                "[ffmpeg] pipeline=%s encoder=%s decoder=%s scale=%s input=%s prefer=%s",
                dbg.get("pipeline"), dbg.get("encoder"), dbg.get("decoder"),
                dbg.get("scale"), dbg.get("input_codec"), dbg.get("preferred_encoder"),
            )
    except Exception:
        pass

    # (3) 결과 저장
    qa = save_results_to_qa(db, qa, video_url=qa.video_url, result=out)

    # (4) 응답 (요청 시 디버그 포함)
    resp = {
        "result_id": qa.id,
        "report_id": qa.session_id,
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


# --- PATCH: /v1/analyze/complete-by-url --------------------------------------
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
    # ↓↓↓ 새로 추가
    return_debug: bool = Form(False),
    db: Session = Depends(get_db),
):
    parsed_calib_data = None
    if calib_data:
        try:
            parsed_calib_data = json.loads(calib_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid calib_data JSON: {e}")

    # (1) QA 조회/생성
    qa = get_or_create_qa_pair(db, session_id=session_id, order=order, sub_order=sub_order, calib_data=parsed_calib_data)

    # (2) URL에서 비디오 다운로드
    try:
        clean_url = video_url.strip().replace('\n', '').replace('\r', '')
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.get(clean_url)
            r.raise_for_status()
            data = r.content
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"URL 다운로드 실패: {e}")

    # (3) 분석 실행 (+ 디버그)
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

    # FFmpeg/전처리 디버그를 서버 로그에 남김
    try:
        dbg = out.get("debug") if isinstance(out, dict) else None
        if dbg:
            log.info(
                "[ffmpeg] pipeline=%s encoder=%s decoder=%s scale=%s input=%s prefer=%s",
                dbg.get("pipeline"), dbg.get("encoder"), dbg.get("decoder"),
                dbg.get("scale"), dbg.get("input_codec"), dbg.get("preferred_encoder"),
            )
    except Exception:
        pass

    # (4) 저장
    rel_video = to_files_relative(video_url)
    rel_thumb = to_files_relative(thumbnail_url)
    qa = save_results_to_qa(db, qa, video_url=rel_video, thumbnail_url=rel_thumb, result=out)

    # (5) 응답 (요청 시 디버그 포함)
    resp = {
        "result_id": qa.id,
        "report_id": qa.session_id,
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
        import json
        from fastapi import Response
        
        out = infer_gaze(data)
        
        # heatmap_data를 직접 압축 처리
        def compress_heatmap_data(data):
            if isinstance(data, dict):
                result = {}
                for key, value in data.items():
                    if key == "heatmap_data" and isinstance(value, list):
                        # heatmap_data는 이미 압축된 상태로 처리
                        result[key] = value
                    elif isinstance(value, dict):
                        result[key] = compress_heatmap_data(value)
                    elif isinstance(value, list):
                        result[key] = [compress_heatmap_data(item) if isinstance(item, dict) else item for item in value]
                    else:
                        result[key] = value
                return result
            return data
        
        # 결과 압축 처리
        compressed_out = compress_heatmap_data(out)
        result = {"ok": True, "result": compressed_out}
        
        # 전체를 압축된 JSON으로 변환
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


# === 캘리브레이션 관련 엔드포인트들 ===
class CalibrationStartRequest(BaseModel):
    screen_width: int = 1920
    screen_height: int = 1080
    window_width: int = 1344
    window_height: int = 756

class CalibrationPointRequest(BaseModel):
    gaze_vector: List[float]
    target_point: Tuple[float, float]

@router.post("/v1/calibration/start")
async def calibration_start(request: CalibrationStartRequest):
    """캘리브레이션 시작"""
    try:
        result = start_calibration(
            request.screen_width, 
            request.screen_height, 
            request.window_width, 
            request.window_height
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"캘리브레이션 시작 실패: {e}")

@router.post("/v1/calibration/add-point")
async def calibration_add_point(request: CalibrationPointRequest):
    """캘리브레이션 포인트 추가"""
    try:
        result = add_calibration_point(request.gaze_vector, request.target_point)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"캘리브레이션 포인트 추가 실패: {e}")

@router.post("/v1/calibration/run")
async def calibration_run(mode: str = Form("quick")):
    """캘리브레이션 실행"""
    try:
        result = run_calibration(mode)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"캘리브레이션 실행 실패: {e}")

@router.post("/v1/calibration/save")
async def calibration_save(filename: str = Form(None)):
    """캘리브레이션 저장"""
    try:
        result = save_calibration(filename)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"캘리브레이션 저장 실패: {e}")

@router.get("/v1/calibration/list")
async def calibration_list():
    """저장된 캘리브레이션 목록"""
    try:
        result = list_calibrations()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"캘리브레이션 목록 조회 실패: {e}")

@router.post("/v1/tracking/load-calibration")
async def tracking_load_calibration(calib_path: str = Form(...)):
    """시선 추적용 캘리브레이션 로드"""
    try:
        result = load_calibration_for_tracking(calib_path)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"캘리브레이션 로드 실패: {e}")


# --------------------------
# 백그라운드 작업: 음성 상세 분석 저장
# --------------------------
async def _bg_analyze_and_persist(qa_id: int, audio_bytes: bytes):
    """
    무거운 분석은 응답 후에 실행. 새 DB 세션을 쓰고, 실패해도 서비스 흐름엔 영향 X.
    - QuestionAnswerPair에 JSON 칼럼 speech_analysis가 있으면 그 칼럼에 저장.
    - 없으면 gpt_comment에 JSON 문자열로 덧붙여 임시 저장(하위호환).
    """
    db = SessionLocal()
    try:
        analysis = await transcribe_and_analyze(audio_bytes)
        qa = db.query(QuestionAnswerPair).get(qa_id)
        if qa:
            try:
                # 1) 개별 컬럼이 있는 경우 우선 저장
                if hasattr(qa, "speech_label") and hasattr(qa, "syll_art"):
                    qa.speech_label = analysis.get("label")
                    qa.syll_art = analysis.get("reason")

                # 2) JSON 컬럼이 있는 경우(겸용 또는 대안)
                elif hasattr(qa, "speech_analysis"):
                    qa.speech_analysis = analysis  # dict 그대로 (JSON 타입이어야 함)

                else:
                    # 하위호환: 문자열 필드에 JSON을 덧붙여 저장
                    payload = "\n[SPEECH_ANALYSIS]\n" + json.dumps(analysis, ensure_ascii=False)
                    qa.gpt_comment = (qa.gpt_comment or "") + payload
                db.add(qa)
                db.commit()
            except Exception:
                # 어떤 이유로든 저장 실패 시 로깅만
                log.exception("[bg] 분석 결과 저장 실패 (qa_id=%s)", qa_id)
    except Exception as e:
        log.exception("Background analysis failed: %s", e)
    finally:
        db.close()