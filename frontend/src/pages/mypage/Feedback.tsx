import React from 'react';
import MypageLayout from '@/layouts/MypageLayout';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const Feedback: React.FC = () => {
  const [studyList] = React.useState(mockStudyList); // 추후 API 연동 시 대체
  const navigate = useNavigate();

  // 참여한 시간 포맷: YYYY/MM/DD HH:mm
  const formatCardDate = (dateString: string) => {
    const parsed = dayjs(dateString);
    if (!parsed.isValid()) return '';
    return parsed.format('YYYY/MM/DD HH:mm');
  };

  return (
    <MypageLayout activeMenu="feedback">
      {/* 페이지 제목 */}
      <h3 className="text-2xl font-semibold text-[#2B7FFF] mb-8 leading-[1.4]">
        참여한 스터디 목록
      </h3>

      {/* 참여한 스터디 리스트 */}
      {studyList.length === 0 ? (
        <div className="w-full max-w-[880px] h-[360px] bg-[#FAFAFC] border border-[#EFEFF3] rounded-[10px] flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            {/* 아이콘 */}
            <div className="w-9 h-9 bg-white flex items-center justify-center">
              <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M3.375 6.75H23.625M3.375 13.5H23.625M3.375 20.25H23.625M8.4375 6.75V20.25M18.5625 6.75V20.25" 
                  stroke="#989AA2" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            {/* 메시지 텍스트 */}
            <p className="text-center text-[#6F727C] font-semibold text-base leading-[1.875] mb-3">
              저장된 피드백이 없어요.<br />
              면접 스터디를 진행하고 피드백을 받아보세요!
            </p>
            {/* 면접 스터디 하러가기 버튼 */}
            <button 
              onClick={() => navigate('/study')}
              className="bg-[#2B7FFF] hover:bg-[#1E6FE8] text-white px-4 py-2 rounded-[10px] text-sm font-semibold leading-[1.714] transition-colors h-10"
            >
              면접 스터디 하러가기
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 w-full">
          {studyList.map((study) => (
            <div
              key={study.room_id}
              className="relative bg-[#fafafc] border border-[#dedee4] rounded-lg p-6 h-full flex flex-col justify-between min-h-[120px] text-[18px] cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 w-full"
              onClick={() => navigate(`/mypage/feedback/${study.room_id}`, { state: { title: study.title, open_at: study.open_at } })}
            >
              <div>
                <div className="mb-2">
                  <h3 className="font-semibold text-xl leading-snug text-[#1b1c1f] group-hover:text-[#2b7fff] transition-colors duration-200">
                    {study.title}
                  </h3>
                </div>
              </div>
              {/* 카테고리 태그 (왼쪽 하단) */}
              <span className="absolute bottom-4 left-6 text-base px-3 py-1 bg-[#e3f0ff] text-[#2B7FFF] rounded-xl font-medium">
                {study.name}
              </span>
              {/* 참여한 시간 (오른쪽 하단) */}
              <span className="absolute bottom-4 right-6 text-sm text-gray-500">{formatCardDate(study.open_at)}</span>
            </div>
          ))}
        </div>
      )}
    </MypageLayout>
  );
};

export default Feedback;


const mockStudyList = [
  {
    room_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    name: 'IT',
    title: 'IT직무 면접스터디 구합니다.',
    body: '***회사 IT직무 면접스터디 하실 분 구합니다. ',
    join_user: 1,
    open_at: '2024-05-01T14:00:00',
  },
  {
    room_id: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
    name: 'IT',
    title: 'IT 직무 인성면접 스터디 구합니다.',
    body: '최종 면접 대비로 다른 직무 분들도 같이 구하고 있습니다.',
    join_user: 1,
    open_at: '2024-05-03T19:30:00',
  }
];