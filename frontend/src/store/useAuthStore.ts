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
          // 👉 실제 API 응답 구조에 맞춰 타입 수정
          type RawLoginResponse = {
            tutorialStatus: string;
            message: string;
            UUID: string;
            token: string;
          };

          const res = await axios.post<RawLoginResponse>(
            `${import.meta.env.VITE_API_URL}/v1/auth/login`,
            loginInfo
          );
          console.log("로그인 응답:", res.data);

          const { token, UUID, tutorialStatus } = res.data;

          if (!token || typeof token !== "string") {
            throw new Error("유효한 토큰이 아닙니다.");
          }

          // JWT 토큰 디코딩해서 실제 페이로드 확인
          let decodedUUID = UUID;
          try {
            const decoded: any = jwtDecode(token);
            console.log("JWT 디코딩된 페이로드:", decoded);

            // JWT에서 userId를 UUID로 사용
            if (decoded.userId) {
              decodedUUID = decoded.userId;
              console.log("JWT에서 추출한 UUID:", decodedUUID);
            }
          } catch (decodeError) {
            console.error("JWT 디코딩 실패:", decodeError);
          }

          // 👉 JWT에서 추출한 UUID 사용
          const user: UserInfo = {
            UUID: decodedUUID,
            tutorialStatus,
            token,
          };

          set({
            token,
            UUID: decodedUUID,
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
        localStorage.removeItem("auth");
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
      partialize: (state) => ({
        token: state.token,
        UUID: state.UUID,
        tutorialStatus: state.tutorialStatus,
        isLogin: state.isLogin,
      }),
    }
  )
);
