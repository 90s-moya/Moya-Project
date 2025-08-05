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

export type MasterInfo = {
  nickname: string;
  makeRoomCnt: number;
  createdAt: string;
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

export type Category = {
  categoryId: string;
  categoryName: string;
};

// 방 입장 시 필요한 type
export type docsForEnterRoom = {
  resume_id: string;
  portfolio_id: string;
  coverletter_id: string;
};
