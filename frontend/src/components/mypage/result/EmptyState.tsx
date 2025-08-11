import React from 'react';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EmptyState: React.FC = () => {
  const navigate = useNavigate();

  const handleGoToInterview = () => {
    navigate("/interview");
  };
  return (
    <div className="w-full max-w-[880px] h-[360px] bg-[#FAFAFC] border border-[#EFEFF3] rounded-[10px] flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        {/* 아이콘 */}
        <div className="w-9 h-9 bg-white flex items-center justify-center">
          <FileText size={27} className="text-[#989AA2]" />
        </div>
        
        {/* 메시지 텍스트 */}
        <p className="text-center text-[#6F727C] font-semibold text-base leading-[1.875] mb-3">
          모의면접 결과가 존재하지 않아요!<br />
          모의면접 하시고 결과를 저장해보세요!
        </p>
        
        {/* AI 모의 면접 하러가기 버튼 */}
        <button 
          onClick={onGoToInterview}
          className="bg-[#2B7FFF] hover:bg-[#1E6FE8] text-white px-4 py-2 rounded-[10px] text-sm font-semibold leading-[1.714] transition-colors h-10"
        >
          AI 모의 면접 하러가기
        </button>
      </div>
    </div>
  );
};

export default EmptyState;
