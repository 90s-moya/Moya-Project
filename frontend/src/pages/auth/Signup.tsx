import React from 'react';
import { Mail } from 'lucide-react';
import { Link } from "react-router-dom";


const Signup: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-white flex overflow-hidden">
      {/* Left Side - Illustration with Gradient Background (그라데이션 + 환영메시지 + 캐릭터) */}
      <div className="w-1/2 relative bg-gradient-to-br from-purple-300 via-blue-400 to-cyan-200 min-h-screen">
        {/* Welcome Message - 중앙 상단 */}
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <h2 className="text-5xl font-semibold text-white leading-tight drop-shadow-lg">
            MOYA에<br />
            오신걸 환영합니다!
          </h2>
        </div>
        
        {/* Character Illustration - 하단 중앙 */}
        <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 translate-y-1/2">
          <img src="/src/assets/images/cloud-friends.png" alt="로고" />
        </div>
       
      </div>

      {/* Right Side - Signup Form (폼 영역) */}
      <div className="w-1/2 bg-white flex flex-col justify-center px-8 py-8 min-h-screen">
        <div className="max-w-md mx-auto w-full space-y-8">
          {/* Main Content - 중앙 정렬 */}
          <div className="space-y-8">
            <div className="text-center" >
              <h1 className="text-5xl font-semibold text-gray-900 mb-6">
                회원가입
              </h1>
              <p className="text-lg font-semibold text-gray-600 mb-8">
                회원가입하고 내 지원 가능성 확인해보세요!
              </p>
            </div>

            {/* Email Signup Button */}
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors duration-200 shadow-lg hover:shadow-xl text-lg">
              <Mail className="w-6 h-6" />
              <Link to='/signup/detail' > 이메일로 가입하기 </Link>
            </button>

     
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>이미 회원이신가요?</span>
              <div className="flex items-center space-x-4">
                <button className="text-blue-500 font-semibold hover:text-blue-600 transition-colors">
                  <Link to = '/login'>로그인</Link>
                </button>
                <div className="w-px h-4 bg-gray-300"></div>
                <button className="text-blue-500 font-semibold hover:text-blue-600 transition-colors">
                  회원정보 찾기
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;