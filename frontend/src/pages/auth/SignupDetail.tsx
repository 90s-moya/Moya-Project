import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import AuthApi from '@/api/authApi';
import UserApi from '@/api/userApi';
import { useNavigate } from 'react-router-dom';

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
  const [messages, setMessages] = useState({
    nickname: { error: '', success: '' },
    email: { error: '', success: '' },
    otp: { error: '', success: '' },
    general: { error: '', success: '' }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [isEmailDuplicateChecked, setIsEmailDuplicateChecked] = useState(false);
  
  const navigate = useNavigate();

  // 입력값 변경 시 중복 확인 상태 리셋
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (field === 'nickname') {
      setIsNicknameChecked(false);
      setMessages(prev => ({
        ...prev,
        nickname: { error: '', success: '' }
      }));
    }
    if (field === 'email') {
      setIsEmailDuplicateChecked(false);
      setIsCodeSent(false);
      setIsEmailVerified(false);
      setMessages(prev => ({
        ...prev,
        email: { error: '', success: '' },
        otp: { error: '', success: '' }
      }));
    }
  };

  const handleEmailDuplicateCheck = async () => {
    if (!formData.email) {
      setMessages(prev => ({
        ...prev,
        email: { error: '이메일을 입력해주세요.', success: '' }
      }));
      return;
    }

    try {
      const res = await UserApi.checkEmail(formData.email);
      console.log('이메일 중복 확인 응답:', res);
      console.log('이메일 중복 확인 데이터:', res.data);
      
      if (res.data.isAvailable) {
        setIsEmailDuplicateChecked(true);
        setMessages(prev => ({
          ...prev,
          email: { error: '', success: '사용 가능한 이메일입니다.' }
        }));
      } else {
        setMessages(prev => ({
          ...prev,
          email: { error: '이미 사용 중인 이메일입니다.', success: '' }
        }));
        setIsEmailDuplicateChecked(false);
      }
    } catch (error: any) {
      console.error('이메일 중복 확인 에러:', error);
      console.error('에러 응답:', error.response);
      setMessages(prev => ({
        ...prev,
        email: { error: '이메일 중복 확인에 실패했습니다.', success: '' }
      }));
    }
  };

  const handleEmailVerification = async () => {
    if (!isEmailDuplicateChecked) {
      setMessages(prev => ({
        ...prev,
        otp: { error: '먼저 이메일 중복 확인을 해주세요.', success: '' }
      }));
      return;
    }

    try {
      await AuthApi.sendOtp({ email: formData.email, type: 'signup' });
      setIsCodeSent(true);
      setMessages(prev => ({
        ...prev,
        otp: { error: '', success: '인증번호가 발송되었습니다.' }
      }));
    } catch (error: any) {
      setMessages(prev => ({
        ...prev,
        otp: { error: '인증번호 발송에 실패했습니다.', success: '' }
      }));
    }
  };
  
  const handleCodeVerification = async () => {
    if (!formData.verificationCode) {
      setMessages(prev => ({
        ...prev,
        otp: { error: '인증번호를 입력해주세요.', success: '' }
      }));
      return;
    }

    try {
      await AuthApi.verifyOtp({
        email: formData.email,
        type: 'signup',
        otp: formData.verificationCode
      });
      setIsEmailVerified(true);
      setMessages(prev => ({
        ...prev,
        otp: { error: '', success: '이메일 인증이 완료되었습니다.' }
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '인증번호가 올바르지 않습니다.';
      setMessages(prev => ({
        ...prev,
        otp: { error: errorMessage, success: '' }
      }));
    }
  };

  const handleNicknameCheck = async () => {
    if (!formData.nickname) {
      setMessages(prev => ({
        ...prev,
        nickname: { error: '닉네임을 입력해주세요.', success: '' }
      }));
      return;
    }

    try {
      const res = await UserApi.checkNickname(formData.nickname);
      console.log('닉네임 중복 확인 응답:', res);
      console.log('닉네임 중복 확인 데이터:', res.data);
      
      if (res.data.isAvailable) {
        setIsNicknameChecked(true);
        setMessages(prev => ({
          ...prev,
          nickname: { error: '', success: '사용 가능한 닉네임입니다.' }
        }));
      } else {
        setMessages(prev => ({
          ...prev,
          nickname: { error: '이미 사용 중인 닉네임입니다.', success: '' }
        }));
        setIsNicknameChecked(false);
      }
    } catch (error: any) {
      console.error('닉네임 중복 확인 에러:', error);
      console.error('에러 응답:', error.response);
      setMessages(prev => ({
        ...prev,
        nickname: { error: '닉네임 중복 확인에 실패했습니다.', success: '' }
      }));
    }
  };

  const handleRandomNickname = async () => {
    try {
      const res = await UserApi.getRandomNickname();
      setFormData(prev => ({ ...prev, nickname: res.data.nickname }));
      setIsNicknameChecked(false); // 랜덤 닉네임 생성 후 중복 확인 필요
      setMessages(prev => ({
        ...prev,
        nickname: { error: '', success: '랜덤 닉네임이 생성되었습니다. 중복 확인을 해주세요.' }
      }));
    } catch (error: any) {
      setMessages(prev => ({
        ...prev,
        nickname: { error: '랜덤 닉네임 생성에 실패했습니다.', success: '' }
      }));
    }
  };
  
  const handleSignup = async () => {
    if (!isFormValid) return;
    
    setIsLoading(true);
    setMessages(prev => ({
      ...prev,
      general: { error: '', success: '' }
    }));
    
    try {
      const signupData = {
        email: formData.email,
        password: formData.password,
        password_confirm: formData.confirmPassword,
        nickname: formData.nickname,
        otp: formData.verificationCode
      };
      
      const res = await AuthApi.signUp(signupData);
      setMessages(prev => ({
        ...prev,
        general: { error: '', success: '회원가입이 완료되었습니다!' }
      }));
      console.log('회원가입 성공:', res.data);
      
      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '회원가입에 실패했습니다.';
      setMessages(prev => ({
        ...prev,
        general: { error: errorMessage, success: '' }
      }));
    } finally {
      setIsLoading(false);
    }
  };
  
  const isPasswordMatch = formData.password === formData.confirmPassword && formData.password !== '';
  const isFormValid = formData.nickname && isNicknameChecked && formData.email && isEmailDuplicateChecked && isEmailVerified && formData.password && isPasswordMatch;

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
              <img src="/src/assets/images/cloud-friends.png" alt="로고" />
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
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => handleInputChange('nickname', e.target.value)}
                    placeholder="닉네임을 입력해주세요"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                  <button 
                    onClick={handleNicknameCheck}
                    disabled={!formData.nickname || isNicknameChecked}
                    className="px-6 py-3 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {isNicknameChecked ? '확인완료' : '중복 확인'}
                  </button>
                </div>
                <button 
                  onClick={handleRandomNickname}
                  className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
                >
                  랜덤 닉네임 생성
                </button>
                {/* Nickname messages */}
                {messages.nickname.error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                    {messages.nickname.error}
                  </div>
                )}
                {messages.nickname.success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                    {messages.nickname.success}
                  </div>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일 주소
              </label>
              <div className="space-y-3">
                {/* Email input */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="이메일을 입력해주세요"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                    <button 
                      onClick={handleEmailDuplicateCheck}
                      disabled={!formData.email || isEmailDuplicateChecked}
                      className="px-6 py-3 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      {isEmailDuplicateChecked ? '확인완료' : '중복 확인'}
                    </button>
                  </div>
                  {/* Email messages */}
                  {messages.email.error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                      {messages.email.error}
                    </div>
                  )}
                  {messages.email.success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                      {messages.email.success}
                    </div>
                  )}
                  
                  <button 
                    onClick={handleEmailVerification}
                    disabled={!isEmailDuplicateChecked || isCodeSent}
                    className="w-full px-6 py-3 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCodeSent ? 'OTP 발송완료' : 'OTP 발송 요청'}
                  </button>
                  {/* OTP messages */}
                  {messages.otp.error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                      {messages.otp.error}
                    </div>
                  )}
                  {messages.otp.success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                      {messages.otp.success}
                    </div>
                  )}
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

            {/* General Error/Success Messages */}
            {messages.general.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {messages.general.error}
              </div>
            )}
            {messages.general.success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                {messages.general.success}
              </div>
            )}

            {/* Submit Button */}
            <button 
              onClick={handleSignup}
              disabled={!isFormValid || isLoading}
              className="w-full bg-blue-500 text-white py-4 rounded-xl text-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
            >
              {isLoading ? '처리중...' : '회원가입 완료'}
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