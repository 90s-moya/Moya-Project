from rest_framework.decorators import api_view
from rest_framework.response import Response
from datetime import datetime
import whisper
import requests
import json
import uuid
import re
import tempfile
import os
import re
from .models import EvaluationSession, QuestionAnswerPair
from .serializers import EvaluationSessionSerializer
from decouple import config

# 🔐 GPT API 정보
GMS_API_KEY = config('GMS_API_KEY')
GMS_API_URL = config('GMS_BASE_URL')
os.environ["PATH"] += os.pathsep + r"C:\ffmpeg\bin"
# 🎙️ Whisper 모델 로드 (1회만)
whisper_model = whisper.load_model("medium")

def transcribe_audio(file_obj) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
        for chunk in file_obj.chunks():
            tmp_file.write(chunk)
        tmp_file_path = tmp_file.name  # 파일 경로 저장

    try:
        result = whisper_model.transcribe(tmp_file_path)
        return result["text"]
    finally:
        os.remove(tmp_file_path)  # 사용 후 파일 삭제

def ask_gpt_if_ends(question_list: list[str], answer_list: list[str]) -> str:
    prompt = "다음 각 답변에서 화자가 발화를 마무리하고 있는지와 질문과 같은 맥락으로 이야기하고 있는지 평가해 주세요. 각 쌍마다 코멘트도 작성해 주세요.\n\n"

    for i, (q, a) in enumerate(zip(question_list, answer_list), 1):
        prompt += f"질문 {i}: \"{q}\"\n답변 {i}: \"{a}\"\n\n"

    prompt += """다음 형식으로 응답해 주세요 (각 쌍에 대해 반복):
질문 N:
종결 여부: (True/False)
근거:
맥락 일치 여부: (True/False)
근거:
GPT 코멘트:
"""

    
    data = {
        "model": "gpt-4o",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0
    }

    response = requests.post(GMS_API_URL, headers = {
        "Authorization": f"Bearer {GMS_API_KEY}",
        "Content-Type": "application/json"
    }
, data=json.dumps(data))

    if response.status_code == 200:
        result = response.json()
        return result["choices"][0]["message"]["content"]
    else:
        return f"[ERROR {response.status_code}] {response.text}"

def parse_gpt_result(gpt_text: str):
    # \s* : 줄바꿈, 탭, 스페이스 등 포함한 유연한 공백 대응
    # (?:\n|$) : 마지막 줄에 줄바꿈 없어도 인식
    pattern = r"질문\s*(\d+):\s*종결 여부:\s*(True|False)\s*근거:\s*(.*?)\s*맥락 일치 여부:\s*(True|False)\s*근거:\s*(.*?)\s*GPT 코멘트:\s*(.*?)(?:\n{2,}|\Z)"
    matches = re.findall(pattern, gpt_text, re.DOTALL)
    parsed = []
    for m in matches:
        parsed.append({
            "order": int(m[0]),
            "is_ended": m[1] == "True",
            "reason_end": m[2].strip(),
            "context_matched": m[3] == "True",
            "reason_context": m[4].strip(),
            "gpt_comment": m[5].strip()
        })
    return parsed

@api_view(["POST"])
def evaluate_audio_pair(request):
    print("[1] Whisper 변환 시작:", datetime.now())

    question_list = []
    answer_list = []

    try:
        user_id_str = request.data.get("userId")
        if not user_id_str:
            return Response({"error": "userId 누락"}, status=400)
        user_id = uuid.UUID(user_id_str)

        for i in range(1, 4):
            q_file = request.FILES[f"question{i}"]
            a_file = request.FILES[f"answer{i}"]
            question_list.append(transcribe_audio(q_file))
            answer_list.append(transcribe_audio(a_file))

        print("🎤 Whisper 변환 완료:", datetime.now())

        gpt_result = ask_gpt_if_ends(question_list, answer_list)
        print("🤖 GPT 응답 완료:", datetime.now())

        # ✅ 세션 저장
        session = EvaluationSession.objects.create(user_id=user_id)

        # ✅ 각 QA 쌍 저장
        evaluations = parse_gpt_result(gpt_result)
        for i, eva in enumerate(evaluations):
            QuestionAnswerPair.objects.create(
                session=session,
                order=i + 1,
                question=question_list[i],
                answer=answer_list[i],
                is_ended=eva["is_ended"],
                reason_end=eva["reason_end"],
                context_matched=eva["context_matched"],
                reason_context=eva["reason_context"],
                gpt_comment=eva["gpt_comment"]
            )

        # ✅ 시리얼라이즈 후 응답
        serializer = EvaluationSessionSerializer(session)
        return Response(serializer.data)

    except Exception as e:
        return Response({"error": str(e)}, status=500)
@api_view(["POST"])
def evaluate_single_pair(request):
    try:
        user_id_str = request.data.get("userId")
        if not user_id_str:
            return Response({"error": "userId 누락"}, status=400)
        user_id = uuid.UUID(user_id_str)

        question = request.data.get("question")
        a_file = request.FILES.get("answer")

        if not question or not a_file:
            return Response({"error": "question 텍스트 또는 answer 파일 누락"}, status=400)

        answer = transcribe_audio(a_file)

        gpt_text = ask_gpt_if_ends([question], [answer])
        parsed_result = parse_gpt_result(gpt_text)

        if not parsed_result:
            return Response({
                "error": "GPT 응답 파싱 실패",
                "gpt_text": gpt_text  # 실제 응답 확인을 위해 반환
            }, status=500)

        eval_data = parsed_result[0]

        session = EvaluationSession.objects.create(user_id=user_id)
        QuestionAnswerPair.objects.create(
            session=session,
            order=1,
            question=question,
            answer=answer,
            is_ended=eval_data["is_ended"],
            reason_end=eval_data["reason_end"],
            context_matched=eval_data["context_matched"],
            reason_context=eval_data["reason_context"],
            gpt_comment=eval_data["gpt_comment"]
        )
        
        serializer = EvaluationSessionSerializer(session)
        return Response(serializer.data)
    
    except Exception as e:
        return Response({"error": str(e)}, status=500)