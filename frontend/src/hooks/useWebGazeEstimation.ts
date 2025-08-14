import { useRef, useCallback } from 'react';

interface GazeEstimationResult {
  x: number;
  y: number;
  confidence: number;
}

interface CalibrationData {
  calibration_points: Array<{x: number, y: number}>;
  calibration_vectors: Array<{x: number, y: number, z: number}>;
  transform_method: string;
}

export const useWebGazeEstimation = () => {
  const calibrationDataRef = useRef<CalibrationData | null>(null);

  // 캘리브레이션 데이터 로드
  const loadCalibrationData = useCallback(() => {
    const storedData = localStorage.getItem('gazeCalibrationData');
    if (storedData) {
      calibrationDataRef.current = JSON.parse(storedData);
      return true;
    }
    return false;
  }, []);

  // 간단한 시선 추정 (실제로는 AI 모델 필요)
  const estimateGaze = useCallback(async (
    videoElement: HTMLVideoElement
  ): Promise<GazeEstimationResult | null> => {
    if (!calibrationDataRef.current) {
      console.warn('캘리브레이션 데이터가 없습니다');
      return null;
    }

    try {
      // 여기서는 mock 데이터 반환
      // 실제로는 face detection + gaze estimation 모델 필요
      const mockGaze: GazeEstimationResult = {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        confidence: 0.8 + Math.random() * 0.2
      };

      return mockGaze;
    } catch (error) {
      console.error('시선 추정 오류:', error);
      return null;
    }
  }, []);

  // MediaPipe 또는 다른 얼굴 인식 라이브러리를 사용한 실제 구현
  const estimateGazeFromWebcam = useCallback(async (
    webcamRef: React.RefObject<any>
  ): Promise<GazeEstimationResult | null> => {
    if (!webcamRef.current || !calibrationDataRef.current) {
      return null;
    }

    try {
      // 웹캠에서 이미지 캡처
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return null;

      // 여기서 실제 얼굴 인식 + 시선 추정이 필요
      // 현재는 mock 데이터 반환
      const calibrationPoints = calibrationDataRef.current.calibration_points;
      const centerPoint = calibrationPoints[4]; // 중앙점 (5번째 점)
      
      // 캘리브레이션 중심점 근처로 시선 추정 (간단한 시뮬레이션)
      const estimatedGaze: GazeEstimationResult = {
        x: centerPoint.x + (Math.random() - 0.5) * 200,
        y: centerPoint.y + (Math.random() - 0.5) * 200,
        confidence: 0.7 + Math.random() * 0.3
      };

      return estimatedGaze;
    } catch (error) {
      console.error('웹캠 시선 추정 오류:', error);
      return null;
    }
  }, []);

  // 캘리브레이션 변환 적용
  const applyCalibratedTransform = useCallback((
    rawGaze: {x: number, y: number}
  ): {x: number, y: number} => {
    if (!calibrationDataRef.current) {
      return rawGaze;
    }

    // 간단한 선형 변환 (실제로는 더 복잡한 변환 필요)
    const calibrationPoints = calibrationDataRef.current.calibration_points;
    const calibrationVectors = calibrationDataRef.current.calibration_vectors;

    if (calibrationPoints.length === 0) {
      return rawGaze;
    }

    // 가장 가까운 캘리브레이션 포인트 찾기
    let minDistance = Infinity;
    let closestIndex = 0;

    calibrationVectors.forEach((vector, index) => {
      const distance = Math.sqrt(
        Math.pow(vector.x - rawGaze.x / 400, 2) + 
        Math.pow(vector.y - rawGaze.y / 400, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // 보정된 좌표 반환
    const correctedPoint = calibrationPoints[closestIndex];
    return {
      x: correctedPoint.x + (rawGaze.x - correctedPoint.x) * 0.8, // 80% 보정
      y: correctedPoint.y + (rawGaze.y - correctedPoint.y) * 0.8
    };
  }, []);

  // 히트맵 데이터 생성
  const createHeatmapData = useCallback((
    gazePoints: Array<{x: number, y: number, timestamp: number}>
  ) => {
    const gridWidth = 160;
    const gridHeight = 90;
    const heatmap = Array(gridHeight).fill(0).map(() => Array(gridWidth).fill(0));

    gazePoints.forEach(point => {
      const gridX = Math.floor((point.x / window.innerWidth) * gridWidth);
      const gridY = Math.floor((point.y / window.innerHeight) * gridHeight);
      
      if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
        heatmap[gridY][gridX]++;
      }
    });

    return heatmap;
  }, []);

  // 중앙 응시 비율 계산
  const calculateCenterGazeRatio = useCallback((
    gazePoints: Array<{x: number, y: number}>
  ): number => {
    if (gazePoints.length === 0) return 0;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const centerRadius = Math.min(window.innerWidth, window.innerHeight) * 0.25;

    const centerGazeCount = gazePoints.filter(point => {
      const distance = Math.sqrt(
        Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2)
      );
      return distance <= centerRadius;
    }).length;

    return (centerGazeCount / gazePoints.length) * 100;
  }, []);

  return {
    loadCalibrationData,
    estimateGaze,
    estimateGazeFromWebcam,
    applyCalibratedTransform,
    createHeatmapData,
    calculateCenterGazeRatio
  };
};

export default useWebGazeEstimation;