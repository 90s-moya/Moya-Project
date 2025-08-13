// 피드백 관련 API
import api from '@/api/index';
import type { FeedbackRoom } from '@/types/feedback';

/**
 * 내가 참여한 스터디 목록 조회
 * @returns Promise<FeedbackRoom[]>
 */
export const getMyStudyRooms = async (): Promise<FeedbackRoom[]> => {
  const response = await api.get('/v1/room/me');
  // response.data가 배열이면 그대로 반환, 아니면 response.data.data 반환
  return Array.isArray(response.data) ? response.data : response.data.data || [];
};
