// src/router/auth-guard.ts
import { useAuthStore } from "@/store/useAuthStore"; // from 뒤의 경로 호출 문제가 있어서 수정했습니다.

// useAuthStore는 zustand에서 만든 react hook인데, react hook은 일반 함수(isAuthenticated) 내에서 사용할 수 없다고 합니다.
//그래서 이 일반 함수를 react hook으로 변경해서 에러를 해결했습니다.
export const useIsAuthenticated = (): boolean => {
  const auth = useAuthStore();

  if (!auth.isLogin) {
    // 추후에 모달로 바꿀예정
    const shouldLogin = confirm("로그인이 필요합니다! 로그인 하시겠습니까?");
    if (shouldLogin) {
      // React Router에서는 navigate 함수를 사용해야 함
      window.location.href = "/login";
    }
    return false;
  }

  console.log("로그인 인증 완료");
  return true;
};
