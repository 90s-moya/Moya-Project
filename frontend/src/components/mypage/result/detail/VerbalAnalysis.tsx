import React from 'react';
import { MessageSquare, Smile, Frown, Target, Brain, Star, Speech, ListEnd, Puzzle } from 'lucide-react';
import { 
  getQualityText,
  getSpeedText,
  getBooleanStatusConfig,
  type QualityScaleType,
  type SpeedType
} from '@/lib/constants';
import chatGpt from '@/assets/images/chat-gpt.png';

export interface VerbalResultProps {
  verbal_result: {
    answer: string;
    stopwords: string;
    is_ended: boolean;
    reason_end: string;
    context_matched: boolean;
    reason_context: string;
    gpt_comment: string;
    end_type: string;
    is_fast: string;
    syll_art: number;
  };
}

const VerbalAnalysis: React.FC<VerbalResultProps> = ({ verbal_result }) => {
  // 상태에 따른 아이콘과 색상 결정
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
            <p className="text-sm text-[#1b1c1f] leading-relaxed">
              {verbal_result.answer}
            </p>
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

            {/* 말하기 속도 - 가로 배치로 상단 우측 값 */}
            <div className="bg-white p-4 rounded-lg border border-[#dedee4] shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Speech size={16} className="text-orange-500" />
                  <span className="text-xs font-medium text-gray-600">말하기 속도</span>
                </div>
                <p className="text-sm font-semibold text-[#1b1c1f]">
                  {getSpeedText(verbal_result.is_fast as SpeedType)}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2">음절 아티큘레이션: {verbal_result.syll_art}</p>
            </div>

            {/* AI 코멘트 - 맨 밑 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <img src={chatGpt} alt="AI" className="w-4 h-4" />
                <span className="text-xs font-semibold text-blue-600">AI 코멘트</span>
              </div>
              <p className="text-sm text-[#1b1c1f] leading-relaxed">
                {verbal_result.gpt_comment}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerbalAnalysis;
