import React, { useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Header from '@/components/common/Header';
import dayjs from 'dayjs';

// mock 데이터 (10분짜리 샘플 영상)
const mockDetailData = {
  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', // 약 10분짜리 샘플 영상
  feedbackList: [
    {
      fd_id: 'a1b2c3d4-e5f6-7890-ab12-cd34ef56gh78',
      feedback_type: 'positive',
      message: '질문에 대한 의도를 잘 파악하고 대답하셔서 좋았습니다.',
      created_at: '2024-05-01T14:18:12',
    },
    {
      fd_id: 'b2c3d4e5-f6a7-8901-bc23-de45fg67hi89',
      feedback_type: 'negative',
      message: '답변이 점점 장황해져서 집중이 안됩니다. 진짜 진짜 연습이 진짜로 많이 필요하실거같애여 진짜로',
      created_at: '2024-05-01T15:03:25',
    },
    {
      fd_id: 'c3d4e5f6-a7b8-9012-cd34-ef56gh78ij90',
      feedback_type: 'negative',
      message: '음성이 잘 안 들려서 내용을 이해하기 어려웠습니다.',
      created_at: '2024-05-01T15:05:40',
    },
  ],
  title: '스터디 피드백 상세', // fallback title
};

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
        <div className="flex items-center px-8 pt-8 pb-2">
          <button
            className="mr-4 py-1 rounded hover:bg-gray-100 transition-colors hover:cursor-pointer flex items-center text-gray-600"
            onClick={() => navigate(-1)}
          >
            {/* ← 아이콘 */}
            <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M13 16l-5-5 5-5" stroke="#6F727C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="ml-1">이전 페이지</span>
          </button>
        </div>
        {/* 제목 및 DESC */}
        <div className="px-8 py-4">
          <h2 className="text-2xl font-bold text-[#1b1c1f] mb-3">{title || mockDetailData.title}</h2>
          <div className="text-base text-gray-500 mb-4">스터디원들이 전달한 피드백이에요.</div>
        </div>
        {/* 본문: 좌측 비디오, 우측 피드백 리스트 */}
        <div className="flex flex-1 gap-8 px-8 pb-8 max-w-6xl mx-auto w-full">
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
          {/* 피드백 리스트 */}
          <div className="flex-1 max-h-160 overflow-y-auto flex flex-col gap-4">
            {feedbackList.map((fd) => (
              <div
                key={fd.fd_id}
                className="flex items-start gap-3 bg-[#fafafc] border border-[#dedee4] rounded-lg p-4 pt-6 min-h-[72px] cursor-pointer hover:bg-[#e6f0fa] transition-colors"
                onClick={() => handleFeedbackClick(fd.created_at)}
              >
                {/* 아이콘 */}
                <div className="mt-1 mr-2">
                  {fd.feedback_type === 'positive' ? (
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="14" fill="#E3F9E5"/><path d="M9 15l3 3 7-7" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="14" fill="#FFE3E3"/><path d="M9 19l10-10M19 19L9 9" stroke="#FF3B30" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </div>
                {/* 메시지 및 날짜 */}
                <div className="flex-1">
                  <div className="text-base text-[#1b1c1f] mb-1">{fd.message}</div>
                  <div className="text-xs text-gray-400">{dayjs(fd.created_at).format('YYYY/MM/DD HH:mm')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default FeedbackDetail;