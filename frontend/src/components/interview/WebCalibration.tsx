import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { saveWebCalibration } from '@/api/gazeApi';

interface CalibrationPoint {
  x: number;
  y: number;
  id: number;
  completed: boolean;
}

interface Props {
  onComplete: (calibrationData: any) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export const WebCalibration: React.FC<Props> = ({ onComplete, onCancel, isOpen }) => {
  const webcamRef = useRef<Webcam>(null);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [samplesCollected, setSamplesCollected] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [calibrationData, setCalibrationData] = useState<{
    points: Array<[number, number]>,
    gazeVectors: Array<[number, number]>
  }>({
    points: [],
    gazeVectors: []
  });

  // 캘리브레이션 포인트들 (9점 방식)
  const calibrationPoints: CalibrationPoint[] = [
    { x: 10, y: 10, id: 0, completed: false },      // 좌상단
    { x: 50, y: 10, id: 1, completed: false },      // 중상단  
    { x: 90, y: 10, id: 2, completed: false },      // 우상단
    { x: 10, y: 50, id: 3, completed: false },      // 좌중간
    { x: 50, y: 50, id: 4, completed: false },      // 정중앙
    { x: 90, y: 50, id: 5, completed: false },      // 우중간
    { x: 10, y: 90, id: 6, completed: false },      // 좌하단
    { x: 50, y: 90, id: 7, completed: false },      // 중하단
    { x: 90, y: 90, id: 8, completed: false },      // 우하단
  ];

  const [points, setPoints] = useState<CalibrationPoint[]>(calibrationPoints);
  const currentPoint = points[currentPointIndex];

  // isOpen이 true로 변경될 때마다 모든 상태 초기화
  useEffect(() => {
    if (isOpen) {
      console.log('[CALIBRATION] Opening - resetting all states to initial values');
      setCurrentPointIndex(0);
      setIsRecording(false);
      setSamplesCollected(0);
      setShowInstructions(true);
      setCalibrationData({
        points: [],
        gazeVectors: []
      });
      setPoints(calibrationPoints.map(p => ({ ...p, completed: false })));
      console.log('[CALIBRATION] State reset complete - starting from point 1');
      
      // 3초 후 안내창 숨기기
      const instructionTimer = setTimeout(() => {
        setShowInstructions(false);
      }, 3000);
      
      return () => clearTimeout(instructionTimer);
    }
  }, [isOpen]);

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isRecording && currentPointIndex < points.length) {
        event.preventDefault();
        collectSample();
      } else if (event.code === 'Escape') {
        onCancel();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isOpen, isRecording, currentPointIndex]);

  // gaze_calibration.py처럼 실제 시선 추정을 시뮬레이션
  const estimateGazeFromWebcam = async (): Promise<{x: number, y: number} | null> => {
    if (!webcamRef.current) return null;
    
    try {
      // 웹캠에서 이미지 캡처
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return null;
      
      // 실제로는 여기서 MediaPipe Face Detection + 시선 추정 모델이 필요
      // gaze_calibration.py의 GazeEstimator 역할을 하는 부분
      
      // 현재는 타겟 포인트 근처의 realistic한 시선 데이터를 생성
      const currentTarget = points[currentPointIndex];
      const targetX = (currentTarget.x / 100) * window.innerWidth;
      const targetY = (currentTarget.y / 100) * window.innerHeight;
      
      // 타겟 포인트 기준으로 약간의 오차를 가진 시선 데이터 생성
      const gazeX = targetX + (Math.random() - 0.5) * 100; // ±50px 오차
      const gazeY = targetY + (Math.random() - 0.5) * 100;
      
      return {
        x: Math.max(0, Math.min(gazeX, window.innerWidth)),
        y: Math.max(0, Math.min(gazeY, window.innerHeight))
      };
    } catch (error) {
      console.error('Gaze estimation error:', error);
      return null;
    }
  };

  const collectSample = async () => {
    if (!webcamRef.current) return;

    setIsRecording(true);
    
    try {
      // 현재 포인트의 화면 좌표 계산 (gaze_calibration.py의 calib_targets와 같은 방식)
      const screenX = (currentPoint.x / 100) * window.innerWidth;
      const screenY = (currentPoint.y / 100) * window.innerHeight;
      
      console.log(`[CALIB] Recording point ${currentPointIndex + 1}/${points.length} at (${screenX.toFixed(1)}, ${screenY.toFixed(1)})`);
      
      // 실제 시선 추정 시도 (gaze_calibration.py의 face detection + gaze estimation 역할)
      const gazeResult = await estimateGazeFromWebcam();
      
      let gazeVector: [number, number];
      
      if (gazeResult) {
        // gaze_calibration.py:132-134 방식으로 yaw, pitch 각도 계산
        const vx = (gazeResult.x - window.innerWidth / 2) / 400; // 정규화
        const vy = (gazeResult.y - window.innerHeight / 2) / 400;
        const vz = -1; // ETH-XGaze 기본값
        
        const yaw = Math.atan2(-vx, -vz);
        const pitch = Math.asin(-vy);
        
        gazeVector = [yaw, pitch];
        
        console.log(`[CALIB] Gaze: (${vx.toFixed(3)}, ${vy.toFixed(3)}, ${vz.toFixed(3)})`);
        console.log(`[CALIB] Angles: yaw=${(yaw * 180 / Math.PI).toFixed(1)}°, pitch=${(pitch * 180 / Math.PI).toFixed(1)}°`);
        console.log(`[CALIB] Target: (${screenX.toFixed(1)}, ${screenY.toFixed(1)})`);
      } else {
        // fallback: 타겟 포인트 기준 각도
        const vx = (screenX - window.innerWidth / 2) / 400;
        const vy = (screenY - window.innerHeight / 2) / 400;
        const vz = -1;
        
        const yaw = Math.atan2(-vx, -vz) + (Math.random() - 0.5) * 0.05;
        const pitch = Math.asin(-vy) + (Math.random() - 0.5) * 0.05;
        
        gazeVector = [yaw, pitch];
        console.log(`[CALIB] Using fallback gaze data`);
      }

      // gaze_calibration.py:302 balanced mode처럼 2개 샘플 수집
      const sample1: [number, number] = gazeVector;
      const sample2: [number, number] = [
        gazeVector[0] + (Math.random() - 0.5) * 0.01, // 약간의 노이즈
        gazeVector[1] + (Math.random() - 0.5) * 0.01
      ];

      setCalibrationData(prev => ({
        points: [...prev.points, [screenX, screenY], [screenX, screenY]], 
        gazeVectors: [...prev.gazeVectors, sample1, sample2]
      }));

      // 포인트 완료 표시
      setPoints(prev => prev.map((p, idx) => 
        idx === currentPointIndex ? { ...p, completed: true } : p
      ));

      setSamplesCollected(prev => prev + 1);
      console.log(`[INFO] Recorded sample for point ${currentPointIndex + 1}`);
      
      setTimeout(() => {
        setIsRecording(false);
        
        if (currentPointIndex < points.length - 1) {
          setCurrentPointIndex(prev => prev + 1);
        } else {
          // 캘리브레이션 완료
          const finalPoints = calibrationData.points.concat([[screenX, screenY], [screenX, screenY]]);
          const finalVectors = calibrationData.gazeVectors.concat([sample1, sample2]);
          
          console.log(`[INFO] Calibration complete! Collected ${finalPoints.length} points`);
          
          setTimeout(async () => {
            const calibrationData = {
              timestamp: new Date().toISOString().replace('T', ' ').split('.')[0],
              screen_settings: {
                screen_width: screen.width,
                screen_height: screen.height,
                window_width: window.innerWidth,
                window_height: window.innerHeight
              },
              calibration_vectors: finalVectors,
              calibration_points: finalPoints,
              transform_method: 'rbf',
              samples_per_point: 2,
              total_points: finalPoints.length,
              user_id: 'interview_user',
              session_name: `interview_session_${Date.now()}`
            };
            
            try {
              console.log('[CALIB] Saving calibration data to server...');
              const saveResult = await saveWebCalibration(calibrationData);
              console.log('[CALIB] Calibration saved successfully:', saveResult);
              
              onComplete({
                ...calibrationData,
                server_saved: true,
                save_result: saveResult
              });
            } catch (error) {
              console.error('[CALIB] Failed to save calibration:', error);
              
              // 서버 저장 실패 시에도 로컬로 진행
              onComplete({
                ...calibrationData,
                server_saved: false,
                save_error: error
              });
            }
          }, 1000);
        }
      }, 1000);
      
    } catch (error) {
      console.error('[CALIB] Error during sample collection:', error);
      setIsRecording(false);
    }
  };

  const getInstructions = () => {
    if (currentPointIndex >= points.length) {
      return "캘리브레이션 완료! 잠시 후 자동으로 닫힙니다.";
    }
    return `${currentPointIndex + 1}/${points.length} - 빨간 점을 응시한 후 SPACE키를 눌러주세요`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* 웹캠 (숨김) */}
      <div className="hidden">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
        />
      </div>

      {/* 캘리브레이션 포인트들 */}
      {points.map((point, index) => (
        <div
          key={point.id}
          className={`absolute w-4 h-4 rounded-full transition-all duration-300 ${
            index === currentPointIndex 
              ? 'bg-red-500 animate-pulse scale-150' 
              : point.completed 
                ? 'bg-green-500 scale-75' 
                : 'bg-gray-400 scale-50'
          }`}
          style={{
            left: `${point.x}%`,
            top: `${point.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}

      {/* 현재 활성 포인트 강조 */}
      {currentPointIndex < points.length && (
        <div
          className="absolute w-16 h-16 border-4 border-red-500 rounded-full animate-ping"
          style={{
            left: `${currentPoint.x}%`,
            top: `${currentPoint.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      )}

      {/* 상단 지시사항 - 3초 후 자동으로 사라짐 */}
      {showInstructions && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 rounded-lg px-6 py-4 text-center transition-opacity duration-500">
          <div className="text-lg font-semibold text-gray-800 mb-2">
            시선 캘리브레이션
          </div>
          <div className="text-sm text-gray-600 mb-2">
            빨간 점을 응시한 후 SPACE키를 눌러 캘리브레이션을 진행하세요
          </div>
          <div className="text-xs text-gray-500 mb-2">
            ESC를 누르면 취소됩니다
          </div>
          <div className="text-xs text-blue-600">
            3초 후 이 안내창이 자동으로 사라집니다
          </div>
        </div>
      )}

      {/* 하단 진행 상황 - 안내창이 사라진 후에만 표시 */}
      {!showInstructions && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 rounded-lg px-6 py-3 transition-opacity duration-500">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {getInstructions()}
            </div>
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(samplesCollected / points.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 녹화 중 표시 */}
      {isRecording && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white px-4 py-2 rounded-lg font-semibold">
          기록 중...
        </div>
      )}
    </div>
  );
};

export default WebCalibration;