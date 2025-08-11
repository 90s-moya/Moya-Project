import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/common/Header';
import VerbalAnalysis from '@/components/mypage/result/detail/VerbalAnalysis';
import FacialAnalysis from '@/components/mypage/result/detail/FacialAnalysis';
import PostureAnalysis from '@/components/mypage/result/detail/PostureAnalysis';
import EyeAnalysis from '@/components/mypage/result/detail/EyeAnalysis';

const ResultDetail: React.FC = () => {
  const { reportId, resultId } = useParams<{ reportId: string; resultId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'verbal' | 'facial' | 'posture' | 'eye'>('verbal');

  // state로 전달된 question
  const { question } = (location.state as { question?: string }) || {};

  // 탭 목록
  const tabs = [
    { id: 'verbal', label: '답변 분석' },
    { id: 'facial', label: '표정 분석' },
    { id: 'posture', label: '자세 분석' },
    { id: 'eye', label: '시선 분석' }
  ] as const;

  // 현재 활성 탭에 따른 컴포넌트 렌더링
  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'verbal':
        return <VerbalAnalysis verbal_result={mockDetailData.verbal_result} />;
      case 'facial':
        return <FacialAnalysis />;
      case 'posture':
        return <PostureAnalysis />;
      case 'eye':
        return <EyeAnalysis />;
      default:
        return <VerbalAnalysis verbal_result={mockDetailData.verbal_result} />;
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen max-w-6xl mx-auto bg-white flex flex-col pt-20">
        {/* 상단 바: 이전으로 버튼 */}
        <div className="flex items-center pt-8 px-4 pb-10">
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

        {/* 본문: 좌측 질문+비디오, 우측 분석 결과 */}
        <div className="flex flex-col lg:flex-row flex-1 gap-8 max-w-6xl mx-auto w-full h-full px-6">
          {/* 좌측: 질문 + 비디오 */}
          <div className="lg:flex-1 flex flex-col gap-6">
            {/* 질문 */}
            <div>
              <h2 className="md:text-2xl text-lg font-bold text-[#1b1c1f]">
                Q. {question || '질문 정보가 없습니다.'}
              </h2>
            </div>

            {/* 비디오 */}
            <div className="flex flex-col items-center justify-start">
              <div className="w-full max-w-lg aspect-[16/9] rounded-lg flex items-center justify-center overflow-hidden">
                <video
                  src={mockDetailData.video_url}
                  controls
                  className="w-full h-full object-contain rounded-lg"
                >
                  브라우저가 video 태그를 지원하지 않습니다.
                </video>
              </div>
            </div>
          </div>

          {/* 우측: 분석 결과 */}
          <div className="lg:flex-1 relative h-full">
            {/* 탭 네비게이션 */}
            <div className="flex border-b border-[#dedee4] mb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-[#2B7FFF] border-b-2 border-[#2B7FFF]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 탭 컨텐츠 */}
            <div className="h-full overflow-y-auto flex flex-col gap-4 pr-4 mb-20">
              {renderActiveComponent()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResultDetail;

// Mock 데이터
const mockDetailData = {
  "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "verbal_result": {
    "answer": "저는 문제 해결 과정에서 끈기를 가지고 끝까지 해내는 성향이 강합니다.",
    "stopwords": "NORMAL",
    "reason_context": "질문이 '본인의 강점'이었고, 답변이 주제에 부합하며 불필요한 내용이 없음.",
    "gpt_comment": "핵심 메시지가 분명하지만, 구체적인 사례를 덧붙이면 더 설득력 있는 답변이 될 수 있음.",
    "end_type": "OUTSTANDING",
    "is_fast": "SLIGHTLY_FAST",
    "syll_art": 4.96
  }
};
