import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FormData {
  nickname: string;
  email: string;
  verificationCode: string;
  password: string;
  confirmPassword: string;
}

const SignupDetail: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    nickname: '',
    email: '',
    verificationCode: '',
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleEmailVerification = () => {
    // 이메일 인증 요청 로직
    setIsCodeSent(true);
  };
  
  const handleCodeVerification = () => {
    // 인증코드 확인 로직
    setIsEmailVerified(true);
  };
  
  const isPasswordMatch = formData.password === formData.confirmPassword && formData.password !== '';
  const isFormValid = formData.nickname && formData.email && isEmailVerified && formData.password && isPasswordMatch;

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Welcome Section */}
      <div className="w-1/2 bg-gradient-to-br from-purple-300 via-blue-400 to-cyan-200 relative min-h-screen">
        {/* Welcome Message - 중앙 상단 */}
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <h2 className="text-5xl font-semibold text-white leading-tight drop-shadow-lg">
            MOYA에<br />
            오신걸 환영합니다!
          </h2>
        </div>
        
        {/* Character Illustration - 하단 중앙 */}
        <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 translate-y-1/2">
          <div className="w-80 h-80 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/20">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">🤖</div>
              <p className="text-lg font-medium opacity-90">MOYA 캐릭터</p>
              <p className="text-sm opacity-70">이미지를 여기에 넣으세요</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="w-1/2 bg-white flex flex-col justify-center px-8 py-8 min-h-screen">
        <div className="max-w-md mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-semibold text-gray-900 mb-4">회원가입</h1>
            <p className="text-gray-600">계정 정보를 입력해주세요</p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Nickname */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                닉네임
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => handleInputChange('nickname', e.target.value)}
                  placeholder="닉네임을 입력해주세요"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                <button className="px-6 py-3 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors whitespace-nowrap">
                  중복 확인
                </button>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일 주소
              </label>
              <div className="space-y-3">
                {/* Email input */}
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="이메일을 입력해주세요"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                  <button 
                    onClick={handleEmailVerification}
                    disabled={!formData.email}
                    className="px-6 py-3 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    인증 요청
                  </button>
                </div>
                
                {/* Verification code */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.verificationCode}
                    onChange={(e) => handleInputChange('verificationCode', e.target.value)}
                    placeholder="인증번호를 입력해주세요"
                    disabled={!isCodeSent}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-100"
                  />
                  <button 
                    onClick={handleCodeVerification}
                    disabled={!formData.verificationCode || isEmailVerified}
                    className="px-6 py-3 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {isEmailVerified ? '인증완료' : '인증확인'}
                  </button>
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <div className="space-y-3">
                {/* Password input */}
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="비밀번호를 입력해주세요"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  8자 이상, 영문/숫자/특수문자 조합
                </p>
                
                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    비밀번호 확인
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="비밀번호를 다시 입력해주세요"
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {formData.confirmPassword && !isPasswordMatch && (
                    <p className="text-red-500 text-sm mt-1">비밀번호가 일치하지 않습니다</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              disabled={!isFormValid}
              className="w-full bg-blue-500 text-white py-4 rounded-xl text-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
            >
              회원가입 완료
            </button>
            
            {/* Login Link */}
            <div className="text-center pt-4">
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-gray-600">이미 회원이신가요?</span>
                <button className="text-blue-500 font-semibold hover:text-blue-600 transition-colors">
                  로그인
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupDetail;