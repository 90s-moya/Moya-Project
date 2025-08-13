import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChartScatter, Eye, UserRoundSearch, Clock } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { CheckCircle, XCircle } from 'lucide-react';
import { DEFAULT_THERMAL_STOPS, buildGradientCss, generateGazePieChartData, getGazeDistributionText } from '@/lib/constants';
import HeatmapCanvas from '@/components/common/HeatmapCanvas';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from 'lucide-react';



interface GazeAnalysisProps {
  center_gaze_percentage: number;
  peripheral_gaze_percentage: number;
  gaze_distribution: string;
  heatmap_data?: number[][];
}

const GazeAnalysis: React.FC<GazeAnalysisProps> = ({
  center_gaze_percentage,
  peripheral_gaze_percentage,
  gaze_distribution,
  heatmap_data
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // props로 전달받은 히트맵 데이터 사용
  const heatmap = heatmap_data ?? [];

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

  const pieChartData = generateGazePieChartData(center_gaze_percentage, peripheral_gaze_percentage);
  const isGoodGaze = center_gaze_percentage >= 70; // 70% 이상이면 좋은 시선 관리

  return (
    <div className="bg-[#fafafc] border border-[#dedee4] rounded-lg p-6">
      <div className="space-y-6">
        {/* 시선 분포도 히트맵 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ChartScatter size={18} className="text-[#2B7FFF]" />
            <h4 className="text-sm font-semibold text-[#2B7FFF]">시선 추적 히트맵</h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle size={16} className="text-gray-400 hover:text-blue-500 cursor-pointer transition-colors" />
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>답변 중 시선이 어디로 향하는지 <br></br>분석하여 시각화한 데이터입니다.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="bg-white p-4 pt-8 rounded-lg border border-[#dedee4] shadow-sm" ref={containerRef}>
            {!isLoaded ? (
              <div className="flex justify-center">
                <div className="w-[85%] aspect-video bg-gray-100 animate-pulse rounded-lg border border-gray-200" />
              </div>
            ) : Array.isArray(heatmap) && heatmap.length > 0 ? (
              <>
                <div className="flex justify-center">
                  <div className="w-fit border border-gray-200 rounded-lg overflow-hidden">
                    <HeatmapCanvas 
                      data={heatmap}
                      containerWidth={containerWidth}
                      aspectRatio={16/9}
                      className="block"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">
                표시할 데이터가 없습니다.
              </div>
            )}
              {/* 범례 */}
              <div className="flex items-center justify-start gap-2 mt-6 mx-auto">
                  <span className="text-xs text-gray-500">낮음</span>
                  <div
                    className="h-2 w-24 rounded-full"
                    style={{ background: buildGradientCss(DEFAULT_THERMAL_STOPS) }}
                  />
                  <span className="text-xs text-gray-500">높음</span>
                </div>
          </div>
        </div>

        {/* 시선 분포 원형 그래프 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-[#2B7FFF]" />
            <h4 className="text-sm font-semibold text-[#2B7FFF]">시선 분포</h4>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#dedee4] shadow-sm">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    dataKey="value"
                    label={({ percent }) => `${((percent || 0) * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {pieChartData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 시선 관리 상태 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Eye size={18} className="text-[#2B7FFF]" />
            <h4 className="text-sm font-semibold text-[#2B7FFF]">시선 관리 상태</h4>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#dedee4] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isGoodGaze ? (
                  <CheckCircle size={20} className="text-green-500" />
                ) : (
                  <XCircle size={20} className="text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {isGoodGaze ? '우수' : '부족'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-[#2B7FFF]">
                  {center_gaze_percentage.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">중앙 시선 비율</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">중앙 시선</span>
                <span className="font-medium">{center_gaze_percentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">주변 시선</span>
                <span className="font-medium">{peripheral_gaze_percentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">시선 분포 패턴</span>
                <span className="font-medium">
                  {getGazeDistributionText(gaze_distribution)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 시선 피드백 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UserRoundSearch size={18} className="text-[#2B7FFF]" />
            <h4 className="text-sm font-semibold text-[#2B7FFF]">시선 피드백</h4>
          </div>
          {isGoodGaze ? (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200 shadow-sm">
              <p className="text-sm font-medium text-green-700 mb-2">훌륭한 시선 관리! 👀</p>
              <p className="mt-1 text-xs text-gray-600">
                면접관을 향한 집중된 시선을 잘 유지하고 있어요. 이는 자신감과 집중력을 보여주는 좋은 신호입니다.
              </p>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 p-4 rounded-lg border border-red-200 shadow-sm">
              <p className="text-sm font-medium text-red-700 mb-2">시선 관리 개선이 필요해요</p>
              <div className="text-xs text-gray-600 space-y-1">
                <p>• 면접관의 눈을 바라보며 답변하세요.</p>
                <p>• 너무 자주 시선을 돌리지 않도록 주의하세요.</p>
                <p>• 답변할 때는 정면을 향해 자신감 있게 말하세요.</p>
                <p>• 긴장할 때는 면접관의 코나 이마 부분을 바라보는 것도 좋은 방법입니다.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GazeAnalysis;