import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import UserApi from "@/api/userApi";
import { Link } from "react-router-dom";

const LoginSucceeded: React.FC = () => {
  const [nickname, setNickname] = useState('별명');
  const location = useLocation();
  const { isLogin } = useAuthStore();

  useEffect(() => {
    const fetchUserNickname = async () => {
      try {
        // 회원가입에서 전달된 닉네임 정보 확인
        const signupData = location.state?.nickname;
        if (signupData) {
          setNickname(signupData);
          return;
        }

        // 로그인된 사용자의 경우 API에서 닉네임 조회
        if (isLogin) {
          const response = await UserApi.getMyInfo();
          console.log('사용자 정보:', response.data);
          
          // API 응답에서 닉네임 추출
          const userNickname = response.data?.nickname;
          if (userNickname) {
            setNickname(userNickname);
          }
        }
      } catch (error) {
        console.error('사용자 정보 조회 실패:', error);
        // 에러 시 기본값 유지
      }
    };

    fetchUserNickname();
  }, [location, isLogin]);
  const goToProfile = () => {
    // 실제 구현: navigate('/profile/setup');
  };

  const goToHome = () => {
    // 실제 구현: navigate('/');
  };

  return (
    <div className="flex w-full min-h-screen">
      {/* 왼쪽 일러스트 영역 */}
      <div className="flex-1 bg-gradient-to-b from-[#B6A9FD] via-[#5BA5FF] to-[#C0F0F7] opacity-80 flex flex-col justify-center items-center relative px-15 py-15">
        <div className="font-['Wix_Madefor_Display'] font-semibold text-[48px] leading-[1.4] text-[#FAFAFC] text-left mb-10 z-2 xl:text-[32px] xl:text-center xl:mb-5 lg:text-[24px]">
          {nickname}님
          <br />
          MOYA에 오신 것을
          <br />
          환영합니다!
          🎉
        </div>
        <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 translate-y-1/2">
          <img src="/src/assets/images/cloud-friends.png" alt="로고" />
        </div>
      </div>

      {/* 오른쪽 메인 콘텐츠 영역 */}
      <div className="flex-1 bg-white flex flex-col justify-center items-center px-30 py-20 xl:px-20 xl:py-15 xl:flex-col lg:px-5 lg:py-7.5">
        <div className="max-w-[480px] xl:max-w-[400px]">
          <h1 className="font-['Wix_Madefor_Display'] font-semibold text-[40px] leading-[1.4] text-[#1B1C1F] text-center mb-15 xl:text-[28px] xl:text-center xl:mb-10 lg:text-[24px]"></h1>

          <div className="flex flex-col gap-[18px]">
            <Link to ="/mypage/resume" >
            <button
              className="w-[480px] h-12 bg-[#2B7FFF] text-[#FAFAFC] border-none rounded-[12px] font-['Wix_Madefor_Display'] font-semibold text-[14px] leading-[1.714] cursor-pointer transition-all duration-200 ease-in-out flex items-center justify-center px-3 py-0.75 hover:bg-[#1E6FE8] xl:w-[400px] xl:max-w-[400px] lg:w-full"
              onClick={goToProfile}
            >
              이력서 및 포트폴리오 등록하러가기
            </button>
              </Link>
              <Link to="/">
            <button
              className="w-[480px] h-12 bg-[#EFEFF3] text-[#404249] border-none rounded-[12px] font-['Wix_Madefor_Display'] font-semibold text-[14px] leading-[1.714] cursor-pointer transition-all duration-200 ease-in-out flex items-center justify-center px-3 py-0.75 hover:bg-[#E0E0E6] xl:w-[400px] xl:max-w-[400px] lg:w-full"
              onClick={goToHome}
            >
              홈으로
            </button>
              </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginSucceeded;
