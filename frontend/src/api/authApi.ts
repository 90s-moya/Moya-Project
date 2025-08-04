// src/api/authApi.ts
import api from "@/api/index";

const BASE_URL = "/v1/auth";

const AuthApi = {
  // 회원가입 요청
  signUp(userData: {
    email: string;
    password: string;
    password_confirm: string;
    nickname: string;
    otp: string;
  }) {
    return api.post(`${BASE_URL}/signup`, userData);
  },



  // 이메일 OTP 발송
  sendOtp(otpData: { email: string; type: "SIGNUP" }) {
    return api.post(`/v1/otp`, otpData);
  },

  // 이메일 OTP 인증
  verifyOtp(verifyData: {
    email: string;
    type: "SIGNUP" ;
    otp: string;
  }) {
    return api.post(`/v1/otp-check`, verifyData);
  },
};

export default AuthApi;
