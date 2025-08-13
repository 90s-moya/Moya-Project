// 피드백 관련 타입 정의

export interface FeedbackRoom {
  id: string;
  title: string;
  body: string;
  maxUser: number;
  joinUser: number;
  categoryName: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackApiResponse {
  data: FeedbackRoom[];
  message: string;
  status: number;
}

export interface FeedbackItem {
  fdId: string;
  feedbackType: 'POSITIVE' | 'NEGATIVE';
  message: string;
  createdAt: string;
}

export interface FeedbackDetailResponse {
  videoUrl: string;
  feedbackList: FeedbackItem[];
}
