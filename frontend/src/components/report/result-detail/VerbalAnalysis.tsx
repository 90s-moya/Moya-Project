import React from 'react';
import { MessageSquare, Smile, Frown, Target, Brain, Star, Speech, ListEnd, Puzzle } from 'lucide-react';
import {
  getQualityText,
  getSpeedText,
  getBooleanStatusConfig,
  SPEED_RANGES,
  SPEED_CHART_CONFIG,
  getSpeedRange,
} from '@/lib/constants';
import type { QualityScaleType, SpeedType } from '@/types/interviewReport';
import chatGpt from '@/assets/images/chat-gpt.png';


import {
  ComposedChart,
  XAxis,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

import type { VerbalResultProps } from '@/types/interviewReport';



const VerbalAnalysis: React.FC<VerbalResultProps> = ({ verbal_result }) => {
  // 상태에 따른 아이콘/텍스트/색상
  const getStatusIcon = (status: boolean) => {
    const config = getBooleanStatusConfig(status);
    const IconComponent = status ? Smile : Frown;
    return <IconComponent size={20} className={config.iconColor} />;
  };

  const getStatusText = (status: boolean) => {
    const config = getBooleanStatusConfig(status);
    return config.text;
  };

  const getStatusColor = (status: boolean) => {
    const config = getBooleanStatusConfig(status);
    return config.textColor;
  };

  // 현재 syll_art 값이 속한 구간
  const currentRange = getSpeedRange(verbal_result.syll_art);

  // 툴팁용
  const formatTooltip = (value: number) => `${value.toFixed(2)}`;

  return (
    <div className="bg-[#fafafc] border border-[#dedee4] rounded-lg p-6">
      <div className="space-y-6">
        {/* 답변 내용 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={18} className="text-[#2B7FFF]" />
            <h4 className="text-sm font-semibold text-[#2B7FFF]">답변 내용</h4>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#dedee4] shadow-sm">
            <p className="text-sm text-[#1b1c1f] leading-relaxed">{verbal_result.answer}</p>
          </div>
        </div>

        {/* 분석 결과 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Brain size={18} className="text-[#2B7FFF]" />
            <h4 className="text-sm font-semibold text-[#2B7FFF]">AI 분석 결과</h4>
          </div>

          <div className="space-y-4">
            {/* 상단 두 카드 - 답변 완성도, 불용어 사용 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border border-[#dedee4] shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Star size={16} className="text-yellow-500" />
                  <span className="text-xs font-medium text-gray-600">답변 완성도</span>
                </div>
                <p className="text-sm font-semibold text-[#1b1c1f]">
                  {getQualityText(verbal_result.end_type as QualityScaleType)}
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-[#dedee4] shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} className="text-blue-500" />
                  <span className="text-xs font-medium text-gray-600">불용어 사용</span>
                </div>
                <p className="text-sm font-semibold text-[#1b1c1f]">
                  {getQualityText(verbal_result.stopwords as QualityScaleType)}
                </p>
              </div>
            </div>

            {/* 문장 끝맺음 - 가로 배치 */}
            <div className="bg-white p-4 rounded-lg border border-[#dedee4] shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListEnd size={16} className="text-blue-500" />
                  <span className="text-xs font-medium text-gray-600">문장 끝맺음</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${getStatusColor(verbal_result.is_ended)}`}>
                    {getStatusText(verbal_result.is_ended)}
                  </span>
                  {getStatusIcon(verbal_result.is_ended)}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{verbal_result.reason_end}</p>
            </div>

            {/* 문맥 일치 - 가로 배치 */}
            <div className="bg-white p-4 rounded-lg border border-[#dedee4] shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Puzzle size={16} className="text-purple-500" />
                  <span className="text-xs font-medium text-gray-600">문맥 일치</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${getStatusColor(verbal_result.context_matched)}`}>
                    {getStatusText(verbal_result.context_matched)}
                  </span>
                  {getStatusIcon(verbal_result.context_matched)}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{verbal_result.reason_context}</p>
            </div>

                         {/* 말하기 속도 */}
             <div className="bg-white p-4 rounded-lg border border-[#dedee4] shadow-sm">
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                   <Speech size={16} className="text-orange-500" />
                   <span className="text-xs font-medium text-gray-600">말하기 속도</span>
                 </div>
                 <p className="text-sm font-semibold text-[#1b1c1f]">
                   {getSpeedText(verbal_result.speech_label as SpeedType)}
                 </p>
               </div>
               <div className="text-right">
                 <p className="text-xs text-gray-500">
                   {verbal_result.syll_art} 음절/초 (SPS)
                 </p>
               </div>

              {/* 음절 아티큘레이션 */}
              <div className="mt-2">

                                 {/* x축 구간 차트 */}
                 <div className="w-full h-12 overflow-hidden">
                   <ResponsiveContainer width="100%" height="100%">
                     <ComposedChart data={[{ x: SPEED_CHART_CONFIG.X_MIN }, { x: SPEED_CHART_CONFIG.X_MAX }]} margin={{ top: 4, right: 12, bottom: 4, left: 12 }}>
                       {/* 구간 배경 */}
                       {SPEED_RANGES.map((r, idx) => (
                         <ReferenceArea key={idx} x1={r.start} x2={r.end} y1={0} y2={1} ifOverflow="extendDomain" fill={r.color} fillOpacity={1} />
                       ))}
                       <XAxis
                         type="number"
                         dataKey="x"
                         domain={[SPEED_CHART_CONFIG.X_MIN, SPEED_CHART_CONFIG.X_MAX]}
                         tickCount={SPEED_CHART_CONFIG.TICK_COUNT}
                         tickFormatter={(v) => v.toFixed(1)}
                         axisLine={false}
                         tickLine={false}
                         height={24}
                         tick={{ fontSize: 12 }}
                       />

                       {/* 현재 값 마커 */}
                       <ReferenceLine x={verbal_result.syll_art} stroke="#1F2937" strokeWidth={2} />
                     </ComposedChart>
                   </ResponsiveContainer>
                 </div>

                 {/* 범례 */}
                 <div className="mt-2 flex flex-wrap items-center gap-3">
                   {SPEED_RANGES.map((r) => (
                     <div key={r.label} className="flex items-center gap-1 mt-2 text-xs text-gray-600">
                       <span className="inline-block w-3 h-3 rounded-sm" style={{ background: r.color }} />
                       <span>{r.label}</span>
                     </div>
                   ))}
                 </div>
              </div>
            </div>

            {/* AI 코멘트 - 맨 밑 */}
            <div>
              <div className="flex items-center gap-2 mb-4 mt-6">
                <img src={chatGpt} alt="AI" className="w-[18px] h-[18px]" />
                <h4 className="text-sm font-semibold text-[#2B7FFF]">AI 종합 의견</h4>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 shadow-sm">
                <p className="text-sm text-[#1b1c1f] leading-relaxed">{verbal_result.gpt_comment}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerbalAnalysis;