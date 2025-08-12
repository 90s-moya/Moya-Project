import React from 'react';
import { Clock, TrendingUp, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { getPostureStatusText, getPostureColor, type PostureStatusType } from '@/lib/constants';

export interface PostureResultProps {
  posture_result: {
    timestamp: string;
    total_frames: number;
    frame_distribution: {
      [key: string]: string;
    };
    detailed_logs: Array<{
      label: string;
      start_frame: number;
      end_frame: number;
    }>;
  };
  onFrameChange?: (frame: number) => void;
}

const PostureAnalysis: React.FC<PostureResultProps> = ({ posture_result, onFrameChange }) => {
  // 프레임을 시간으로 변환 (30fps)
  const frameToTime = (frame: number) => {
    const seconds = frame / 30;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };



  // 점선 그래프용 데이터 생성
  const generateLineChartData = () => {
    const firstStart = posture_result.detailed_logs[0]?.start_frame || 0;
    const lastEnd = posture_result.detailed_logs[posture_result.detailed_logs.length - 1]?.end_frame || 0;
    
    // 자세 상태별 y축 값 매핑
    const postureYValues = {
      'Good Posture': 3,
      'Shoulders Uneven': 2,
      'Hands Above Shoulders': 1
    };
    
    const data: any[] = [];
    
    // 1초 단위로 데이터 포인트 생성 (30fps 기준)
    const interval = 30; // 1초 = 30프레임

    // 1초 단위로 데이터 포인트 생성
    for (let frame = firstStart; frame <= lastEnd; frame += interval) {
      // 현재 프레임의 자세 상태 찾기
      const currentPosture = posture_result.detailed_logs.find(log => 
        frame >= log.start_frame && frame <= log.end_frame
      );
      
      data.push({
        frame,
        posture: currentPosture ? postureYValues[currentPosture.label as keyof typeof postureYValues] : 0
      });
    }

    return data;
  };

  // 원형 그래프용 데이터 생성
  const generatePieChartData = () => {
    return Object.entries(posture_result.frame_distribution).map(([label, frames]) => ({
      name: getPostureStatusText(label as PostureStatusType),
      value: parseInt(frames),
      color: getPostureColor(label)
    }));
  };

  const lineChartData = generateLineChartData();
  const pieChartData = generatePieChartData();

  return (
    <div className="bg-[#fafafc] border border-[#dedee4] rounded-lg p-6">
      <div className="space-y-6">
        {/* 자세 상태 타임라인 그래프 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-[#2B7FFF]" />
            <h4 className="text-sm font-semibold text-[#2B7FFF]">타임라인</h4>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#dedee4] shadow-sm">
                         <div className="h-64">
                               <ResponsiveContainer width="100%" height="100%">
                                     <LineChart 
                     data={lineChartData} 
                     margin={{ top: 20, right: 5, left: 5, bottom: 5 }}
                     onClick={(data) => {
                       console.log('Chart clicked:', data);
                       if (data && data.activeLabel !== undefined && onFrameChange) {
                         const frame = Number(data.activeLabel);
                         console.log('Moving to frame:', frame);
                         onFrameChange(frame);
                       }
                     }}
                   >
                                       <CartesianGrid stroke="#e5e7eb" strokeDasharray="8 8" />
                                                            <XAxis 
                       dataKey="frame" 
                       tickFormatter={(value) => frameToTime(value)}
                       fontSize={10}
                       tick={{ fill: '#9CA3AF' }}
                       interval={2}
                     />
                                       <YAxis 
                      domain={[0.5, 3.5]}
                      ticks={[1, 2, 3]}
                      tickFormatter={(value) => {
                        switch (value) {
                          case 1: return getPostureStatusText('Hands Above Shoulders');
                          case 2: return getPostureStatusText('Shoulders Uneven');
                          case 3: return getPostureStatusText('Good Posture');
                          default: return '';
                        }
                      }}
                      fontSize={12}
                      width={80}
                      tickLine={false}
                      tickMargin={8}
                    />
                                       <Tooltip 
                      labelFormatter={(value) => frameToTime(value)}
                      formatter={(value) => {
                        let postureName = '';
                        switch (value) {
                          case 1: postureName = getPostureStatusText('Hands Above Shoulders'); break;
                          case 2: postureName = getPostureStatusText('Shoulders Uneven'); break;
                          case 3: postureName = getPostureStatusText('Good Posture'); break;
                          default: postureName = 'Unknown';
                        }
                        return [postureName];
                      }}
                       contentStyle={{
                         fontSize: '11px',
                         border: '1px solid #dedee4',
                         borderRadius: '6px',
                         backgroundColor: 'white',
                         boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                         outline: 'none'
                       }}
                      isAnimationActive={false}
                    />
                    
                                                           <Line 
                      type="monotone" 
                      dataKey="posture" 
                      stroke="#2B7FFF"
                      strokeWidth={2}
                      dot={false}
                      style={{ cursor: 'pointer' }}
                    />
                                         
                 </LineChart>
               </ResponsiveContainer>
             </div>
             <div className="mt-4 flex flex-wrap items-center gap-4">
               <div className="flex items-center gap-2 text-xs">
                 <div className="w-3 h-3 rounded-sm bg-[#2B7FFF]" />
                 <span className="text-gray-600">자세 상태 변화</span>
               </div>
             </div>
          </div>
        </div>

        {/* 자세 상태 분포 (원형 그래프) */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-[#2B7FFF]" />
            <h4 className="text-sm font-semibold text-[#2B7FFF]">자세 상태 분포</h4>
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
                      label={({ percent }) => 
                        `${((percent || 0) * 100).toFixed(1)}%`
                      }
                      labelLine={false}
                    >
                     {pieChartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
              </ResponsiveContainer>
            </div>
            {/* 색상 범례 */}
            <div className="mt-4 flex flex-wrap gap-3">
              {pieChartData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-gray-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        

        {/* 자세 개선 팁 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-[#2B7FFF]" />
            <h4 className="text-sm font-semibold text-[#2B7FFF]">자세 개선 팁</h4>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200 shadow-sm">
            <div className="space-y-2 text-sm text-[#1b1c1f]">
              <p>• 어깨를 균등하게 유지하고 한쪽으로 기울이지 않도록 주의하세요.</p>
              <p>• 손을 어깨 높이 이상으로 올리지 말고 자연스럽게 배치하세요.</p>
              <p>• 등을 곧게 펴고 시선은 정면을 향하도록 유지하세요.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostureAnalysis;
