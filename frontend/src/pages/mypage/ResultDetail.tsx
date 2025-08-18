import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/common/Header';
import VerbalAnalysis from '@/components/report/result-detail/VerbalAnalysis';
import FaceAnalysis from '@/components/report/result-detail/FaceAnalysis';
import PostureAnalysis from '@/components/report/result-detail/PostureAnalysis';

import { getInterviewResultDetail } from '@/api/interviewApi';
import type { TabType, ResultDetailState, InterviewReportDetailResponse } from '@/types/interviewReport';
import { formatQuestionOrder, RESULT_DETAIL_TABS } from '@/lib/constants';


const ResultDetail: React.FC = () => {
  const { reportId, resultId } = useParams<{ reportId: string; resultId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('verbal');
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // API 연동 상태
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<InterviewReportDetailResponse | null>(null);

  // state로 전달된 데이터들
  const { question, title, order, suborder } = (location.state as ResultDetailState) || {};



  // 비디오 시간 조정 핸들러
  const handleFrameChange = (frame: number) => {
    if (videoRef.current) {
      const timeInSeconds = frame / 30; // 30fps 가정
      videoRef.current.currentTime = timeInSeconds;
    }
  };

  // API 데이터 로드
  useEffect(() => {
    const fetchResultDetail = async () => {
      if (!resultId || !reportId) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await getInterviewResultDetail(reportId, resultId);
        setReportData(data);
      } catch (err) {
        console.error('결과 상세 조회 실패:', err);
        setError('결과를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchResultDetail();
  }, [resultId, reportId]);



  // 현재 활성 탭에 따른 컴포넌트 렌더링 (API 데이터 우선, fallback으로 mock 데이터 사용)
  const renderActiveComponent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">분석 결과를 불러오고 있습니다...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">{error}</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'verbal':
        return (
          <VerbalAnalysis 
            verbal_result={reportData?.verbal_result || mockDetailData.verbal_result} 
          />
        );
      case 'face':
        return (
          <FaceAnalysis 
            face_result={reportData?.face_result || mockDetailData.face_result} 
            onFrameChange={handleFrameChange} 
          />
        );
      case 'posture':
        return (
          <PostureAnalysis 
            posture_result={reportData?.posture_result || mockDetailData.posture_result} 
            onFrameChange={handleFrameChange} 
          />
        );

      default:
        return (
          <VerbalAnalysis 
            verbal_result={reportData?.verbal_result || mockDetailData.verbal_result} 
          />
        );
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
          {/* 좌측: 제목 + 비디오 + 질문 */}
          <div className="lg:flex-1 flex flex-col gap-6">
            {/* 제목 섹션 */}
            <div>
              <h2 className="md:text-2xl text-lg font-bold text-[#1b1c1f] mb-2">
                AI 면접 리포트
              </h2>
              <h3 className="md:text-base text-base text-gray-600">
                {title || '제목 정보가 없습니다.'}
              </h3>
            </div>

            {/* 비디오 */}
            <div className="flex flex-col items-center justify-start mb-4">
              <div className="w-full max-w-lg aspect-[16/9] rounded-lg flex items-center justify-center overflow-hidden">
                {reportData?.video_url ? (
                  <video
                    ref={videoRef}
                    src={`${import.meta.env.VITE_FILE_URL}${reportData.video_url}`}
                    controls
                    className="w-full h-full object-contain rounded-lg"
                  >
                    브라우저가 video 태그를 지원하지 않습니다.
                  </video>
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-gray-500 text-center">
                      <div className="text-sm mb-2">비디오가 없습니다</div>
                      <div className="text-xs">녹화된 영상이 제공되지 않았습니다</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 질문 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                {order !== undefined && (
                  <div className="px-2 py-1 text-xs md:text-sm text-[#2B7FFF] font-medium bg-blue-50 border border-blue-200 rounded-md">
                    {formatQuestionOrder(order, suborder || 0)}
                  </div>
                )}
              </div>
              <p className="text-base text-[#1b1c1f] leading-relaxed">
                Q. {question || '질문 정보가 없습니다.'}
              </p>
            </div>
          </div>

          {/* 우측: 분석 결과 */}
          <div className="lg:flex-1 relative h-full">
            {/* 탭 네비게이션 */}
            <div className="flex border-b border-[#dedee4] mb-4">
              {RESULT_DETAIL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-[#2B7FFF] border-b-2 border-[#2B7FFF]'
                      : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
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
  "video_url": "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "verbal_result": {
    "answer": "저는 문제 해결 과정에서 끈기를 가지고 끝까지 해내는 성향이 강합니다. 왜냐하면 끈기를 가지고 끝까지 해내야 좋기 때문입니다. 그렇기 때문에 앞으로도 끈기를 가지고 모든 일에 임하겠습니다.",
    "stopwords": "NORMAL",
    "is_ended": true,
    "reason_end": "답변이 자연스럽게 완결되었으며, 핵심 메시지를 전달함",
    "context_matched": true,
    "reason_context": "질문이 '본인의 강점'이었고, 답변이 주제에 부합하며 불필요한 내용이 없음.",
    "gpt_comment": "핵심 메시지가 분명하지만, 구체적인 사례를 덧붙이면 더 설득력 있는 답변이 될 수 있음.",
    "end_type": "OUTSTANDING",
    "speech_label": "SLOW",
    "syll_art": 3.2
  },
  "posture_result": {
    "timestamp": "2025-08-05T11:08:59.549094",
    "total_frames": 1177,
    "frame_distribution": {
      "Good Posture": 884,
      "Shoulders Uneven": 231,
      "Hands Above Shoulders": 100
    },
    "detailed_logs": [
      {
        "label": "Good Posture",
        "start_frame": 0,
        "end_frame": 120
      },
      {
        "label": "Shoulders Uneven",
        "start_frame": 121,
        "end_frame": 350
      },
      {
        "label": "Hands Above Shoulders",
        "start_frame": 351,
        "end_frame": 450
      },
      {
        "label": "Good Posture",
        "start_frame": 451,
        "end_frame": 700
      }
    ]
  },
  "face_result": {
    "timestamp": "2025-08-12T14:43:43.315235",
    "total_frames": 208,
    "frame_distribution": {
      "sad": 22,
      "fear": 186
    },
    "detailed_logs": [
      { "label": "sad", "start_frame": 1, "end_frame": 5 },
      { "label": "fear", "start_frame": 6, "end_frame": 8 },
      { "label": "sad", "start_frame": 9, "end_frame": 9 },
      { "label": "fear", "start_frame": 10, "end_frame": 11 },
      { "label": "sad", "start_frame": 12, "end_frame": 14 },
      { "label": "fear", "start_frame": 15, "end_frame": 20 },
      { "label": "sad", "start_frame": 21, "end_frame": 23 },
      { "label": "fear", "start_frame": 24, "end_frame": 117 },
      { "label": "sad", "start_frame": 118, "end_frame": 118 },
      { "label": "fear", "start_frame": 119, "end_frame": 124 },
      { "label": "sad", "start_frame": 125, "end_frame": 127 },
      { "label": "fear", "start_frame": 128, "end_frame": 129 },
      { "label": "sad", "start_frame": 130, "end_frame": 131 },
      { "label": "fear", "start_frame": 132, "end_frame": 136 },
      { "label": "sad", "start_frame": 137, "end_frame": 140 },
      { "label": "fear", "start_frame": 141, "end_frame": 208 }
    ]
  }
}
