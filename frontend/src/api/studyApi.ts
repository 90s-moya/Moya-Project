// 면접 스터디 관련 API
import api from "./index";
import type {
  createFeedbackParams,
  CreateFormData,
  EnterRoomParams,
  StudyRoom,
  StudyRoomDetail,
} from "@/types/study";

// 방 전체 조회
export const getRoomList = async (): Promise<StudyRoom[]> => {
  const res = await api.get("/v1/room");

  return res.data;
};

// 방 상세 조회
export const getRoomDetail = async (id: string): Promise<StudyRoomDetail> => {
  const res = await api.get(`/v1/room/${id}`);

  return res.data;
};

// 카테고리 요청
export const getCategory = async () => {
  const res = await api.get("/v1/category");

  return res.data;
};

// 방 생성
export const createRoom = async (formData: CreateFormData) => {
  const res = await api.post("/v1/room", formData);

  return res.data;
};

// 내 서류 리스트 조회(방 입장 시 필요)
export const getMyDocsForEnterRoom = async () => {
  const res = await api.get(`/v1/docs/me`);

  return res.data;
};

// 방 입장 전 환경 설정 페이지에서 서류 등록
export const registerDocs = async ({
  roomId,
  resumeId,
  portfolioId,
  coverletterId,
}: EnterRoomParams) => {
  const res = await api.post(`/v1/room/${roomId}/register`, {
    resumeId,
    portfolioId,
    coverletterId,
  });

  console.log("registerDocs 응답:", res);
  console.log("registerDocs res.data:", res.data);

  return res.data;
};

// 방 삭제
export const deleteRoom = async (id: string) => {
  const res = await api.delete(`/v1/room/${id}`);

  return res;
};

// StudyRoomPage에서 피드백 보내기
export const createFeedback = async ({
  roomId,
  receiverId,
  feedbackType,
  message,
}: createFeedbackParams) => {
  const res = await api.post(`/v1/feedback`, {
    roomId,
    receiverId,
    feedbackType,
    message,
  });

  return res.data;
};

// 면접 스터디 방에서 참여자들 서류 조회
export const getDocsInRoom = async (room_id: string) => {
  const res = await api.get(`/v1/room/${room_id}/docs`);

  return res.data;
};
