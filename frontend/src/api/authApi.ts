// src/api/auth.ts
import api from "@/api/index";

const BASE_URL = "/api/v1/auth";

const AuthApi = {
  // 회원가입 요청
  signUp(userData: {
    username: string;
    password: string;
    confirmPassword: string;
    name: string;
    otp: string;
  }) {
    return api.post(`${BASE_URL}/signup`, userData);
  },
};

export default AuthApi;
