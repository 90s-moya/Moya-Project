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
      'sad': 2,
      'fear': 1
    };

    const data: { frame: number; emotion: number }[] = [];
    const interval = 30; // 1초 단위 (30fps)

    for (let frame = firstStart; frame <= lastEnd; frame += interval) {
      const currentEmotion = face_result.detailed_logs.find(
        log => frame >= log.start_frame && frame <= log.end_frame
      );

      data.push({
        frame,
        emotion: currentEmotion ? emotionYValues[currentEmotion.label as keyof typeof emotionYValues] : 0
      });
    }

    return data;
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
                    interval={2}
                  />
                  <YAxis
                    domain={[0.5, 2.5]}
                    ticks={[1, 2]}
                    tickFormatter={(value) => {
                      switch (value) {
                        case 1: return getFaceStatusText('fear');
                        case 2: return getFaceStatusText('sad');
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
                        case 1: return [getFaceStatusText('fear')];
                        case 2: return [getFaceStatusText('sad')];
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
                </PieChart>
              </ResponsiveContainer>
            </div>
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
            const fearData = pieChartData.find(entry => entry.name === getFaceStatusText('fear'));
            const fearPercentage =
              fearData
                ? (fearData.value / pieChartData.reduce((sum, entry) => sum + entry.value, 0)) * 100
                : 0;

            if (fearPercentage >= 70) {
              return (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 p-4 rounded-lg border border-red-200 shadow-sm">
                  <p className="text-sm font-medium text-red-700 mb-2">긴장감이 많이 보여요 😰</p>
                  <p className="mt-1 text-xs text-gray-600">면접 중에 두려움이 많이 드러나고 있어요. 긴장을 풀고 자신감을 가져보세요.</p>
                </div>
              );
            } else if (fearPercentage >= 30) {
              return (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200 shadow-sm">
                  <p className="text-sm font-medium text-yellow-700 mb-2">적당한 긴장감이 있어요 😊</p>
                  <p className="mt-1 text-xs text-gray-600">면접에 대한 긴장감이 적절히 나타나고 있어요. 자연스러운 모습입니다.</p>
                </div>
              );
            } else {
              return (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200 shadow-sm">
                  <p className="text-sm font-medium text-green-700 mb-2">자연스러운 표정을 잘 유지했어요! 😌</p>
                  <p className="mt-1 text-xs text-gray-600">긴장감 없이 편안하고 자연스러운 표정을 보여주고 있어요.</p>
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
