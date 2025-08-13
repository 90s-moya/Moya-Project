import React, { useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Header from '@/components/common/Header';
import dayjs from 'dayjs';
import positiveIcon from '@/assets/images/positive.png';
import negativeIcon from '@/assets/images/negative.png';
import { getFeedbackDetail } from '@/api/feedbackApi';
import type { FeedbackDetailResponse } from '@/types/feedback';

const FeedbackDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);

  // state로 전달된 title, open_at
  const { title, open_at } = (location.state as { title?: string; open_at?: string }) || {};

  // API 데이터 상태
  const [feedbackData, setFeedbackData] = React.useState<FeedbackDetailResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // open_at이 없으면 현재 시간 기준값 사용
  const openAt = open_at || dayjs().format('YYYY-MM-DDTHH:mm:ss');

  // API로 피드백 상세 데이터 조회
  React.useEffect(() => {
    const fetchFeedbackDetail = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await getFeedbackDetail(id);
        setFeedbackData(data);
      } catch (err) {
        console.error('피드백 상세 조회 실패:', err);
        setError('피드백 상세 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbackDetail();
  }, [id]);

  // videoUrl을 환경변수와 결합
  const videoUrl = feedbackData?.videoUrl ? `${import.meta.env.VITE_FILE_URL}${feedbackData.videoUrl}` : '';

  // 피드백 카드 클릭 시 이동 함수
  const handleFeedbackClick = (createdAt: string) => {
    const open = dayjs(openAt);
    console.log(openAt, dayjs(createdAt));
    const created = dayjs(createdAt);
    let seek = created.diff(open, 'second') - 10;
    console.log(seek);
    if (seek < 0) seek = 0;
    if (videoRef.current) {
      videoRef.current.currentTime = seek;
      videoRef.current.play();
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen max-w-6xl mx-auto bg-white flex flex-col pt-20">
        {/* 상단 바: 이전으로 버튼 */}
        <div className="flex items-center pt-8 px-4 pb-2">
          <button
            className="mr-4 py-1 rounded hover:bg-gray-100 transition-colors flex items-center text-gray-600"
            onClick={() => navigate(-1)}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
              <path
                d="M13 16l-5-5 5-5"
                stroke="#6F727C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="ml-1">이전 페이지</span>
          </button>
        </div>
        {/* 제목 및 DESC */}
        <div className="px-6 py-4">
          <h2 className="text-2xl font-bold text-[#1b1c1f] mb-3">{title || '피드백 상세'}</h2>
          <div className="text-base text-gray-500 mb-4">스터디원들이 전달한 피드백이에요.</div>
        </div>
        {/* 본문: 좌측 비디오, 우측 피드백 리스트 */}
        {loading ? (
          <div className="flex flex-col md:flex-row flex-1 md:px-0 px-4 gap-8 max-w-6xl mx-auto w-full h-full">
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2B7FFF]"></div>
                <p className="text-center text-[#6F727C] font-semibold text-base">
                  피드백 정보를 불러오는 중...
                </p>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col md:flex-row flex-1 md:px-0 px-4 gap-8 max-w-6xl mx-auto w-full h-full">
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <p className="text-center text-red-500 font-semibold text-base mb-3">
                  {error}
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-[#2B7FFF] hover:bg-[#1E6FE8] text-white px-4 py-2 rounded-[10px] text-sm font-semibold transition-colors"
                >
                  다시 시도
                </button>
              </div>
            </div>
          </div>
        ) : !feedbackData ? (
          <div className="flex flex-col md:flex-row flex-1 md:px-0 px-4 gap-8 max-w-6xl mx-auto w-full h-full">
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <p className="text-center text-gray-500 font-semibold text-base">
                  피드백 데이터가 없습니다.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row flex-1 md:px-0 px-4 gap-8 max-w-6xl mx-auto w-full h-full">
            {/* 비디오 */}
            <div className="flex-1 flex flex-col items-center justify-start">
              <div className="w-full max-w-lg aspect-[4/3] bg-black rounded-lg border border-[#dedee4] flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="w-full h-full object-contain bg-black rounded-lg"
                >
                  브라우저가 video 태그를 지원하지 않습니다.
                </video>
              </div>
            </div>
            {/* 피드백 리스트 - 타임라인 컨테이너 */}
            <div className="md:flex-1 relative h-full">
              {/* 타임라인 배경선 - 스크롤 영역 밖에 고정 */}
              <div className="absolute left-[31px] top-6 bottom-0 w-0.5 bg-gray-100 z-0"></div>
              
              <div
                className="h-full max-h-[calc(100vh-300px)] overflow-y-auto flex flex-col gap-4 pr-4"
              >
                {feedbackData.feedbackList.map((fd, index) => {
                  // 시간 계산: (createdAt - open_at - 10초)
                  const open = dayjs(openAt);
                  const created = dayjs(fd.createdAt);
                  let timeInSeconds = created.diff(open, 'second') - 10;
                  if (timeInSeconds < 0) timeInSeconds = 0;
                  
                  // MM:SS 형식으로 변환
                  const minutes = Math.floor(timeInSeconds / 60);
                  const seconds = timeInSeconds % 60;
                  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                  
                  return (
                    <div
                      key={fd.fdId}
                      className="flex items-start gap-4 relative z-10"
                    >
                      {/* 타임라인 점과 시간 (좌측) */}
                      <div className="flex flex-col items-center w-16 flex-shrink-0">
                        <div className="w-2 h-2 mb-0.5 bg-[#2B7FFF] rounded-full mt-5">
                        </div>
                        <div className="text-sm text-[#2B7FFF] font-medium text-center bg-white">
                          {timeString}
                        </div>
                      </div>
                      
                      {/* 피드백 박스 (우측) */}
                      <div 
                        className="flex-1 flex items-start gap-3 bg-[#fafafc] border border-[#dedee4] rounded-lg p-4 cursor-pointer hover:bg-gray-300/30 transition-colors pr-6 py-5"
                        onClick={() => handleFeedbackClick(fd.createdAt)}
                      >
                        {/* 아이콘 */}
                        <div className="flex items-center mr-2">
                          {fd.feedbackType === 'POSITIVE' ? (
                            <img src={positiveIcon} alt="긍정 피드백" width="28" height="28" />
                          ) : (
                            <img src={negativeIcon} alt="부정 피드백" width="28" height="28" />
                          )}
                        </div>
                        {/* 메시지 */}
                        <div className="flex-1">
                          <div className="text-sm md:text-base text-[#1b1c1f] mb-1 leading-relaxed">{fd.message}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FeedbackDetail;