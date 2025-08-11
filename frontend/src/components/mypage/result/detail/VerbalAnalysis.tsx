import React from 'react';

export interface VerbalResultProps {
  verbal_result: {
    answer: string;
    stopwords: string;
    reason_context: string;
    gpt_comment: string;
    end_type: string;
    is_fast: string;
    syll_art: number;
  };
}

const VerbalAnalysis: React.FC<VerbalResultProps> = ({ verbal_result }) => {
  return (
    <div className="bg-[#fafafc] border border-[#dedee4] rounded-lg p-6">
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-[#2B7FFF] mb-2">답변 내용</h4>
          <p className="text-sm text-[#1b1c1f] bg-white p-3 rounded border">
            {verbal_result.answer}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-[#2B7FFF] mb-2">분석 결과</h4>
          <div className="space-y-3">
            <div className="bg-white p-3 rounded border">
              <p className="text-sm text-[#1b1c1f]"><strong>불용어 사용:</strong> {verbal_result.stopwords}</p>
            </div>
            <div className="bg-white p-3 rounded border">
              <p className="text-sm text-[#1b1c1f]"><strong>답변 맥락:</strong> {verbal_result.reason_context}</p>
            </div>
            <div className="bg-white p-3 rounded border">
              <p className="text-sm text-[#1b1c1f]"><strong>AI 코멘트:</strong> {verbal_result.gpt_comment}</p>
            </div>
            <div className="bg-white p-3 rounded border">
              <p className="text-sm text-[#1b1c1f]"><strong>답변 완성도:</strong> {verbal_result.end_type}</p>
            </div>
            <div className="bg-white p-3 rounded border">
              <p className="text-sm text-[#1b1c1f]"><strong>말하기 속도:</strong> {verbal_result.is_fast}</p>
            </div>
            <div className="bg-white p-3 rounded border">
              <p className="text-sm text-[#1b1c1f]"><strong>음절 아티큘레이션:</strong> {verbal_result.syll_art}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerbalAnalysis;
