// src/api/authApi.ts
import api from "@/api/index";

const BASE_URL = "/api/v1/auth";

const AuthApi = {
  // 로그인 요청
  login(loginData: {
    email: string;
    password: string;
  }) {
    return api.post(`${BASE_URL}/login`, loginData);
  },

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

  // 로그아웃 요청
  logout() {
    return api.get(`${BASE_URL}/logout`);
  },

  // 이메일 OTP 발송
  sendOtp(otpData: {
    email: string;
    type: "signup" | "password-reset";
  }) {
    return api.post(`${BASE_URL}/send-otp`, otpData);
  },

  // 이메일 OTP 인증
  verifyOtp(verifyData: {
    email: string;
    type: "signup" | "password-reset";
    otp: string;
  }) {
    return api.post(`${BASE_URL}/verify-otp`, verifyData);
  },
};

export default AuthApi;
