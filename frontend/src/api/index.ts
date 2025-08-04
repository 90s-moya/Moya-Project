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
    const authStorage = localStorage.getItem("auth-storage");
    let token = "";

    // 파싱해서 token만 가져오기
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      token = parsed.state.token;
    }
    // const { getToken } = useAuthStore.getState();
    // const token = getToken();

    console.log("요청 URL:", config.url);
    console.log("OTP 체크:", config.url?.includes("/otp"), config.url?.includes("/v1/otp"));
    
    if (token && !config.url?.includes("/otp") && !config.url?.includes("/v1/otp")) {  
      config.headers["Authorization"] = `Bearer ${token}`;
      console.log("토큰 추가됨:", config.headers.Authorization);
    } else {
      console.log("토큰 제외됨 - OTP 요청");
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
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.error("API 응답 에러:", error.response?.status, error.response?.data);
    
    if (error.response?.status === 401) {
      console.error("401 Unauthorized - 토큰이 유효하지 않습니다.");
      // 필요시 자동 로그아웃 처리
      // const { logout } = useAuthStore.getState();
      // logout();
    }
    return Promise.reject(error);
  }
);

export default instance;
