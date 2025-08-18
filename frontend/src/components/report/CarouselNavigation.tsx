import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ResultCard from './ResultCard';
import type { CarouselNavigationProps } from '@/types/interviewReport';

const CarouselNavigation: React.FC<CarouselNavigationProps> = ({
  reportId,
  results,
  onResultClick
}) => {
  const [currentPage, setCurrentPage] = React.useState(0);
  const [itemsPerView, setItemsPerView] = React.useState(3);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // 컨테이너 크기를 측정하여 보여줄 카드 개수 계산
  React.useEffect(() => {
    const updateItemsPerView = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const cardWidth = 240; // ResultCard 너비
      const gap = 24; // gap-6 = 24px
      const buttonSpace = 80; // 버튼 공간을 더 줄임
      
      
      // 사용 가능한 너비 계산
      const availableWidth = containerWidth - buttonSpace;
      
      // 각 카드 개수별 필요한 최소 너비 계산
      const widthFor1Card = cardWidth; // 240px
      const widthFor2Cards = (cardWidth * 2) + gap; // 504px
      const widthFor3Cards = (cardWidth * 3) + (gap * 2); // 768px
      const widthFor4Cards = (cardWidth * 4) + (gap * 3); // 1032px
      
      let newItemsPerView = 1; // 기본값
      
      // 큰 수부터 체크해서 최대한 많이 표시
      if (availableWidth >= widthFor4Cards && results.length >= 4) {
        newItemsPerView = 4;
      } else if (availableWidth >= widthFor3Cards && results.length >= 3) {
        newItemsPerView = 3;
      } else if (availableWidth >= widthFor2Cards && results.length >= 2) {
        newItemsPerView = 2;
      } else {
        newItemsPerView = 1;
      }
      
      // 결과 개수보다 많이 표시할 수 없음
      newItemsPerView = Math.min(newItemsPerView, results.length);
      
      
      setItemsPerView(newItemsPerView);
      
      // 현재 페이지가 새로운 최대값을 초과하면 조정
      const newMaxStartIndex = Math.max(0, results.length - newItemsPerView);
      setCurrentPage(prev => Math.min(prev, newMaxStartIndex));
    };

    // 초기 계산
    updateItemsPerView();

    // ResizeObserver로 크기 변화 감지
    const resizeObserver = new ResizeObserver(updateItemsPerView);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [results.length]);

  // 마지막 페이지에서 보여줄 수 있는 최대 시작 인덱스 계산
  const maxStartIndex = Math.max(0, results.length - itemsPerView);

  const handlePrev = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentPage(prev => Math.min(maxStartIndex, prev + 1));
  };

  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < maxStartIndex;

  // 현재 페이지에서 보여줄 카드들만 선택
  const visibleResults = results.slice(currentPage, currentPage + itemsPerView);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 카드 컨테이너 */}
      <div className="relative overflow-x-hidden overflow-y-visible rounded-lg">
        {/* 페이드 그라데이션 효과 */}
        <div className="absolute left-0 top-0 w-8 h-full z-5 pointer-events-none opacity-50"></div>
        <div className="absolute right-0 top-0 w-16 h-full bg-gradient-to-l from-white via-white/80 to-transparent z-5 pointer-events-none"></div>
        {/* 이전 버튼 */}
        {canGoPrev && (
          <button
            onClick={handlePrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-[#dedee4] rounded-full p-2 shadow-lg hover:bg-gray-50 hover:scale-110 hover:shadow-xl transition-all duration-300 ease-out"
            aria-label="이전 결과 보기"
          >
            <ChevronLeft size={20} className="text-[#2B7FFF] transition-transform duration-200 hover:-translate-x-0.5" />
          </button>
        )}

        {/* 다음 버튼 */}
        {canGoNext && (
          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-[#dedee4] rounded-full p-2 shadow-lg hover:bg-gray-50 hover:scale-110 hover:shadow-xl transition-all duration-300 ease-out"
            aria-label="다음 결과 보기"
          >
            <ChevronRight size={20} className="text-[#2B7FFF] transition-transform duration-200 hover:translate-x-0.5" />
          </button>
        )}

        {/* 카드 컨테이너 - 반응형 */}
        <div className="flex justify-start py-4">
          <div 
            className="flex gap-6 transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${currentPage * (240 + 24)}px)`
            }}
          >
            {results.map((result) => (
              <div key={result.result_id} className="flex-shrink-0" style={{ width: '240px' }}>
                <ResultCard
                  result={result}
                  reportId={reportId}
                  onResultClick={onResultClick}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarouselNavigation;