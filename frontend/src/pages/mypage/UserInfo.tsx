import React, { useEffect, useState } from 'react';
import Header from '@/components/common/Header';
import Sidebar from '@/components/mypage/Sidebar';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import UserApi from '@/api/userApi';

interface UserInfoData {
  nickname: string;
  email: string;
}

const UserInfo: React.FC = () => {
  const navigate = useNavigate();
  const { isLogin } = useAuthStore();
  const [userInfo, setUserInfo] = useState<UserInfoData>({ nickname: '', email: '' });
  const [isLoading, setIsLoading] = useState(true);
  
  // 닉네임 수정 관련 상태
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [nicknameMessage, setNicknameMessage] = useState({ error: '', success: '' });
  const [isNicknameLoading, setIsNicknameLoading] = useState(false);
  
  // 비밀번호 변경 관련 상태
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState({ error: '', success: '' });
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!isLogin) {
        navigate('/login');
        return;
      }

      const currentState = useAuthStore.getState();
      console.log('로그인 상태:', isLogin);
      console.log('현재 토큰:', currentState.getToken());
      console.log('UUID:', currentState.getUUID());
      console.log('전체 상태:', currentState);

      try {
        const res = await UserApi.getMyInfo();
        console.log('마이페이지 사용자 정보:', res.data);
        setUserInfo({
          nickname: res.data.nickname || '',
          email: res.data.email || ''
        });
      } catch (error: any) {
        console.error('사용자 정보 조회 실패:', error);
        console.error('에러 상세:', error.response?.status, error.response?.data);
        
        // 토큰 만료 확인
        if (error.response?.status === 401) {
          console.log('401 에러 - 토큰 재확인 필요');
          // 필요시 재로그인 또는 토큰 갱신 로직
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, [isLogin, navigate]);

  // 닉네임 수정 시작
  const handleNicknameEdit = () => {
    setIsEditingNickname(true);
    setNewNickname(userInfo.nickname);
    setNicknameMessage({ error: '', success: '' });
  };

  // 닉네임 변경 처리
  const handleNicknameChange = async () => {
    if (!newNickname.trim()) {
      setNicknameMessage({ error: '닉네임을 입력해주세요.', success: '' });
      return;
    }

    if (newNickname === userInfo.nickname) {
      setNicknameMessage({ error: '현재 닉네임과 동일합니다.', success: '' });
      return;
    }

    setIsNicknameLoading(true);
    try {
      // 1. 닉네임 중복 체크
      await UserApi.checkNickname(newNickname);
      
      // 2. 닉네임 변경
      await UserApi.updateNickname({ newNickname });
      
      // 3. 성공 처리
      setUserInfo(prev => ({ ...prev, nickname: newNickname }));
      setNicknameMessage({ error: '', success: '닉네임이 성공적으로 변경되었습니다.' });
      setIsEditingNickname(false);
      
    } catch (error: any) {
      let errorMessage = '닉네임 변경에 실패했습니다.';
      
      if (error.response?.status === 409) {
        errorMessage = '이미 사용 중인 닉네임입니다.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setNicknameMessage({ error: errorMessage, success: '' });
    } finally {
      setIsNicknameLoading(false);
    }
  };

  // 닉네임 수정 취소
  const handleNicknameCancelEdit = () => {
    setIsEditingNickname(false);
    setNewNickname('');
    setNicknameMessage({ error: '', success: '' });
  };

  // 비밀번호 수정 시작
  const handlePasswordEdit = () => {
    setIsEditingPassword(true);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordMessage({ error: '', success: '' });
  };

  // 비밀번호 변경 처리
  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ error: '모든 필드를 입력해주세요.', success: '' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ error: '새 비밀번호가 일치하지 않습니다.', success: '' });
      return;
    }

    setIsPasswordLoading(true);
    try {
      // UserApi에서 정의된 정확한 필드명 사용
      const requestData = {
        current_password: currentPassword,
        new_password: newPassword
      };
      
      await UserApi.changePassword(requestData);
      
      setPasswordMessage({ error: '', success: '비밀번호가 성공적으로 변경되었습니다.' });
      setIsEditingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
    } catch (error: any) {
      console.error('비밀번호 변경 에러:', error);
      console.error('에러 상태:', error.response?.status);
      console.error('에러 데이터:', error.response?.data);
      
      let errorMessage = '비밀번호 변경에 실패했습니다.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = '현재 비밀번호가 올바르지 않습니다.';
      } else if (error.response?.status === 401) {
        errorMessage = '현재 비밀번호가 올바르지 않습니다.';
      } else if (error.response?.status === 403) {
        errorMessage = '현재 비밀번호가 올바르지 않습니다.';
      }
      
      setPasswordMessage({ error: errorMessage, success: '' });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // 비밀번호 수정 취소
  const handlePasswordCancelEdit = () => {
    setIsEditingPassword(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordMessage({ error: '', success: '' });
  };

  const handleWithdraw = () => {
    if (confirm('정말로 회원탈퇴를 하시겠습니까?')) {
      alert('회원탈퇴 처리되었습니다.');
    }
  };

  const handleSidebarNavigation = (menu: string) => {
    navigate(`/mypage/${menu}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* 메인 콘텐츠 */}
      <div className="flex max-w-7xl mx-auto px-8 py-12 pt-32">
        <Sidebar activeMenu="userinfo" onNavigate={handleSidebarNavigation} />

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1">
          <h2 className="text-2xl font-semibold text-[#1B1C1F] mb-8 leading-[1.4]">
            회원정보
          </h2>

          {/* 구분선 */}
          <div className="w-full h-px bg-[#DEDEE4] mb-8"></div>

          <div className="max-w-2xl space-y-8">
            {/* 닉네임 */}
            <div>
              <label className="block text-lg font-semibold text-[#404249] mb-4 leading-[1.556]">
                닉네임
              </label>
              <div className="space-y-3">
                <div className="h-12 bg-white border border-[#DEDEE4] rounded-xl flex items-center justify-between px-4">
                  <input 
                    type="text"
                    value={isEditingNickname ? newNickname : userInfo.nickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    placeholder="닉네임을 입력하세요"
                    readOnly={!isEditingNickname}
                    className="flex-1 text-sm font-semibold text-[#1B1C1F] leading-[1.714] bg-transparent border-none outline-none"
                  />
                  {!isEditingNickname ? (
                    <button 
                      onClick={handleNicknameEdit} 
                      className="w-24 h-8 bg-[#2B7FFF] hover:bg-[#1E6FE8] text-white rounded-md text-sm font-normal flex items-center justify-center transition-colors"
                    >
                      닉네임 변경
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleNicknameChange}
                        disabled={isNicknameLoading}
                        className="w-16 h-8 bg-[#2B7FFF] hover:bg-[#1E6FE8] text-white rounded-md text-sm font-normal flex items-center justify-center transition-colors disabled:bg-gray-300"
                      >
                        {isNicknameLoading ? '확인중...' : '확인'}
                      </button>
                      <button 
                        onClick={handleNicknameCancelEdit}
                        className="w-16 h-8 bg-[#EFEFF3] hover:bg-[#E0E0E6] text-[#404249] rounded-md text-sm font-normal flex items-center justify-center transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  )}
                </div>
                
                {/* 닉네임 메시지 */}
                {nicknameMessage.error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                    {nicknameMessage.error}
                  </div>
                )}
                {nicknameMessage.success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                    {nicknameMessage.success}
                  </div>
                )}
              </div>
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-lg font-semibold text-[#404249] mb-4 leading-[1.556]">
                이메일
              </label>
              <div className="h-12 bg-white border border-[#DEDEE4] rounded-xl flex items-center px-4">
                <input 
                  type="email"
                  value={userInfo.email}
                  placeholder="이메일을 입력하세요"
                  readOnly
                  className="w-full text-sm font-semibold text-[#1B1C1F] leading-[1.714] bg-transparent border-none outline-none"
                />
              </div>
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-lg font-semibold text-[#404249] mb-4 leading-[1.556]">
                비밀번호
              </label>
              <div className="space-y-3">
                {!isEditingPassword ? (
                  <div className="h-12 bg-white border border-[#DEDEE4] rounded-xl flex items-center justify-between px-4">
                    <input 
                      type="password"
                      value="••••••••"
                      readOnly
                      className="flex-1 text-sm font-semibold text-[#1B1C1F] leading-[1.714] bg-transparent border-none outline-none"
                    />
                    <button 
                      onClick={handlePasswordEdit} 
                      className="w-24 h-8 bg-[#2B7FFF] hover:bg-[#1E6FE8] text-white rounded-md text-sm font-normal flex items-center justify-center transition-colors"
                    >
                      비밀번호 변경
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 현재 비밀번호 */}
                    <div className="h-12 bg-white border border-[#DEDEE4] rounded-xl flex items-center px-4">
                      <input 
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="현재 비밀번호를 입력하세요"
                        className="w-full text-sm font-semibold text-[#1B1C1F] leading-[1.714] bg-transparent border-none outline-none"
                      />
                    </div>
                    
                    {/* 새 비밀번호 */}
                    <div className="h-12 bg-white border border-[#DEDEE4] rounded-xl flex items-center px-4">
                      <input 
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="새 비밀번호를 입력하세요"
                        className="w-full text-sm font-semibold text-[#1B1C1F] leading-[1.714] bg-transparent border-none outline-none"
                      />
                    </div>
                    
                    {/* 새 비밀번호 확인 */}
                    <div className="h-12 bg-white border border-[#DEDEE4] rounded-xl flex items-center px-4">
                      <input 
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="새 비밀번호를 다시 입력하세요"
                        className="w-full text-sm font-semibold text-[#1B1C1F] leading-[1.714] bg-transparent border-none outline-none"
                      />
                    </div>
                    
                    {/* 비밀번호 일치 확인 메시지 */}
                    {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                      <p className="text-red-500 text-sm">비밀번호가 일치하지 않습니다</p>
                    )}
                    
                    {/* 버튼들 */}
                    <div className="flex gap-2">
                      <button 
                        onClick={handlePasswordChange}
                        disabled={isPasswordLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword}
                        className="flex-1 h-12 bg-[#2B7FFF] hover:bg-[#1E6FE8] text-white rounded-xl text-sm font-semibold flex items-center justify-center transition-colors disabled:bg-gray-300"
                      >
                        {isPasswordLoading ? '변경중...' : '비밀번호 변경'}
                      </button>
                      <button 
                        onClick={handlePasswordCancelEdit}
                        className="flex-1 h-12 bg-[#EFEFF3] hover:bg-[#E0E0E6] text-[#404249] rounded-xl text-sm font-semibold flex items-center justify-center transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
                
                {/* 비밀번호 메시지 */}
                {passwordMessage.error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                    {passwordMessage.error}
                  </div>
                )}
                {passwordMessage.success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                    {passwordMessage.success}
                  </div>
                )}
              </div>
            </div>

            {/* 회원탈퇴 */}
            <div className="pt-4">
              <button 
                onClick={handleWithdraw} 
                className="w-full h-12 bg-[#EFEFF3] hover:bg-[#E0E0E6] text-[#404249] border-none rounded-xl text-sm font-semibold flex items-center justify-center transition-colors"
              >
                회원탈퇴
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* 프로필 아이콘 (우하단 고정) */}
      <div className="fixed bottom-12 right-12">
        <div className="w-15 h-15 bg-white rounded-full border border-[#EFEFF3] flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
          <div className="w-6 h-6 flex items-center justify-center">
            <svg width="17" height="19" viewBox="0 0 17 19" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 9C0 9 0 18 8.5 18C17 18 17 9 17 9" stroke="#6F727C" strokeWidth="2.5"/>
              <path d="M8.5 0.5V18.5" stroke="#6F727C" strokeWidth="2.5"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;