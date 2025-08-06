import requests
import json
import re
from decouple import config

GMS_API_KEY = config('GMS_API_KEY')
GMS_API_URL = config('GMS_BASE_URL')

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
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0
    }

    response = requests.post(
        GMS_API_URL,
        headers={
            "Authorization": f"Bearer {GMS_API_KEY}",
            "Content-Type": "application/json"
        },
        data=json.dumps(data)
    )

    if response.status_code == 200:
        return response.json()["choices"][0]["message"]["content"]
    else:
        return f"[ERROR {response.status_code}] {response.text}"


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
