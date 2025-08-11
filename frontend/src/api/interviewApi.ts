// AI 모의면접 관련 API 모음
import api from "./index"

export interface PdfExtractRequest {
  resumeUrl: string
  portfolioUrl: string
  coverletterUrl: string
}

export interface PdfExtractResponse {
  resumeText: string
  portfolioText: string
  coverletterText: string
}

export const extractTextFromPdf = async (
  data: PdfExtractRequest
): Promise<PdfExtractResponse> => {
  const res = await api.post<PdfExtractResponse>("/v1/pdf", data, {
  })
  return res.data
}