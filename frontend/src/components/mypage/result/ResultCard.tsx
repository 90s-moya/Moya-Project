import React from 'react';
import { ImageOff, Clock } from 'lucide-react';

interface ResultCardProps {
  result: {
    result_id: string;
    created_at: string;
    status: string;
    order: number;
    suborder: number;
    question: string;
    thumbnail_url: string;
  };
  reportId: string;
  onResultClick: (reportId: string, resultId: string) => void;
}

const ResultCard: React.FC<ResultCardProps> = ({
  result,
  reportId,
  onResultClick
}) => {
  // 순서 표시 포맷 함수를 내부로 이동
  const formatOrder = (order: number, suborder: number) => {
    if (suborder === 0) {
      return `${order}번 질문`;
    }
    return `${order}-${suborder} 꼬리질문`;
  };

  // 결과 클릭 핸들러
  const handleResultClick = () => {
    if (result.status !== 'IN_PROGRESS') {
      onResultClick(reportId, result.result_id);
    }
  };

  const [imgError, setImgError] = React.useState(false);
  const showImage = !!result.thumbnail_url && !imgError;

  return (
    <div
      className={`relative bg-[#fafafc] border border-[#dedee4] rounded-lg overflow-hidden transition-all w-[240px] min-h-60 ${
        result.status === 'IN_PROGRESS' 
          ? 'opacity-40' 
          : 'cursor-pointer hover:z-50 hover:shadow-lg hover:-translate-y-1'
      }`}
      onClick={handleResultClick}
    >
      {/* 썸네일 이미지 */}
      <div className="aspect-video bg-gray-200 relative flex items-center justify-center">
        {showImage ? (
          <img
            src={result.thumbnail_url}
            alt="면접 썸네일"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <ImageOff size={40} className="text-gray-400" />
          </div>
        )}
        {/* 진행중인 경우 오버레이 */}
        {result.status === 'IN_PROGRESS' && (
          <div className="absolute inset-0 bg-gray-700 bg-opacity-40 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-full p-2 bg-white">
                <Clock size={24} className="text-[#2B7FFF]" />
              </div>
              <p className="text-white text-sm font-medium">
                답변을 분석하고 있어요
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 카드 하단 정보 */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="text-sm text-[#2B7FFF] font-medium mb-2">
              {formatOrder(result.order, result.suborder)}
            </div>
            <p className="text-sm text-[#1b1c1f] leading-relaxed line-clamp-2">
              Q. {result.question}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
