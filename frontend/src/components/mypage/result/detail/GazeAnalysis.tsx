import React from 'react';
import { Eye } from 'lucide-react';
import { HeatMapGrid } from 'react-grid-heatmap';
import testData from '@/test.json';

const GazeAnalysis: React.FC = () => {
  const heatmap = (testData as any).heatmap_data as number[][];
  const xCount = heatmap?.[0]?.length ?? 0;
  const yCount = heatmap?.length ?? 0;

  const xLabels = Array.from({ length: xCount }, (_, i) => `${i + 1}`);
  const yLabels = Array.from({ length: yCount }, (_, i) => `${i + 1}`);

  return (
    <div className="bg-[#fafafc] border border-[#dedee4] rounded-lg p-6">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Eye size={18} className="text-[#2B7FFF]" />
            <h4 className="text-sm font-semibold text-[#2B7FFF]">시선 히트맵</h4>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#dedee4] shadow-sm">
            <div className="max-h-[560px] overflow-auto">
              {heatmap && heatmap.length > 0 ? (
                <HeatMapGrid
                  data={heatmap}
                  xLabels={xLabels}
                  yLabels={yLabels}
                  cellRender={(x: number, y: number, value: number) => (value ? `${value}` : '')}
                  cellStyle={(x: number, y: number, ratio: number) => ({
                    border: '1px solid #f3f4f6',
                    backgroundColor: `rgba(43, 127, 255, ${ratio})`
                  })}
                  square
                  cellHeight="6px"
                />
              ) : (
                <div className="text-sm text-gray-500">표시할 데이터가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GazeAnalysis;
