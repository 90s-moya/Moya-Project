import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import testData from '@/test.json';
import { DEFAULT_THERMAL_STOPS, buildGradientCss } from '@/lib/constants';
import HeatmapCanvas from '@/components/common/HeatmapCanvas';

type HeatmapJson = {
  heatmap_data?: number[][];
};

const GazeAnalysis: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // 실제 test.json 데이터 사용
  const heatmap = ((testData as unknown) as HeatmapJson).heatmap_data ?? [];

  // 컨테이너 크기 감지 (캔버스 크기 설정만 담당)
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width);
        if (!isLoaded && width > 0) {
          setIsLoaded(true);
        }
      }
    };

    const timeoutId = setTimeout(updateWidth, 50);
    const resizeObserver = new ResizeObserver(updateWidth);
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', updateWidth);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [isLoaded]);

  return (
    <div className="bg-[#fafafc] border border-[#dedee4] rounded-lg p-6">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Eye size={18} className="text-[#2B7FFF]" />
            <h4 className="text-sm font-semibold text-[#2B7FFF]">시선 분포도</h4>
          </div>

          <div className="bg-white p-4 pt-8 rounded-lg border border-[#dedee4] shadow-sm" ref={containerRef}>
            {!isLoaded ? (
              <div className="flex justify-center">
                <div className="w-[85%] aspect-video bg-gray-100 animate-pulse rounded-lg border border-gray-200" />
              </div>
            ) : Array.isArray(heatmap) && heatmap.length > 0 ? (
              <>
                <div className="flex justify-center">
                  <div className="w-fit border border-gray-300 rounded-sm overflow-hidden">
                    <HeatmapCanvas 
                      data={heatmap}
                      containerWidth={containerWidth}
                      aspectRatio={16/9}
                      className="block"
                    />
                  </div>
                </div>
                
                {/* 범례 */}
                <div className="flex items-center justify-start gap-2 mt-4 mb-2 w-9/10 mx-auto">
                  <span className="text-xs text-gray-500">낮음</span>
                  <div
                    className="h-2 w-24 rounded-full"
                    style={{ background: buildGradientCss(DEFAULT_THERMAL_STOPS) }}
                  />
                  <span className="text-xs text-gray-500">높음</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">
                표시할 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GazeAnalysis;