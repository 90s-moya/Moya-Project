// src/stores/useAuthStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { jwtDecode } from "jwt-decode";
import type { AxiosError } from "axios";
import api from "@/api/index";

// ✅ 유저 정보 타입
interface UserInfo {
  userId: number;
  username: string;
  name: string;
  email: string;
  createAt: string;
}

// ✅ JWT payload 타입
interface JwtPayload {
  userId: number;
  iat: number;
  exp: number;
}

// ✅ Zustand 상태 타입
interface AuthState {
  token: string;
  user: UserInfo | null;
  isLogin: boolean;

  login: (user: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  getToken: () => string;
  changeProfile: (user: Partial<UserInfo>) => void;
}

// ✅ JWT 토큰 디코딩 함수
const decodeTokenToUser = (token: string): UserInfo => {
  const payload = jwtDecode<JwtPayload>(token);
  return {
    userId: payload.userId,
    username: "",
    name: "",
    email: "",
    createAt: "",
  };
};

// ✅ Zustand Store 생성
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: "",
      user: null,
      isLogin: false,

      login: async (loginInfo) => {
        try {
          const res = await api.post("/user/login", loginInfo); // ✨axios 인스턴스 사용
          const { accessToken, user } = res.data.data;

          if (!accessToken || typeof accessToken !== "string") {
            throw new Error("유효한 토큰이 아닙니다.");
          }

          const decodedUser = user ?? decodeTokenToUser(accessToken);

          set({
            token: accessToken,
            user: decodedUser,
            isLogin: true,
          });
        } catch (err: unknown) {
          const error = err as AxiosError;
          console.error("로그인 실패:", error.response?.data || error.message);
          throw error;
        }
      },

      logout: () => {
        set({
          token: "",
          user: null,
          isLogin: false,
        });
      },

      getToken: () => {
        return get().token;
      },

      changeProfile: (userUpdate) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              ...userUpdate,
            },
          });
        }
      },
    }),
    {
      name: "auth-storage", // localStorage key
    }
  )
);
