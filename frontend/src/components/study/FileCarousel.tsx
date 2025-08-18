import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";

interface CarouselProps {
  items: {
    id: string; // 서류 고유 ID
    title: string;
    fileUrl: string;
    type: "RESUME" | "COVERLETTER" | "PORTFOLIO";
  }[];
  onClose: () => void; // 캐러셀 닫기 함수
}

export default function FileCarousel({ items, onClose }: CarouselProps) {
  const BASE_FILE_URL = import.meta.env.VITE_FILE_URL; // 서류를 불러오기 위한 파일 URL
  const [currentIndex, setCurrentIndex] = useState(0); // 현재 보고 있는 서류 인덱스
  const [error, setError] = useState<string | null>(null); // 에러 상태

  // props 로깅
  useEffect(() => {
    console.log("Carousel props - items:", items);
    console.log("Carousel props - items 상세:", JSON.stringify(items, null, 2));
  }, [items]);

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowLeft": // 왼쪽 화살표: 이전 서류
          event.preventDefault();
          event.stopPropagation(); // 이벤트 전파 방지
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
          break;
        case "ArrowRight": // 오른쪽 화살표 : 다음 서류
          event.preventDefault();
          event.stopPropagation(); // 이벤트 전파 방지
          setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
          break;
        case "Escape": // ESC: 캐러셀 닫기
          event.preventDefault();
          event.stopPropagation(); // 이벤트 전파 방지
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

  const currentItem = items[currentIndex]; // 현재 선택된 서류
  const fullFileUrl = `${BASE_FILE_URL}${currentItem.fileUrl}`;
  const fileName = currentItem.fileUrl.split("/").pop() || "파일.pdf";

  // PDF 내용 렌더링
  const renderPdfContent = () => {
    // 서류가 렌더링 되지 않는 경우
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-center mb-4">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={() => window.open(fullFileUrl, "_blank")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <ExternalLink className="w-4 h-4" />새 탭에서 열기
            </button>
          </div>
        </div>
      );
    }

    return (
      <iframe
        src={`${fullFileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
        className="w-full h-full border-0 rounded-lg"
        onError={() => {
          console.error("PDF 로드 실패:", fullFileUrl);
          setError("PDF 파일을 불러올 수 없습니다.");
        }}
      />
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* 상단 탭바 + 닫기 (sticky) */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 backdrop-blur px-0 py-2 border-b">
        <div className="overflow-x-auto max-w-full">
          <div className="flex gap-2 pr-2">
            {items.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setCurrentIndex(index)}
                className={`px-3 py-2 rounded-full text-sm whitespace-nowrap border transition-colors ${
                  index === currentIndex
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-[#2b7fff]"
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
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* 본문 영역: PDF 내용 표시 */}
      <div className="flex-1 relative bg-white overflow-hidden">
        {/* 이전 버튼 */}
        {items.length > 1 && (
          <button
            onClick={() =>
              setCurrentIndex((prev) =>
                prev > 0 ? prev - 1 : items.length - 1
              )
            }
            className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-1.5 shadow-lg hover:bg-gray-50"
          >
            <ChevronLeft className="w-5 h-5 text-[#2b7fff]" />
          </button>
        )}

        {/* PDF 내용 */}
        <div className="absolute inset-0">{renderPdfContent()}</div>

        {/* 다음 버튼 */}
        {items.length > 1 && (
          <button
            onClick={() =>
              setCurrentIndex((prev) =>
                prev < items.length - 1 ? prev + 1 : 0
              )
            }
            className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-1.5 shadow-lg hover:bg-gray-50"
          >
            <ChevronRight className="w-5 h-5 text-[#2b7fff]" />
          </button>
        )}
      </div>

      {/* 하단 정보 및 컨트롤 */}
      <div className="bg-gray-50 px-4 py-2 border-t">
        <div className="text-center mt-1 text-sm text-gray-500">
          <p>← → 방향키로 이동 | ESC로 닫기</p>
        </div>
      </div>
    </div>
  );
}
