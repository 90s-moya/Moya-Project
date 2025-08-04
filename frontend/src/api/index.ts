import axios from "axios";
import { useAuthStore } from "@/store/useAuthStore";
import UserApi from "./userApi";

// Axios 인스턴스 생성
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // 개발용 API 요청 공통 URL
  timeout: 10000,
  withCredentials: true,
});

// 요청 인터셉터
instance.interceptors.request.use(
  (config) => {
    const { getToken } = useAuthStore.getState(); // 상태 가져오기
    const token = getToken();

  if (token && !config.url?.includes("/otp")) {
        config.headers.Authorization = `Bearer ${token}`;
      }

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
      console.log(config.headers.Authorization);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// const sendOtp = async (email: string) => {
//   try {
//     const response = await UserApi.post("/otp", { email }, {
//       headers: { Authorization: "" } // 토큰 제거
//     });
//     return response.data;
//   } catch (error) {
//     console.error("OTP 전송 실패:", error);
//     throw error;
//   }
// };


// 응답 인터셉터
// instance.interceptors.response.use(
//   (response) => {
//     if (response.status === 200) return response;
//     if (response.status === 404) {
//       return Promise.reject("404: 페이지 없음 " + response.request);
//     }
//     return response;
//   },
//   async (error) => {
//     if (error.response?.status === 401) {
//       const { logout } = useAuthStore.getState();
//       logout();

//       return Promise.reject({ error: "로그인이 필요한 서비s스입니다." });
//     }
//     return Promise.reject(error);
//   }
// );

export default instance;
