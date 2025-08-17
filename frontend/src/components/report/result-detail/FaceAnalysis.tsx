import React from 'react';
import { Clock, UserRoundSearch, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { getFaceStatusText, getFaceColor } from '@/lib/constants';
import type { FaceStatusType } from '@/types/interviewReport';

import type { FaceAnalysisProps } from '@/types/interviewReport';

const FaceAnalysis: React.FC<FaceAnalysisProps> = ({ face_result, onFrameChange }) => {
  // 프레임을 시간으로 변환 (30fps)
  const frameToTime = (frame: number) => {
    const seconds = frame / 30;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 점선 그래프용 데이터 생성
  const generateLineChartData = () => {
    if (!face_result?.detailed_logs || face_result.detailed_logs.length === 0) {
      return [];
    }
    
    const firstStart = face_result.detailed_logs[0]?.start_frame || 0;
    const lastEnd = face_result.detailed_logs[face_result.detailed_logs.length - 1]?.end_frame || 0;

    // 감정 상태별 y축 값 매핑
    const emotionYValues = {
      'negative': 1,
      'neutral': 2,
      'positive': 3
    };

    const data: { frame: number; emotion: number }[] = [];
    const interval = 30; // 1초 단위 (30fps)

    for (let frame = firstStart; frame <= lastEnd; frame += interval) {
      const currentEmotion = face_result.detailed_logs.find(
        log => frame >= log.start_frame && frame <= log.end_frame
      );

      data.push({
        frame,
        emotion: currentEmotion ? emotionYValues[currentEmotion.label as keyof typeof emotionYValues] || 2 : 2
      });
    }

    return data;
  };

  // X축 틱 간격을 동적으로 계산하는 함수
  const calculateXAxisInterval = () => {
    if (!face_result?.detailed_logs || face_result.detailed_logs.length === 0) {
      return 1;
    }
    
    const firstStart = face_result.detailed_logs[0]?.start_frame || 0;
    const lastEnd = face_result.detailed_logs[face_result.detailed_logs.length - 1]?.end_frame || 0;
    const totalSeconds = (lastEnd - firstStart) / 30; // 총 영상 길이 (초)
    
    // 영상 길이에 따른 적절한 간격 계산
    if (totalSeconds <= 15) {
      return 1; // 15초 이하: 1초마다 표시
    } else if (totalSeconds <= 30) {
      return 2; // 30초 이하: 2초마다 표시
    } else if (totalSeconds <= 60) {
      return 4; // 60초 이하: 4초마다 표시
    } else {
      return Math.ceil(totalSeconds / 15); // 60초 초과: 약 15개 틱이 되도록 조정
    }
  };

  // 원형 그래프용 데이터 생성
  const generatePieChartData = () => {
    if (!face_result?.frame_distribution) {
      return [];
    }
    
    return Object.entries(face_result.frame_distribution).map(([label, frames]) => ({
      name: getFaceStatusText(label as FaceStatusType),
      value: frames,
      color: getFaceColor(label)
    }));
  };

  const lineChartData = generateLineChartData();
  const pieChartData = generatePieChartData();
  const xAxisInterval = calculateXAxisInterval();

  // 데이터가 없는 경우 처리
  if (!face_result || !face_result.detailed_logs || face_result.detailed_logs.length === 0) {
    return (
      <div className="bg-[#fafafc] border border-[#dedee4] rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">얼굴 분석 데이터가 없습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fafafc] border border-[#dedee4] rounded-lg p-6">
      <div className="space-y-6">
        {/* 타임라인 그래프 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-[#2B7FFF]" />
            <h4 className="text-sm font-semibold text-[#2B7FFF]">타임라인</h4>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#dedee4] shadow-sm">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={lineChartData}
                  margin={{ top: 20, right: 5, left: 5, bottom: 5 }}
                  onClick={(data) => {
                    if (data && data.activeLabel !== undefined && onFrameChange) {
                      onFrameChange(Number(data.activeLabel));
                    }
                  }}
                >
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="8 8" />
                  <XAxis
                    dataKey="frame"
                    tickFormatter={frameToTime}
                    fontSize={10}
                    tick={{ fill: '#9CA3AF' }}
                    interval={xAxisInterval}
                  />
                  <YAxis
                    domain={[0.5, 3.5]}
                    ticks={[1, 2, 3]}
                    tickFormatter={(value) => {
                      switch (value) {
                        case 1: return getFaceStatusText('negative');
                        case 2: return getFaceStatusText('neutral');
                        case 3: return getFaceStatusText('positive');
                        default: return '';
                      }
                    }}
                    fontSize={12}
                    width={80}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <Tooltip
                    labelFormatter={frameToTime}
                    formatter={(value) => {
                      switch (value) {
                        case 1: return [getFaceStatusText('negative')];
                        case 2: return [getFaceStatusText('neutral')];
                        case 3: return [getFaceStatusText('positive')];
                        default: return ['Unknown'];
                      }
                    }}
                    contentStyle={{
                      fontSize: '11px',
                      border: '1px solid #dedee4',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="emotion"
                    stroke="#2B7FFF"
                    strokeWidth={2}
                    dot={false}
                    style={{ cursor: 'pointer' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-sm bg-[#2B7FFF]" />
              <span className="text-gray-600">감정 상태 변화</span>
            </div>
          </div>
        </div>

        {/* 원형 그래프 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-[#2B7FFF]" />
            <h4 className="text-sm font-semibold text-[#2B7FFF]">감정 상태 분포</h4>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#dedee4] shadow-sm">
            {pieChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-500">원형 그래프 데이터가 없습니다.</p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={50}
                      dataKey="value"
                      label={({ percent }) => `${((percent || 0) * 100).toFixed(1)}%`}
                      labelLine={false}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value}프레임`, name]}
                      contentStyle={{
                        fontSize: '11px',
                        border: '1px solid #dedee4',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              {pieChartData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 감정 피드백 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UserRoundSearch size={18} className="text-[#2B7FFF]" />
            <h4 className="text-sm font-semibold text-[#2B7FFF]">감정 피드백</h4>
          </div>
          {(() => {
            const totalFrames = pieChartData.reduce((sum, entry) => sum + entry.value, 0);
            
            const positiveData = pieChartData.find(entry => entry.name === getFaceStatusText('positive'));
            const negativeData = pieChartData.find(entry => entry.name === getFaceStatusText('negative'));
            const neutralData = pieChartData.find(entry => entry.name === getFaceStatusText('neutral'));
            
            const positivePercentage = positiveData ? (positiveData.value / totalFrames) * 100 : 0;
            const negativePercentage = negativeData ? (negativeData.value / totalFrames) * 100 : 0;
            const neutralPercentage = neutralData ? (neutralData.value / totalFrames) * 100 : 0;

            // 긍정적인 표정이 50% 이상
            if (positivePercentage >= 50) {
              return (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200 shadow-sm">
                  <p className="text-sm font-medium text-green-700 mb-2">긍정적인 표정이 인상적이에요! 😊</p>
                  <p className="mt-1 text-xs text-gray-600">밝고 긍정적인 표정으로 좋은 인상을 주고 있어요. 면접관에게 호감을 줄 수 있습니다.</p>
                </div>
              );
            }
            // 부정적인 표정이 30% 이상
            else if (negativePercentage >= 30) {
              return (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 p-4 rounded-lg border border-red-200 shadow-sm">
                  <p className="text-sm font-medium text-red-700 mb-2">부정적인 표정이 자주 보여요 😰</p>
                  <p className="mt-1 text-xs text-gray-600">스트레스나 긴장감이 표정에 드러나고 있어요. 심호흡을 하며 편안한 마음을 가져보세요.</p>
                </div>
              );
            }
            // 중립적인 표정이 대부분 (70% 이상)
            else if (neutralPercentage >= 70) {
              return (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 shadow-sm">
                  <p className="text-sm font-medium text-blue-700 mb-2">안정적인 표정을 유지했어요 😌</p>
                  <p className="mt-1 text-xs text-gray-600">차분하고 안정적인 표정을 보여주고 있어요. 조금 더 밝은 표정을 지어보면 더욱 좋을 것 같아요.</p>
                </div>
              );
            }
            // 균형잡힌 상태
            else {
              return (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200 shadow-sm">
                  <p className="text-sm font-medium text-yellow-700 mb-2">자연스러운 표정 변화를 보여줘요 😊</p>
                  <p className="mt-1 text-xs text-gray-600">다양한 감정이 자연스럽게 드러나고 있어요. 상황에 맞는 적절한 표현력을 보여주고 있습니다.</p>
                </div>
              );
            }
          })()}
        </div>
      </div>
    </div>
  );
};

export default FaceAnalysis;
