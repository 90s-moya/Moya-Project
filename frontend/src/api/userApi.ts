// src/api/userApi.ts
import api from "@/api/index";

const BASE_URL = "/api/v1/user";

const UserApi = {
  // 비밀번호 변경
  changePassword(passwordData: {
    current_password: string;
    new_password: string;
  }) {
    return api.patch(`${BASE_URL}/password`, passwordData);
  },

  // 닉네임 수정
  updateNickname(nicknameData: {
    newNickname: string;
  }) {
    return api.patch(`${BASE_URL}/nickname`, nicknameData);
  },

  // 내 정보 조회
  getMyInfo() {
    return api.get(`${BASE_URL}/info`);
  },

  // 닉네임 중복 체크
  checkNickname(nickname: string) {
    // 임시 목업 - 실제 API 준비되면 아래 주석 해제하고 위 return 삭제
    return Promise.resolve({ data: { isAvailable: true } });
    // return api.get(`${BASE_URL}/check-nickname?nickname=${encodeURIComponent(nickname)}`);
  },

  // 이메일 중복 체크
  checkEmail(email: string) {
    // 임시 목업 - 실제 API 준비되면 아래 주석 해제하고 위 return 삭제
    return Promise.resolve({ data: { isAvailable: true } });
    // return api.get(`${BASE_URL}/check-email?email=${encodeURIComponent(email)}`);
  },

  // 랜덤 닉네임 생성
  getRandomNickname() {
    return api.get(`${BASE_URL}/random-nickname`);
  },
};

export default UserApi;
