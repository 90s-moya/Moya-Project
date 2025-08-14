import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGazeAnalysis } from '@/hooks/useGazeAnalysis';
import { useNavigate } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  videoBlob: Blob | null;
  sessionId: string;
  onClose: () => void;
}

export const InterviewCompleteModal: React.FC<Props> = ({
  isOpen,
  videoBlob,
  sessionId,
  onClose
}) => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<'analysis' | 'complete' | 'error'>('analysis');
  const [resultData, setResultData] = useState<{
    gazeResultFilename?: string;
    interviewId?: string;
  }>({});

  const {
    isAnalyzing,
    analysisProgress,
    error,
    resultFilename,
    analyzeInterviewVideo,
    clearError
  } = useGazeAnalysis();

  useEffect(() => {
    if (isOpen && videoBlob) {
      performAnalysis();
    }
  }, [isOpen, videoBlob]);

  useEffect(() => {
    if (error) {
      setStage('error');
    } else if (resultFilename) {
      setStage('complete');
      setResultData(prev => ({ ...prev, gazeResultFilename: resultFilename }));
      // 로컬스토리지에 결과 저장
      localStorage.setItem('lastGazeResult', resultFilename);
    }
  }, [error, resultFilename]);

  const performAnalysis = async () => {
    if (!videoBlob) return;
    
    setStage('analysis');
    try {
      const result = await analyzeInterviewVideo(videoBlob, sessionId);
      if (result) {
        console.log('시선추적 분석 완료:', result);
        // 여기서 추가적으로 서버에 면접 결과 저장 로직 추가 가능
      }
    } catch (error) {
      console.error('분석 중 오류:', error);
    }
  };

  const handleRetry = () => {
    clearError();
    performAnalysis();
  };

  const handleGoToFeedback = () => {
    // 피드백 상세 페이지로 이동 (시선 분석 결과 포함)
    navigate(`/mypage/feedback/detail/${sessionId}`, {
      state: {
        title: `면접 결과 - ${new Date().toLocaleDateString()}`,
        open_at: new Date().toISOString(),
        gazeResultFilename: resultData.gazeResultFilename
      }
    });
    onClose();
  };

  const handleGoToMyPage = () => {
    navigate('/mypage/result');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
        <div className="text-center">
          {stage === 'analysis' && (
            <>
              <div className="mb-6">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  면접 분석 중...
                </h3>
                <p className="text-gray-600 mb-4">
                  {analysisProgress || '면접 영상을 분석하고 있습니다.'}
                </p>
                <div className="text-sm text-gray-500">
                  시선 추적 분석에는 몇 분이 걸릴 수 있습니다.
                </div>
              </div>
            </>
          )}

          {stage === 'complete' && (
            <>
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-green-600 text-2xl">✓</div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  면접 분석 완료!
                </h3>
                <p className="text-gray-600">
                  면접 영상과 시선 패턴 분석이 완료되었습니다.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleGoToFeedback}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  분석 결과 보기
                </Button>
                <Button
                  onClick={handleGoToMyPage}
                  className="bg-gray-500 hover:bg-gray-600 text-white"
                >
                  마이페이지로
                </Button>
              </div>
            </>
          )}

          {stage === 'error' && (
            <>
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-red-600 text-2xl">⚠</div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  분석 중 오류 발생
                </h3>
                <p className="text-gray-600 mb-4">
                  {error || '알 수 없는 오류가 발생했습니다.'}
                </p>
                <div className="text-sm text-gray-500 mb-4">
                  시선 추적 서버가 실행 중인지 확인하거나, 캘리브레이션을 다시 진행해주세요.
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleRetry}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  다시 시도
                </Button>
                <Button
                  onClick={handleGoToMyPage}
                  className="bg-gray-500 hover:bg-gray-600 text-white"
                >
                  마이페이지로
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewCompleteModal;