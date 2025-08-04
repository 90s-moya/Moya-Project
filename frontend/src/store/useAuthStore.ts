import { create } from "zustand";
import { persist } from "zustand/middleware";
import { jwtDecode } from "jwt-decode";
import type { AxiosError } from "axios";
import AuthApi from "@/api/authApi";
import UserApi from "@/api/userApi";
import axios from "axios";

// ✅ 유저 정보 타입 (API 응답과 동일하게!)
interface UserInfo {
  tutorialStatus: string;
  UUID: string;
  token: string;
}

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
          // 👉 응답 타입을 정확히 맞추기 위해 명시적으로 타입 지정
          type RawLoginResponse = {
            tutorialStatus: string;
            message: string;
            UUID: string;
            token: string;
          };

          const res = await axios.post<RawLoginResponse>(
            `${import.meta.env.VITE_API_URL}/v1/auth/login`,
            loginInfo // 오타 user → loginInfo
          );
          console.log(res.data);
          console.log("check===============================");
          const { token, UUID, tutorialStatus } = res.data;

          if (!token || typeof token !== "string") {
            throw new Error("유효한 토큰이 아닙니다.");
          }

          // 👉 user 객체는 API 응답을 기반으로 직접 구성
          const user: UserInfo = { UUID, tutorialStatus, token };

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
          await AuthApi.logout();
        } catch (error) {
          console.error("로그아웃 API 요청 실패:", error);
        } finally {
          set({
            token: "",
            user: null,
            isLogin: false,
            UUID: "",
            tutorialStatus: "",
          });
        }
      },

      getToken: () => get().token,
      getUUID: () => get().UUID,

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
          // (만약 추가 API 정보가 있다면, 아래에 token을 다시 넣어줄 것!)
          const res = await UserApi.getMyInfo();
          set({ user: { ...res.data, token: get().token } });
        } catch (error) {
          console.error("사용자 정보 조회 실패:", error);
        }
      },
    }),
    {
      name: "auth-storage",
    }
  )
);
