export type StudyRoom = {
  body: string;
  categoryName: string;
  conversation: string;
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
  docsStatus: "RESUME" | "PORTFOLIO" | "COVER_LETTER";
  fileUrl: string;
  userId: string;
};

export type EnterRoomParams = {
  room_id: string;
  resume_id: string;
  portfolio_id: string;
  coverletter_id: string;
};
