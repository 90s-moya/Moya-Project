import httpx
import re
from decouple import config

GMS_API_KEY = config('GMS_API_KEY')
GMS_API_URL = config('GMS_BASE_URL')

async def ask_gpt_if_ends_async(question_list: list[str], answer_list: list[str]) -> str:
    """
    GPT API 호출 (비동기 httpx 사용) - 답변 평가
    """
    prompt = """
    당신은 면접 지원자를 평가한 경력이 10년 차 되는 면접관입니다.
    다음은 면접 지원자의 답변입니다.
    답변을 평가하세요.
    항목: is_ended, reason_end, context_matched, reason_context, speech_analysis, gpt_comment.
    출력 형식: 질문 N: ... (기존 형식 그대로)
    평가기준 요약:
    - is_ended: '했습니다'체면 true, 말끝 흐림/반복이면 false
    - context_matched: 질문 의도와 의미상 일치 여부
    - speech_analysis: filler_word_ratio(%), speaking_speed(wpm), ending_style(+/-), verbosity(sentence_count)
    """

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

    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            f"{GMS_API_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {GMS_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0
            }
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

def parse_gpt_result(gpt_text: str):
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

async def generate_initial_question(text: str) -> str:
    """
    PDF/자소서 텍스트를 받아 첫 번째 면접 질문 생성
    """
    prompt = f"""
    다음 자기소개서를 분석하고 면접 질문 3개를 만들어주고 첫 번째 질문을 던져줘.
    자기소개서:
    {text}
    """
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            GMS_API_URL,
            headers={
                "Authorization": f"Bearer {GMS_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0
            }
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
