// src/api/interviewApi.ts
import api from "./index"

// ===== PDF 추출 =====
export interface PdfExtractRequest {
  resumeUrl: string
  portfolioUrl: string
  coverletterUrl: string
}

export interface PdfExtractResponse {
  id:string
}

// 파일용
const abs = (path: string) =>
  new URL(path, import.meta.env.VITE_API_URL).toString()

// 서버용
const abs1 = (path: string) =>
  `${import.meta.env.VITE_API_URL}${path.startsWith("/") ? "" : "/"}${path}`

export const extractTextFromPdf = async (
  data: PdfExtractRequest
): Promise<PdfExtractResponse> => {
  const url = abs1("/v1/pdf")
  console.log("url 확인", url)

  const token =
    JSON.parse(localStorage.getItem("auth-storage") || "{}")?.state?.token || ""

  // 1) 기본 POST 시도
  const res = await api.post<PdfExtractResponse>(
    url,
    {
      resumeUrl: (data.resumeUrl || "").trim(),
      portfolioUrl: (data.portfolioUrl || "").trim(),
      coverletterUrl: (data.coverletterUrl || "").trim(),
    }
  )

  if(res.status==200) localStorage.setItem("interviewSessionId", res.data.id);
  if (res.status === 200) return res.data

  // 2) JSON으로 재시도
  const resJson = await api.post<PdfExtractResponse>(url, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    withCredentials: false,
    validateStatus: () => true,
  })
  console.log("[/v1/pdf json] status:", resJson.status, "data:", resJson.data)
  if (resJson.status === 200) return resJson.data

  const err = new Error("POST /v1/pdf failed")
  ;(err as any).response = resJson
  throw err
}

// ===== Followup 오디오 업로드 =====
// 요구사항: 저장 불필요, form-data 전송만 /api/v1/followup
export async function sendFollowupAudio(params: {
  sessionId: string
  order: number
  subOrder: number
  audio: File

}): Promise<void> {
  const { sessionId, order, subOrder, audio } = params

  const form = new FormData()
  form.append("session_id", sessionId)
  form.append("order", String(order))
  form.append("sub_order", String(subOrder))
  form.append("audio", audio, audio.name)

  const token =
    JSON.parse(localStorage.getItem("auth-storage") || "{}")?.state?.token || ""

  // origin만 추출해서 per-request baseURL로 지정
  const ORIGIN = new URL(import.meta.env.VITE_API_URL).origin // ex) https://i13a602.p.ssafy.io

  await api.post("/v1/followup", form, {
    withCredentials: true,
    validateStatus: () => true,
  })
}