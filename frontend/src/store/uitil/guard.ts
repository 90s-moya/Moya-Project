// src/router/auth-guard.ts
import { useAuthStore } from "../src/store/useAuthStore";

export const isAuthenticated = (): boolean => {
  const auth = useAuthStore();
  
  if (!auth.isLogin) {
    // 추후에 모달로 바꿀예정
    const shouldLogin = confirm('로그인이 필요합니다! 로그인 하시겠습니까?')
    if (shouldLogin) {
      // React Router에서는 navigate 함수를 사용해야 함
      window.location.href = '/login'
    }
    return false
  }

  console.log('로그인 인증 완료')
  return true
}