import { useState, useCallback } from 'react';
import { initTracking, analyzeVideo, getTrackingResults } from '@/api/gazeApi';

interface UseGazeAnalysisReturn {
  isAnalyzing: boolean;
  analysisProgress: string;
  error: string | null;
  resultFilename: string | null;
  analyzeInterviewVideo: (videoBlob: Blob, sessionId: string) => Promise<string | null>;
  clearError: () => void;
}

export const useGazeAnalysis = (): UseGazeAnalysisReturn => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resultFilename, setResultFilename] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const analyzeInterviewVideo = useCallback(async (
    videoBlob: Blob, 
    sessionId: string
  ): Promise<string | null> => {
    setIsAnalyzing(true);
    setError(null);
    setResultFilename(null);

    try {
      // 1. 캘리브레이션 데이터 확인 (선택적)
      const calibrationDataStr = localStorage.getItem('gaze_calibration_data');
      let calibrationData = null;
      
      if (calibrationDataStr) {
        try {
          calibrationData = JSON.parse(calibrationDataStr);
          console.log('[GAZE] Using calibration data:', calibrationData.timestamp || 'no timestamp');
        } catch (error) {
          console.warn('[GAZE] 캘리브레이션 데이터 파싱 실패, 기본값 사용:', error);
          calibrationData = null;
        }
      } else {
        console.log('[GAZE] 캘리브레이션 데이터 없음, 시선추적 없이 진행');
        calibrationData = null;
      }

      if (calibrationData) {
        setAnalysisProgress('시선추적 시스템 초기화 중...');

        // 2. 시선추적 초기화 (캘리브레이션 데이터가 있는 경우만)
        await initTracking({
          screen_width: window.screen.width,
          screen_height: window.screen.height,
          window_width: window.innerWidth,
          window_height: window.innerHeight,
          calibration_data: calibrationData,
          session_id: sessionId
        });
      } else {
        console.log('[GAZE] 캘리브레이션 데이터 없이 분석 건너뜀');
      }

      setAnalysisProgress('동영상 파일 준비 중...');

      // 3. Blob을 File로 변환
      const videoFile = new File([videoBlob], `interview_${sessionId}.webm`, {
        type: 'video/webm'
      });

      if (calibrationData) {
        setAnalysisProgress('시선추적 분석 중... (시간이 걸릴 수 있습니다)');

        // 4. 동영상 시선추적 분석 (캘리브레이션 데이터와 함께)
        const analysisResult = await analyzeVideo(videoFile, calibrationData);
      
        if (analysisResult.status !== 'success') {
          throw new Error(analysisResult.message || '분석에 실패했습니다.');
        }

        setAnalysisProgress('분석 결과 확인 중...');

        // 5. 분석 완료 대기 및 결과 파일 확인
        const maxAttempts = 30; // 최대 30번 시도 (약 1분)
        let attempts = 0;
        let resultFound = false;
        
        while (!resultFound && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
          
          try {
            const resultsResponse = await getTrackingResults();
            if (resultsResponse.status === 'success' && resultsResponse.results.length > 0) {
              // 가장 최신 결과 찾기 (히트맵 파일)
              const heatmapResult = resultsResponse.results
                .filter((file: any) => file.filename.includes('heatmap'))
                .sort((a: any, b: any) => new Date(b.modified).getTime() - new Date(a.modified).getTime())[0];
              
              if (heatmapResult) {
                setResultFilename(heatmapResult.filename);
                resultFound = true;
              }
            }
          } catch (checkError) {
            console.warn('결과 확인 중 오류:', checkError);
          }
          
          attempts++;
          setAnalysisProgress(`분석 완료 확인 중... (${attempts}/${maxAttempts})`);
        }

        if (!resultFound) {
          throw new Error('분석은 완료되었으나 결과 파일을 찾을 수 없습니다.');
        }

        setAnalysisProgress('분석 완료!');
        return resultFilename;
      } else {
        // 캘리브레이션 데이터가 없는 경우 시선추적 분석 건너뜀
        setAnalysisProgress('시선추적 없이 완료');
        console.log('[GAZE] 시선추적 분석 건너뜀 (캘리브레이션 데이터 없음)');
        return null;
      }

    } catch (error) {
      console.error('시선추적 분석 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [resultFilename]);

  return {
    isAnalyzing,
    analysisProgress,
    error,
    resultFilename,
    analyzeInterviewVideo,
    clearError
  };
};

export default useGazeAnalysis;