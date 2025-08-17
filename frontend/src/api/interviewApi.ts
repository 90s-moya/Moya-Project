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
  order?: number;
  sub_order?: number;
  question?: string;
  finished?: boolean;
  analysis?: any;
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

// === 비디오 업로드 ===
export async function sendVideoUpload(formData:FormData){
  const res = await api.post("v1/interview-video", formData)
  return res;
}

// ===== Followup 오디오 업로드 =====
// 요구사항: 저장 불필요, form-data 전송만 /api/v1/followup
export async function sendFollowupAudio(params: {
  sessionId: string
  order1: number
  subOrder: number
  audio: File

}): Promise<{ finished?: boolean }> {
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
  
  // 면접 완료 체크
  if (res.data.finished === true) {
    console.log("🎉 면접이 모든 질문이 완료되었습니다!");
    console.log("서버 응답:", res.data);
    localStorage.setItem("interviewFinished", "true");
    localStorage.setItem("interviewFinishedAt", new Date().toISOString());
    
    // 완료 상태 저장 (빈 question으로 UI가 완료 상태를 인식하도록)
    localStorage.setItem("questions", "");
    return { finished: true }; // 완료 상태 반환
  }
  
  const { order, sub_order, question } = res.data;
  localStorage.setItem("currentOrder", String(order));
  localStorage.setItem("currentSubOrder", String(sub_order));
  localStorage.setItem("questions", question);
  
  return { finished: false }; // 계속 진행

}

// 리포트 목록 조회
export const getReportList = async () => {
  const res = await api.get("/v1/me/report");
  return res.data;
};

// 리포트 제목 수정
export const updateReportTitle = async (reportId: string, title: string) => {
  const res = await api.post(`/v1/me/report/${reportId}/title`, { title });
  return res.data;
};

// 면접 결과 상세 조회
export const getInterviewResultDetail = async (reportId: string, resultId: string) => {
  const res = await api.get(`/v1/me/report/${reportId}/result/${resultId}`);
  return res.data;
};

