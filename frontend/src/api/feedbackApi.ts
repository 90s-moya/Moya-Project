// 피드백 관련 API
import api from '@/api/index';
import type { FeedbackRoom, FeedbackDetailResponse } from '@/types/feedback';

/**
 * 내가 참여한 스터디 목록 조회
 * @returns Promise<FeedbackRoom[]>
 */
export const getMyStudyRooms = async (): Promise<FeedbackRoom[]> => {
  const response = await api.get('/v1/room/me/done');
  // response.data가 배열이면 그대로 반환, 아니면 response.data.data 반환
  return Array.isArray(response.data) ? response.data : response.data.data || [];
};

/**
 * 특정 스터디의 피드백 상세 조회
 * @param roomId 스터디 방 ID
 * @returns Promise<FeedbackDetailResponse>
 */
export const getFeedbackDetail = async (roomId: string): Promise<FeedbackDetailResponse> => {
  const response = await api.get(`/v1/feedback/${roomId}`);
  return response.data;
};
