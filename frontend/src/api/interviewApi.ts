// src/api/interviewApi.ts
import api from "./index"

// ===== PDF 추출 =====
export interface PdfExtractRequest {
  resumeUrl: string
  portfolioUrl: string
  coverletterUrl: string
}

export interface QAPair {
  order: number;
  subOrder: number;
  question: string;
  answer: string;
  isEnded: boolean;
  reasonEnd: string;
  contextMatched: boolean;
  reasonContext: string;
  gptComment: string;
  stopwords: string;
  endType: string;
  id: string;
  sessionId: string;
  createdAt: string;
}

type FollowupResponse = {
  order: number;
  sub_order: number;
  question: string;
};

export interface PdfExtractResponse {
  id:string
  qa_pairs: QAPair[]
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
      // 질문만 뽑기
    const questions = res.data.qa_pairs[0];
    localStorage.setItem("questions", res.data.qa_pairs?.[0]?.question ?? "");
    localStorage.setItem("currentOrder", "1");
    localStorage.setItem("currentSubOrder", "0");

    return res.data;
  }
  throw new Error(`PDF extract failed: ${res.status}`);
};

// ===== Followup 오디오 업로드 =====
// 요구사항: 저장 불필요, form-data 전송만 /api/v1/followup
export async function sendFollowupAudio(params: {
  sessionId: string
  order1: number
  subOrder: number
  audio: File

}): Promise<void> {
  const { sessionId, order1, subOrder, audio } = params

  const form = new FormData()
  form.append("session_id", sessionId)
  form.append("order", String(order1))
  form.append("sub_order", String(subOrder))
  form.append("audio", audio, audio.name)

  const token =
    JSON.parse(localStorage.getItem("auth-storage") || "{}")?.state?.token || ""

  // origin만 추출해서 per-request baseURL로 지정
  const ORIGIN = new URL(import.meta.env.VITE_API_URL).origin // ex) https://i13a602.p.ssafy.io

  const res = await api.post("/v1/followup", form, {
    withCredentials: true,
    validateStatus: () => true,
  })
  console.log("맞아 아니야 딱 말해 ",res)
   const { order, sub_order, question } = res.data;
    localStorage.setItem("currentOrder", order) ?? "0", 10;
    localStorage.setItem("currentSubOrder", sub_order) ?? "0", 10;
    localStorage.setItem("questions", question)

}