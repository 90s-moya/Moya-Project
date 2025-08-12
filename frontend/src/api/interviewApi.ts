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

export const extractTextFromPdf = async (
  data: PdfExtractRequest
): Promise<PdfExtractResponse> => {
  const res = await api.post<PdfExtractResponse>("/v1/pdf", {
    resumeUrl: (data.resumeUrl || "").trim(),
    portfolioUrl: (data.portfolioUrl || "").trim(),
    coverletterUrl: (data.coverletterUrl || "").trim(),
  }, { withCredentials: true, validateStatus: () => true });

  if (res.status >= 200 && res.status < 300) {
    localStorage.setItem("interviewSessionId", res.data.id);
    return res.data;
  }
  throw new Error(`PDF extract failed: ${res.status}`);
};

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