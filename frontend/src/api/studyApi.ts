// 면접 스터디 관련 API
import api from "./index";
import type {
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
export const getMyDocs = async () => {
  const res = await api.get(`/v1/docs/me`);

  return res.data;
};

// 방 입장
export const enterRoom = async ({
  room_id,
  resume_id,
  portfolio_id,
  coverletter_id,
}: EnterRoomParams) => {
  const res = await api.post(`/v1/room/${room_id}/enter`, {
    resume_id,
    portfolio_id,
    coverletter_id,
  });

  return res.data;
};
