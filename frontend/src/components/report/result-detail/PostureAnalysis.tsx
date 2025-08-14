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
import { getPostureStatusText, getPostureColor } from '@/lib/constants';
import type { PostureStatusType } from '@/types/interviewReport';

import type { PostureResultProps } from '@/types/interviewReport';

const PostureAnalysis: React.FC<PostureResultProps> = ({ posture_result, onFrameChange }) => {
  // 프레임을 시간으로 변환 (30fps)
  const frameToTime = (frame: number) => {
    const seconds = frame / 30;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 점선 그래프용 데이터 생성
  const generateLineChartData = () => {
    if (!posture_result?.detailed_logs || posture_result.detailed_logs.length === 0) {
      return [];
    }
    
    const firstStart = posture_result.detailed_logs[0]?.start_frame || 0;
    const lastEnd = posture_result.detailed_logs[posture_result.detailed_logs.length - 1]?.end_frame || 0;

    // 자세 상태별 y축 값 매핑
    const postureYValues = {
      'Good Posture': 5,
      'Shoulders Uneven': 4,
      'Hands Above Shoulders': 3,
      'Head Down': 2,
      'Head Off-Center': 1
    };

    const data: { frame: number; posture: number }[] = [];
    const interval = 30; // 1초 단위 (30fps)

    for (let frame = firstStart; frame <= lastEnd; frame += interval) {
      const currentPosture = posture_result.detailed_logs.find(
        log => frame >= log.start_frame && frame <= log.end_frame
      );

      data.push({
        frame,
        posture: currentPosture ? postureYValues[currentPosture.label as keyof typeof postureYValues] : 0
      });
    }

    return data;
  };

  // 원형 그래프용 데이터 생성
  const generatePieChartData = () => {
    if (!posture_result?.frame_distribution) {
      return [];
    }
    
    return Object.entries(posture_result.frame_distribution).map(([label, frames]) => ({
      name: getPostureStatusText(label as PostureStatusType),
      value: frames,
      color: getPostureColor(label)
    }));
  };

  const lineChartData = generateLineChartData();
  const pieChartData = generatePieChartData();

  // 데이터가 없는 경우 처리
  if (!posture_result || !posture_result.detailed_logs || posture_result.detailed_logs.length === 0) {
    return (
      <div className="bg-[#fafafc] border border-[#dedee4] rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">자세 분석 데이터가 없습니다.</div>
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
                    domain={[0.5, 5.5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tickFormatter={(value) => {
                      switch (value) {
                        case 1: return getPostureStatusText('Head Off-Center');
                        case 2: return getPostureStatusText('Head Down');
                        case 3: return getPostureStatusText('Hands Above Shoulders');
                        case 4: return getPostureStatusText('Shoulders Uneven');
                        case 5: return getPostureStatusText('Good Posture');
                        default: return '';
                      }
                    }}
                    fontSize={10}
                    width={100}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <Tooltip
                    labelFormatter={frameToTime}
                    formatter={(value) => {
                      switch (value) {
                        case 1: return [getPostureStatusText('Head Off-Center')];
                        case 2: return [getPostureStatusText('Head Down')];
                        case 3: return [getPostureStatusText('Hands Above Shoulders')];
                        case 4: return [getPostureStatusText('Shoulders Uneven')];
                        case 5: return [getPostureStatusText('Good Posture')];
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
                    dataKey="posture"
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
              <span className="text-gray-600">자세 상태 변화</span>
            </div>
          </div>
        </div>

        {/* 원형 그래프 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-[#2B7FFF]" />
            <h4 className="text-sm font-semibold text-[#2B7FFF]">자세 상태 분포</h4>
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

        {/* 피드백 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UserRoundSearch size={18} className="text-[#2B7FFF]" />
            <h4 className="text-sm font-semibold text-[#2B7FFF]">자세 피드백</h4>
          </div>
          {(() => {
            const goodPostureData = pieChartData.find(entry => entry.name === getPostureStatusText('Good Posture'));
            const goodPosturePercentage =
              goodPostureData
                ? (goodPostureData.value / pieChartData.reduce((sum, entry) => sum + entry.value, 0)) * 100
                : 0;

            if (goodPosturePercentage >= 70) {
              return (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200 shadow-sm">
                  <p className="text-sm font-medium text-green-700 mb-2">좋은 자세를 잘 유지했어요! 👍</p>
                  <p className="mt-1 text-xs text-gray-600">거의 모든 시간 동안 바른 자세를 유지하고 있어요.</p>
                </div>
              );
            } else {
              return (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 p-4 rounded-lg border border-red-200 shadow-sm">
                  <p className="text-sm font-medium text-red-700 mb-2">자세 개선이 필요해요</p>
                  <p className="text-xs text-gray-600">• 어깨를 균등하게 유지하고 한쪽으로 기울이지 않도록 주의하세요.</p>
                  <p className="text-xs text-gray-600">• 답변을 할 때 나도 모르게 손을 올려 제스처를 하지 않는지 되짚어보세요.</p>
                  <p className="text-xs text-gray-600">• 고개를 숙이지 말고 정면을 향하도록 유지하세요.</p>
                  <p className="text-xs text-gray-600">• 화면 중앙에 위치하여 시선을 집중할 수 있도록 하세요.</p>
                </div>
              );
            }
          })()}
        </div>
      </div>
    </div>
  );
};

export default PostureAnalysis;
