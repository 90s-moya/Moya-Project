// src/api/userApi.ts
import api from "@/api/index";
const BASE_URL = "/v1/user";

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



 // 이메일 OTP 발송
  sendOtp(otpData: {
    email: string;
    type: "SIGNUP";
  }) {
    return api.post(`/v1/otp`, otpData);
  },


  // export const sendOtp = async (email: string) => {
  //   try {
  //     const response = await api.post("/otp", { email });
  //     console.log("OTP 전송 성공:", response.data);
  //     return response.data;
  //   } catch (error: any) {
  //     // 401 에러 디버깅 로그
  //     if (error.response) {
  //       console.error("OTP 전송 실패 - 상태 코드:", error.response.status);
  //       console.error("응답 데이터:", error.response.data);
  //     } else {
  //       console.error("OTP 전송 실패 - 네트워크 에러:", error.message);
  //     }
  //     throw error;
  //   }
  // },


  // 이메일 중복 체크
  checkEmail(email: string) {
    // 임시 목업 - 실제 API 준비되면 아래 주석 해제하고 위 return 삭제
    return Promise.resolve({ data: { isAvailable: true } });
    // return api.get(`${BASE_URL}/check-email?email=${encodeURIComponent(email)}`);
  },

  // 랜덤 닉네임 생성
  getRandomNickname() {
    return api.get(`${BASE_URL}/random`);
  },
};

export default UserApi;
