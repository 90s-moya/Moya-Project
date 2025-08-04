// src/stores/useAuthStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { jwtDecode } from "jwt-decode";
import type { AxiosError } from "axios";
import AuthApi from "@/api/authApi";
import UserApi from "@/api/userApi";

// ✅ 유저 정보 타입
interface UserInfo {
  userId: string;
  nickname: string;
  email: string;
  createAt: string;
}

// ✅ JWT payload 타입
interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

// ✅ Zustand 상태 타입
interface AuthState {
  token: string;
  user: UserInfo | null;
  isLogin: boolean;
  UUID: string;
  tutorialStatus: string;

  login: (user: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => string;
  getUUID: () => string;
  updateUserInfo: (user: Partial<UserInfo>) => void;
  fetchUserInfo: () => Promise<void>;
}

// ✅ JWT 토큰 디코딩 함수
const decodeTokenToUser = (token: string): UserInfo => {
  const payload = jwtDecode<JwtPayload>(token);
  return {
    userId: payload.userId,
    nickname: "",
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
      UUID: "",
      tutorialStatus: "",

      login: async (loginInfo) => {
        try {
          const res = await AuthApi.login(loginInfo);
          const { token, UUID, tutorialStatus } = res.data;

          if (!token || typeof token !== "string") {
            throw new Error("유효한 토큰이 아닙니다.");
          }

          // 로그인 성공 후 사용자 정보 조회
          const userRes = await UserApi.getMyInfo();
          const user = userRes.data;

          set({
            token,
            UUID,
            tutorialStatus,
            user,
            isLogin: true,
          });
        } catch (err: unknown) {
          const error = err as AxiosError;
          console.error("로그인 실패:", error.response?.data || error.message);
          throw error;
        }
      },

      logout: async () => {
        try {
          // 서버에 로그아웃 요청
          await AuthApi.logout();
        } catch (error) {
          console.error("로그아웃 API 요청 실패:", error);
        } finally {
          // API 실패 여부와 관계없이 로컬 상태는 정리
          set({
            token: "",
            user: null,
            isLogin: false,
            UUID: "",
            tutorialStatus: "",
          });
        }
      },

      getToken: () => {
        return get().token;
      },

      getUUID: () => {
        return get().UUID;
      },

      updateUserInfo: (userUpdate) => {
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

      fetchUserInfo: async () => {
        try {
          const res = await UserApi.getMyInfo();
          set({ user: res.data });
        } catch (error) {
          console.error("사용자 정보 조회 실패:", error);
        }
      },
    }),
    {
      name: "auth-storage", // localStorage key
    }
  )
);
