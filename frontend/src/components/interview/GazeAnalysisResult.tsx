import React, { useEffect, useState } from 'react';
import { getTrackingResult } from '@/api/gazeApi';
import type { GazeAnalysisResult } from '@/types/gaze';

interface Props {
  resultFilename: string;
  className?: string;
}

export const GazeAnalysisResultComponent: React.FC<Props> = ({ 
  resultFilename, 
  className = "" 
}) => {
  const [gazeData, setGazeData] = useState<GazeAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGazeData = async () => {
      try {
        setLoading(true);
        const result = await getTrackingResult(resultFilename);
        setGazeData(result);
      } catch (error) {
        console.error('시선추적 결과 로드 실패:', error);
        setError('시선추적 결과를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (resultFilename) {
      fetchGazeData();
    }
  }, [resultFilename]);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">시선 분석 결과</h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">분석 결과를 로드하는 중...</div>
        </div>
      </div>
    );
  }

  if (error || !gazeData) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">시선 분석 결과</h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-red-500">{error || '시선 분석 데이터가 없습니다.'}</div>
        </div>
      </div>
    );
  }

  const { metadata, analysis } = gazeData;
  
  // 시선 집중도에 따른 색상 및 메시지
  const getConcentrationInfo = (percentage: number) => {
    if (percentage >= 70) {
      return { 
        color: 'text-green-600', 
        bgColor: 'bg-green-50',
        message: '우수한 시선 집중도를 보여주셨습니다!',
        level: '우수'
      };
    } else if (percentage >= 50) {
      return { 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-50',
        message: '적절한 시선 집중도를 보여주셨습니다.',
        level: '보통'
      };
    } else {
      return { 
        color: 'text-red-600', 
        bgColor: 'bg-red-50',
        message: '시선이 자주 분산되었습니다. 면접관을 더 집중해서 바라보세요.',
        level: '개선 필요'
      };
    }
  };

  const concentrationInfo = getConcentrationInfo(analysis.center_gaze_percentage);

  // 히트맵 시각화 (간단한 그리드 표현)
  const renderHeatmapPreview = () => {
    const maxValue = Math.max(...gazeData.heatmap_data.flat());
    const gridSize = Math.min(gazeData.heatmap_data.length, 10); // 최대 10x10으로 제한
    
    return (
      <div className="grid grid-cols-10 gap-1 w-40 h-24 mx-auto">
        {gazeData.heatmap_data.slice(0, gridSize).map((row, rowIndex) => 
          row.slice(0, 10).map((value, colIndex) => {
            const intensity = maxValue > 0 ? value / maxValue : 0;
            const opacity = Math.max(0.1, intensity);
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="bg-blue-500 rounded-sm"
                style={{ 
                  opacity,
                  minHeight: '0.25rem'
                }}
              />
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg border p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-6">👁️ 시선 분석 결과</h3>
      
      {/* 종합 점수 */}
      <div className={`${concentrationInfo.bgColor} rounded-lg p-4 mb-6`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-700">시선 집중도</span>
          <span className={`font-bold text-xl ${concentrationInfo.color}`}>
            {analysis.center_gaze_percentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${analysis.center_gaze_percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className={`font-medium ${concentrationInfo.color}`}>
            {concentrationInfo.level}
          </span>
          <span className="text-gray-600">
            총 {metadata.total_gaze_samples}회 측정
          </span>
        </div>
      </div>

      {/* 분석 상세 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-2">중앙 응시</h4>
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {analysis.center_gaze_percentage.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">
            화면 중앙 영역을 응시한 비율
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-2">주변 응시</h4>
          <div className="text-2xl font-bold text-orange-600 mb-1">
            {analysis.peripheral_gaze_percentage.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">
            화면 주변 영역을 응시한 비율
          </div>
        </div>
      </div>

      {/* 시선 분포 히트맵 미리보기 */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-700 mb-3">시선 분포 패턴</h4>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          {renderHeatmapPreview()}
          <div className="text-xs text-gray-600 mt-2">
            진한 부분일수록 더 많이 응시한 영역입니다
          </div>
        </div>
      </div>

      {/* 피드백 메시지 */}
      <div className={`${concentrationInfo.bgColor} rounded-lg p-4`}>
        <div className="flex items-start space-x-3">
          <div className={`${concentrationInfo.color} mt-1`}>
            {analysis.center_gaze_percentage >= 70 ? '🎉' :
             analysis.center_gaze_percentage >= 50 ? '👍' : '💡'}
          </div>
          <div>
            <div className={`font-semibold ${concentrationInfo.color} mb-1`}>
              피드백
            </div>
            <div className="text-sm text-gray-700">
              {concentrationInfo.message}
            </div>
            {analysis.center_gaze_percentage < 50 && (
              <div className="text-sm text-gray-600 mt-2">
                💡 팁: 면접관과 자연스러운 아이컨택을 유지하고, 
                긴장하지 말고 자신감 있게 대답해보세요.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 기술 정보 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div>분석 시간: {new Date(metadata.timestamp).toLocaleString()}</div>
          <div>시선 분포: {analysis.gaze_distribution}</div>
          <div>최대 집중 지점: {metadata.max_gaze_count}회 응시</div>
        </div>
      </div>
    </div>
  );
};

export default GazeAnalysisResultComponent;