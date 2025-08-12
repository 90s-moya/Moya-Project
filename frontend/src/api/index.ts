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

    console.log("요청 URL:", config.url);
    console.log("OTP 체크:", config.url?.includes("/otp"), config.url?.includes("/v1/otp"), config.url?.includes("otp-check"));
    
    // OTP 관련 API들은 토큰 없이 호출
    const isOtpRequest = config.url?.includes("/otp") || config.url?.includes("/v1/otp") || config.url?.includes("otp-check");
    console.log("isOtpRequest:", isOtpRequest);
    console.log("token 존재:", !!token);
    
    // Content-Type 헤더 설정
    if (config.data instanceof FormData) {
      console.log("FormData 감지 - Content-Type 헤더 제거");
      // FormData의 경우 Content-Type을 완전히 제거하여 브라우저가 자동으로 multipart/form-data와 boundary를 설정하도록 함
      delete config.headers["Content-Type"];
      // FormData 요청에서는 withCredentials를 false로 설정
      config.withCredentials = false;
      console.log("FormData 요청 - withCredentials를 false로 설정");
      console.log("FormData entries:");
      for (let [key, value] of config.data.entries()) {
        console.log(`  ${key}:`, value);
      }
    } else if (config.data && !config.headers["Content-Type"]) {
      // JSON 데이터의 경우에만 application/json 설정
      config.headers["Content-Type"] = "application/json";
    }
    
    // OTP 요청의 경우 withCredentials를 false로 설정
    if (isOtpRequest) {
      config.withCredentials = false;
      console.log("OTP 요청 - withCredentials를 false로 설정");
    }
    
    if (token && !isOtpRequest) {  
      config.headers["Authorization"] = `Bearer ${token}`;
      console.log("토큰 추가됨:", config.headers.Authorization);
    } else {
      console.log("토큰 제외됨 - OTP 요청 또는 토큰 없음");
      // OTP 요청인 경우 기존 Authorization 헤더 제거
      if (isOtpRequest && config.headers["Authorization"]) {
        delete config.headers["Authorization"];
        console.log("기존 Authorization 헤더 제거됨");
      }
    }
    
    console.log("최종 요청 헤더:", config.headers);
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
    console.log('응답 인터셉터 - URL:', response.config.url);
    console.log('응답 인터셉터 - 원본 데이터:', response.data);
    
    // DocsApi 응답에서 fileUrl을 전체 URL로 변환
    if (response.config.url?.includes('/v1/docs')) {
      console.log('Docs API 응답 감지');
      
      if (Array.isArray(response.data)) {
        console.log('배열 데이터 처리');
        // 배열인 경우 (getMyDocs)
        response.data = response.data.map((item: any) => {
          console.log('처리 전 item:', item);
          if (item.fileUrl && !item.fileUrl.startsWith('http')) {
            const updatedItem = {
              ...item,
              fileUrl: `${import.meta.env.VITE_API_URL}${item.fileUrl}`
            };
            console.log('처리 후 item:', updatedItem);
            return updatedItem;
          }
          return item;
        });
      } else if (response.data && response.data.fileUrl && !response.data.fileUrl.startsWith('http')) {
        console.log('단일 데이터 처리');
        // 단일 객체인 경우 (uploadDoc)
        response.data = {
          ...response.data,
          fileUrl: `${import.meta.env.VITE_API_URL}${response.data.fileUrl}`
        };
        console.log('처리 후 단일 데이터:', response.data);
      }
      
      console.log('최종 변환된 데이터:', response.data);
    }
    return response;
  },
  // async (error) => {
  //   console.error("API 응답 에러:", error.response?.status, error.response?.data);
    
  //   if (error.response?.status === 401) {
  //     console.error("401 Unauthorized - 토큰이 유효하지 않습니다.");
      
  //     // 자동 로그아웃 처리
  //     const { logout } = useAuthStore.getState();
  //     await logout();
      
  //     // 로그인 페이지로 리다이렉트
  //     window.location.href = '/login';
  //   }
  //   return Promise.reject(error);
  // }
);

export default instance;
