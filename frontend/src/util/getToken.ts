// 로컬 스토리지로부터 토큰 받아오는 함수
export const getTokenFromLocalStorage = () => {
  const authStorage = localStorage.getItem("auth-storage");

  // 로컬스토리지로부터 불러온 값이 없다면
  if (!authStorage) return "";

  try {
    return JSON.parse(authStorage).state.token;
  } catch {
    return "";
  }
};