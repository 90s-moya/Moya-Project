import React from 'react';
import MypageLayout from '@/layouts/MypageLayout';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getMyStudyRooms } from '@/api/feedbackApi';
import type { FeedbackRoom } from '@/types/feedback';

const Feedback: React.FC = () => {
  const [studyList, setStudyList] = React.useState<FeedbackRoom[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();

  // API로 스터디 목록 조회
  React.useEffect(() => {
    const fetchStudyList = async () => {
      try {
        setLoading(true);
        const data = await getMyStudyRooms();
        setStudyList(data);
      } catch (err) {
        console.error('스터디 목록 조회 실패:', err);
        setError('스터디 목록을 불러오는데 실패했습니다.');
        setStudyList([]); // 에러 시에도 빈 배열로 설정
      } finally {
        setLoading(false);
      }
    };

    fetchStudyList();
  }, []);

  // 참여한 시간 포맷: YYYY/MM/DD HH:mm
  const formatCardDate = (dateString: string) => {
    const parsed = dayjs(dateString);
    if (!parsed.isValid()) {
      return '';
    }
    const formatted = parsed.format('YYYY/MM/DD HH:mm');
    return formatted;
  };

  return (
    <MypageLayout activeMenu="feedback">
      {/* 페이지 제목 */}
      <h3 className="text-2xl font-semibold text-[#2B7FFF] mb-8 leading-[1.4]">
        면접 스터디 피드백
      </h3>
      {/* 참여한 스터디 리스트 */}
      {loading ? (
        <div className="w-full max-w-[880px] h-[360px] bg-[#FAFAFC] border border-[#EFEFF3] rounded-[10px] flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2B7FFF]"></div>
            <p className="text-center text-[#6F727C] font-semibold text-base leading-[1.875]">
              스터디 목록을 불러오는 중...
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="w-full max-w-[880px] h-[360px] bg-[#FAFAFC] border border-[#EFEFF3] rounded-[10px] flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <p className="text-center text-red-500 font-semibold text-base leading-[1.875] mb-3">
              {error}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-[#2B7FFF] hover:bg-[#1E6FE8] text-white px-4 py-2 rounded-[10px] text-sm font-semibold leading-[1.714] transition-colors h-10"
            >
              다시 시도
            </button>
          </div>
        </div>
      ) : studyList.length === 0 ? (
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
          {studyList.slice().map((study) => (
                         <div
               key={study.id}
               className="relative bg-[#fafafc] border border-[#dedee4] rounded-lg p-6 h-full flex flex-col justify-between min-h-[120px] text-[18px] cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 w-full"
               onClick={() => navigate(`/mypage/feedback/${study.id}`, { state: { title: study.title } })}
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
                 {study.categoryName}
               </span>
               {/* 참여한 시간 (오른쪽 하단) */}
               <span className="absolute bottom-4 right-6 text-sm text-gray-500">{formatCardDate(study.openAt)}</span>
             </div>
          ))}
        </div>
      )}
    </MypageLayout>
  );
};

export default Feedback;