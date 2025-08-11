import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselProps {
  items: {
    id: string;
    title: string;
    fileUrl: string;
    type: "RESUME" | "COVERLETTER" | "PORTFOLIO";
  }[];
  onClose: () => void;
}

export default function Carousel({ items, onClose }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowLeft":
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
          break;
        case "ArrowRight":
          setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
          break;
        case "Escape":
          onClose();
          break;
      }
    },
    [items.length, onClose]
  );

  // 키보드 이벤트 리스너 등록/해제
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // 아이템이 없으면 렌더링하지 않음
  if (items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];

  return (
    <div className="h-full flex flex-col">
      {/* 상단 탭바 + 닫기 (sticky) */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 backdrop-blur px-2 py-2 border-b">
        <div className="overflow-x-auto max-w-full">
          <div className="flex gap-2 pr-2">
            {items.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setCurrentIndex(index)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap border transition-colors ${
                  index === currentIndex
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      {/* 본문 영역: 하나의 컨테이너로 최대 공간 확보 */}
      <div className="flex-1 relative bg-white overflow-hidden">
        {/* 이전 버튼 */}
        {items.length > 1 && (
          <button
            onClick={() =>
              setCurrentIndex((prev) =>
                prev > 0 ? prev - 1 : items.length - 1
              )
            }
            className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* 현재 아이템 - 최대 공간 활용 */}
        <div className="absolute inset-0 overflow-auto p-3 md:p-4">
          <div className="mb-2">
            <a
              href={currentItem.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all text-sm"
            >
              {currentItem.fileUrl.split("/").pop() || "파일 보기"}
            </a>
          </div>
          {/* 텍스트 위주 문서를 위한 넓은 영역 */}
          <div className="min-h-[360px] md:min-h-[420px] whitespace-pre-wrap leading-relaxed text-[15px] md:text-[16px] text-gray-800">
            서류가 어떤 식으로 오는지에 따라 수정할 것.
          </div>
        </div>

        {/* 다음 버튼 */}
        {items.length > 1 && (
          <button
            onClick={() =>
              setCurrentIndex((prev) =>
                prev < items.length - 1 ? prev + 1 : 0
              )
            }
            className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 키보드 안내 */}
      <div className="text-center mt-2 text-xs text-gray-500">
        <p>← → 방향키로 이동 | ESC로 닫기</p>
      </div>
    </div>
  );
}
