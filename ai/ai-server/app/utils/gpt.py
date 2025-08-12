# utils/gpt.py
import httpx
import re
import json
from decouple import config

GMS_API_KEY = config('GMS_API_KEY')
GMS_API_URL = config('GMS_BASE_URL')


async def ask_gpt_if_ends_async(question_list: list[str], answer_list: list[str]) -> str:
    """
    GPT API 호출 (비동기 httpx 사용) - 답변 평가
    경량 모델을 사용해 응답 지연을 낮춤.
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

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{GMS_API_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {GMS_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o",  # 경량 모델 사용으로 지연 절감
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


async def generate_initial_question(text: str) -> list[str]:
    """
    자기소개서/포트폴리오 텍스트를 받아 실제 면접용 대질문 3개를 list[str] 형태로 반환
    """
    prompt = f"""
        너는 AI 면접관이야. 자기소개서, 포트폴리오, 이력서를 바탕으로 실제 면접에서 사용할 수 있는 질문을 총 3개 만들어줘.

        - 질문은 모두 자기소개서 기반의 경험, 역량, 동기와 관련된 것으로 구성해.
        - 각 질문은 명확하고 하나의 핵심을 물어보는 형태로 만들어.
        - 질문 외의 설명은 하지 말고, 질문 3개만 JSON 형식의 리스트로 반환해.

        자기소개서:
        {text}

        반환 형식:
        [
            "질문1",
            "질문2",
            "질문3"
        ]
    """

    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            f"{GMS_API_URL}/chat/completions",
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

        raw_output = response.json()["choices"][0]["message"]["content"].strip()

        # ```json ... ``` 마크다운 제거
        cleaned_output = re.sub(r"^```json\s*|\s*```$", "", raw_output.strip(), flags=re.MULTILINE)

        try:
            question_list = json.loads(cleaned_output)
            if not isinstance(question_list, list):
                raise ValueError("응답이 리스트 형식이 아님")
            return [str(q).strip() for q in question_list][:3]
        except json.JSONDecodeError as e:
            raise ValueError(f"GPT 응답이 올바른 JSON 형식이 아닙니다: {raw_output}") from e


async def generate_followup_question(base_question: str, answer: str) -> str:
    """
    사용자의 답변(STT 결과)을 바탕으로 꼬리질문 1개 생성
    """
    prompt = f"""
        너는 AI 면접관이야. 아래는 내가 한 질문과 면접자가 말한 답변이야.  
        면접자의 답변을 바탕으로, 맥락을 이어서 물어볼 수 있는 **자연스러운 꼬리질문**을 하나 생성해줘.

        규칙:
        - 질문은 하나의 핵심만 물어봐.
        - 설명 없이 아래 형식 그대로 출력해.
        - 다른 문장은 넣지 마.

        질문: "{base_question}"
        답변: "{answer}"

        꼬리질문:
    """

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{GMS_API_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {GMS_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.5
            }
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"].strip()
        return content.replace("꼬리질문:", "").strip()


async def generate_second_followup_question(base_question: str, answer1: str, followup1: str, answer2: str) -> str:
    """
    첫 질문과 첫 꼬리질문에 대한 두 개의 답변을 바탕으로 두 번째 꼬리질문 생성
    """
    prompt = f"""
        너는 AI 면접관이야. 아래는 내가 한 질문들과 면접자의 두 개의 답변이야.  
        마지막 답변에 이어서 던질 수 있는 **깊이 있는 꼬리질문**을 하나 만들어줘.

        규칙:
        - 질문은 하나의 핵심만 물어봐.
        - 설명 없이 아래 형식 그대로 출력해.
        - 다른 문장은 넣지 마.

        질문: "{base_question}"
        답변: "{answer1}"

        꼬리질문1: "{followup1}"
        답변: "{answer2}"

        꼬리질문:
    """

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{GMS_API_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {GMS_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.5
            }
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"].strip()
        return content.replace("꼬리질문:", "").strip()