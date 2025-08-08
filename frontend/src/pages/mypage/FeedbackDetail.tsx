import React, { useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Header from '@/components/common/Header';
import dayjs from 'dayjs';
import positiveIcon from '@/assets/images/positive.png';
import negativeIcon from '@/assets/images/negative.png';


const FeedbackDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);

  // state로 전달된 title, open_at
  const { title, open_at } = (location.state as { title?: string; open_at?: string }) || {};

  // 실제로는 id로 데이터 fetch 필요, 여기선 mock만 사용
  const { videoUrl, feedbackList } = mockDetailData;

  // open_at이 없으면 mock 기준값 사용
  const openAt = open_at || '2024-05-01T15:00:00';

  // 피드백 카드 클릭 시 이동 함수
  const handleFeedbackClick = (createdAt: string) => {
    const open = dayjs(openAt);
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
        <div className="flex flex-col md:flex-row flex-1 md:px-0 px-4 gap-8 max-w-6xl mx-auto w-full h-full">
          {/* 비디오 */}
          <div className="flex-1 flex flex-col items-center justify-start">
            <div className="w-full max-w-lg aspect-[16/9] bg-black rounded-lg border border-[#dedee4] flex items-center justify-center overflow-hidden">
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
            
            {feedbackList.map((fd, index) => {
              // 시간 계산: (created_at - open_at - 10초)
              const open = dayjs(openAt);
              const created = dayjs(fd.created_at);
              let timeInSeconds = created.diff(open, 'second') - 10;
              if (timeInSeconds < 0) timeInSeconds = 0;
              
              // MM:SS 형식으로 변환
              const minutes = Math.floor(timeInSeconds / 60);
              const seconds = timeInSeconds % 60;
              const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
              
              return (
                <div
                  key={fd.fd_id}
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
                    onClick={() => handleFeedbackClick(fd.created_at)}
                  >
                    {/* 아이콘 */}
                    <div className="flex items-center mr-2">
                      {fd.feedback_type === 'positive' ? (
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
      </div>
    </>
  );
};

export default FeedbackDetail;

// mock 데이터 (10분짜리 샘플 영상)
const mockDetailData = {
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', // 약 10분짜리 샘플 영상
    feedbackList: [
      {
        fd_id: 'a1b2c3d4-e5f6-7890-ab12-cd34ef56gh78',
        feedback_type: 'positive',
        message: '질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.',
        created_at: '2024-05-01T14:08:20',
      },
      {
        fd_id: 'b2c3d4e5-f6a7-8901-bc23-de45fg67hi89',
        feedback_type: 'negative',
        message: '답변이 점점 장황해져서 집중이 안됩니다. 진짜 진짜 연습이 진짜로 많이 필요하실거같애여 진짜로 진짜로 진짜진짜진짜진짜진짜진짜진짜진짜진짜',
        created_at: '2024-05-01T14:10:25',
      },
      {
        fd_id: 'c3d4e5f6-a7b8-9012-cd34-ef56gh78ij90',
        feedback_type: 'negative',
        message: '음성이 잘 안 들려서 내용을 이해하기 어려웠습니다.',
        created_at: '2024-05-01T14:13:20',
      },
      {
          fd_id: 'c3d4e5f6-a7b8-9012-cd34-ef56gh78ij90',
          feedback_type: 'negative',
          message: '음성이 잘 안 들려서 내용을 이해하기 어려웠습니다.',
          created_at: '2024-05-01T14:13:20',
        },
        {
          fd_id: 'c3d4e5f6-a7b8-9012-cd34-ef56gh78ij90',
          feedback_type: 'negative',
          message: '음성이 잘 안 들려서 내용을 이해하기 어려웠습니다.',
          created_at: '2024-05-01T14:13:20',
        },
        {
          fd_id: 'c3d4e5f6-a7b8-9012-cd34-ef56gh78ij90',
          feedback_type: 'negative',
          message: '음성이 잘 안 들려서 내용을 이해하기 어려웠습니다.',
          created_at: '2024-05-01T14:13:20',
        },
        {
          fd_id: 'c3d4e5f6-a7b8-9012-cd34-ef56gh78ij90',
          feedback_type: 'negative',
          message: '음성이 잘 안 들려서 내용을 이해하기 어려웠습니다.',
          created_at: '2024-05-01T14:13:20',
        },
        {
          fd_id: 'c3d4e5f6-a7b8-9012-cd34-ef56gh78ij90',
          feedback_type: 'negative',
          message: '음성이 잘 안 들려서 내용을 이해하기 어려웠습니다.',
          created_at: '2024-05-01T14:13:20',
        },
        {
          fd_id: 'a1b2c3d4-e5f6-7890-ab12-cd34ef56gh78',
          feedback_type: 'positive',
          message: '질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다. 질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.질문에 대한 의도를 잘 파악하고 대답하셔서 .',
          created_at: '2024-05-01T14:14:10',
        },
    ],
    title: '스터디 피드백 상세', // fallback title
  };