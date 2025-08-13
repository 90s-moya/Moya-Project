// AI 모의면접 관련 API
import api from "./index";

// 리포트 목록 조회
export const getReportList = async () => {
  const res = await api.get("/v1/me/report");
  return res.data;
};

// 리포트 제목 수정
export const updateReportTitle = async (reportId: string, title: string) => {
  const res = await api.patch(`/v1/me/report/${reportId}/title`, { title });
  return res.data;
};

// 면접 결과 상세 조회
export const getInterviewResultDetail = async (reportId: string, resultId: string) => {
  const res = await api.get(`/v1/me/report/${reportId}/result/${resultId}`);
  return res.data;
};

