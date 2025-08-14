import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';

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
  const [calibrationData, setCalibrationData] = useState<{
    points: Array<{x: number, y: number}>,
    gazeVectors: Array<any>
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

  const collectSample = async () => {
    if (!webcamRef.current) return;

    setIsRecording(true);
    
    // 웹캠에서 이미지 캡처 (실제로는 gaze estimation 필요)
    const imageSrc = webcamRef.current.getScreenshot();
    
    // 현재 포인트의 화면 좌표 계산
    const screenX = (currentPoint.x / 100) * window.innerWidth;
    const screenY = (currentPoint.y / 100) * window.innerHeight;
    
    // 임시 gaze vector (실제로는 AI 모델로 계산해야 함)
    const mockGazeVector = {
      x: (screenX - window.innerWidth / 2) / 400,
      y: (screenY - window.innerHeight / 2) / 400,
      z: -1
    };

    // 데이터 수집
    setCalibrationData(prev => ({
      points: [...prev.points, { x: screenX, y: screenY }],
      gazeVectors: [...prev.gazeVectors, mockGazeVector]
    }));

    // 포인트 완료 표시
    setPoints(prev => prev.map((p, idx) => 
      idx === currentPointIndex ? { ...p, completed: true } : p
    ));

    setSamplesCollected(prev => prev + 1);
    
    setTimeout(() => {
      setIsRecording(false);
      
      if (currentPointIndex < points.length - 1) {
        setCurrentPointIndex(prev => prev + 1);
      } else {
        // 캘리브레이션 완료
        setTimeout(() => {
          onComplete({
            calibration_points: calibrationData.points.concat([{ x: screenX, y: screenY }]),
            calibration_vectors: calibrationData.gazeVectors.concat([mockGazeVector]),
            transform_method: 'polynomial',
            timestamp: new Date().toISOString()
          });
        }, 1000);
      }
    }, 1000);
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

      {/* 상단 지시사항 */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 rounded-lg px-6 py-4 text-center">
        <div className="text-lg font-semibold text-gray-800 mb-2">
          시선 캘리브레이션
        </div>
        <div className="text-sm text-gray-600 mb-2">
          {getInstructions()}
        </div>
        <div className="text-xs text-gray-500">
          ESC를 누르면 취소됩니다
        </div>
      </div>

      {/* 하단 진행 상황 */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 rounded-lg px-6 py-3">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            수집된 샘플: {samplesCollected}/{points.length}
          </div>
          <div className="w-32 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(samplesCollected / points.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

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