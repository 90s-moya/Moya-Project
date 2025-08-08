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

  // 서류 타입별 아이콘과 색상 매핑
  const getDocTypeInfo = (type: string) => {
    switch (type) {
      case "RESUME":
        return { icon: "📄", color: "text-blue-600", bgColor: "bg-blue-50" };
      case "COVERLETTER":
        return { icon: "📝", color: "text-green-600", bgColor: "bg-green-50" };
      case "PORTFOLIO":
        return { icon: "", color: "text-purple-600", bgColor: "bg-purple-50" };
      default:
        return { icon: "📄", color: "text-gray-600", bgColor: "bg-gray-50" };
    }
  };

  const docTypeInfo = getDocTypeInfo(currentItem.type);

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">사용자 서류</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ✕
        </button>
      </div>

      {/* 캐러셀 컨테이너 */}
      <div className="flex-1 relative">
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

        {/* 현재 아이템 */}
        <div
          className={`h-full p-4 rounded-lg border ${docTypeInfo.bgColor} overflow-y-auto`}
        >
          <div className="flex items-center mb-4">
            <span className="text-xl mr-3">{docTypeInfo.icon}</span>
            <h4 className={`text-lg font-medium ${docTypeInfo.color}`}>
              {currentItem.title}
            </h4>
          </div>

          <div className="mb-4">
            <a
              href={currentItem.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline break-all"
            >
              {currentItem.fileUrl.split("/").pop() || "파일 보기"}
            </a>
          </div>

          {/* 파일 미리보기 영역 */}
          <div className="bg-gray-100 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
            <p className="text-gray-500 text-center">
              파일을 클릭하여 새 탭에서 확인하세요
            </p>
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

      {/* 인디케이터 */}
      {items.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full ${
                index === currentIndex ? "bg-blue-500" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}

      {/* 키보드 안내 */}
      <div className="text-center mt-2 text-xs text-gray-500">
        <p>← → 방향키로 이동, ESC로 닫기</p>
      </div>
    </div>
  );
}
