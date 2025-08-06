// src/api/userApi.ts
import api from "@/api/index";
import axios from "axios";
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
    return api.get(`${BASE_URL}/me`);
  },

  // 닉네임 중복 체크
  checkNickname(nickname: string) {
    return api.get(`${BASE_URL}/check-nickname`, {
      params: { nickname }
    });
  },



 // 이메일 OTP 발송
  sendOtp(otpData: {
    email: string;
    type: "SIGNUP";
  }) {
    // OTP 전용 axios 인스턴스 (토큰 없이)
    const otpApi = axios.create({
      baseURL: import.meta.env.VITE_API_URL,
      timeout: 10000,
      withCredentials: true,
    });
    
    return otpApi.post(`/v1/otp`, otpData);
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
    return api.post(`${BASE_URL}/check-email`,{email});
  },

  // 랜덤 닉네임 생성
  getRandomNickname() {
    return api.get(`${BASE_URL}/random`);
  },
};

export default UserApi;
