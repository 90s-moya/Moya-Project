// src/api/interviewApi.ts
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
  console.log("url 확인",url);
  const token =
    JSON.parse(localStorage.getItem("auth-storage") || "{}")?.state?.token || ""

  const res = await api.post<PdfExtractResponse>(
    url,
    {
      resumeUrl: (data.resumeUrl || "").trim(),
      portfolioUrl: (data.portfolioUrl || "").trim(),
      coverletterUrl: (data.coverletterUrl || "").trim()
    }
  );
    console.log("[/v1/pdf multipart] status:", res.status, "data:", res.data)

    if (res.status === 200) return res.data

  // 2) 여전히 실패 시 JSON으로 한 번 더 시도하여 서버 스펙 확인
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

  // 둘 다 실패하면 원본 에러를 그대로 던짐
  const err = new Error("POST /v1/pdf failed")
  ;(err as any).response = resJson
  throw err
}
