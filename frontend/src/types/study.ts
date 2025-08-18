export type StudyRoom = {
  body: string;
  categoryName: string;
  conversation: string;
  createdAt: string;
  expiredAt: string;
  id: string;
  maxUser: number;
  openAt: string;
  title: string;
  joinUser: number;
};

// 방장 정보
export type MasterInfo = {
  nickname: string;
  makeRoomCnt: number;
  createdAt: string;
  masterId: string;
};

// 방 상세 정보
export type StudyRoomDetail = {
  body: string;
  categoryName: string;
  expiredAt: string;
  joinUsers: string[];
  masterInfo: MasterInfo;
  maxUser: number;
  openAt: string;
  title: string;
};

export type CreateFormData = {
  category_id: string;
  title: string;
  body: string;
  max_user: number;
  open_at: string;
  expired_at: string;
};

// 방 생성 시 필요한 카테고리 타입
export type Category = {
  categoryId: string;
  categoryName: string;
};

// 방 입장 시 필요한 docs 타입
export type MyDoc = {
  docsId: string;
  docsStatus: "RESUME" | "PORTFOLIO" | "COVERLETTER";
  fileUrl: string;
  userId: string;
};

// 방 입장 시 필요한 파라미터 타입
export type EnterRoomParams = {
  roomId: string;
  resumeId: string;
  portfolioId: string;
  coverletterId: string;
};

// 피드백 보내기 시 필요한 타입
export type createFeedbackParams = {
  roomId: string;
  receiverId: string;
  feedbackType: "POSITIVE" | "NEGATIVE";
  message: string;
};

// 내가 등록한 방 목록
export type MyRegisteredRoom = {
  id: string;
  categoryName: string;
  title: string;
  body: string;
  createdAt: string;
  joinUser: number;
  maxUser: number;
  openAt: string;
  expiredAt: string;
};
