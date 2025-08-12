import React, { useEffect, useMemo, useRef } from 'react';
import { DEFAULT_THERMAL_STOPS, type Rgb, type ColorStop } from '@/lib/constants';

type HeatmapCanvasProps = {
  data: number[][];
  containerWidth: number;
  aspectRatio?: number;
  className?: string;
};

// 유틸리티 함수들
function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateColor(stops: ColorStop[], t: number): Rgb {
  const x = clamp01(t);
  let left = stops[0];
  let right = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i];
    const b = stops[i + 1];
    if (x >= a.value && x <= b.value) {
      left = a;
      right = b;
      break;
    }
  }
  const span = right.value - left.value || 1;
  const localT = clamp01((x - left.value) / span);
  return {
    r: Math.round(lerp(left.color.r, right.color.r, localT)),
    g: Math.round(lerp(left.color.g, right.color.g, localT)),
    b: Math.round(lerp(left.color.b, right.color.b, localT)),
  };
}



const HeatmapCanvas: React.FC<HeatmapCanvasProps> = ({
  data,
  containerWidth,
  aspectRatio = 16/9,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 기본 설정값들 (집중된 KDE + 1200샘플 기준)
  const showGrid = false;
  const smooth = true;
  const alphaMin = 0.15;  // 적당한 배경 투명도
  const alphaMax = 0.95;  // 높은 최대 투명도
  const gamma = 1.2;      // 적당한 대비 강화
  const cutoff = 0.02;    // 최소 노이즈만 제거 (더 많은 데이터 표시)
  const colorStops = DEFAULT_THERMAL_STOPS;

  const { rows, cols, normalizedData, canvasWidth, canvasHeight, cellSize } = useMemo(() => {
    const rowsCount = data.length;
    const colsCount = rowsCount > 0 ? data[0].length : 0;

    // 컨테이너의 85% 너비 사용
    const targetWidth = containerWidth * 0.85;
    const targetHeight = targetWidth / aspectRatio;

    // 각 셀의 크기 계산 (데이터 그리드에 맞춰)
    const calculatedCellSize = colsCount > 0 ? targetWidth / colsCount : 8;

    // KDE (Kernel Density Estimation) 적용 - 1200샘플 기준 최적화
    const kernelRadius = Math.min(5, Math.max(3, Math.min(colsCount, rowsCount) * 0.03)); // 더 집중된 커널
    const smoothedData: number[][] = [];
    
    // 가우시안 커널로 스무딩
    for (let y = 0; y < rowsCount; y += 1) {
      const row: number[] = [];
      for (let x = 0; x < colsCount; x += 1) {
        let sum = 0;
        let weightSum = 0;
        
        // 커널 영역 내 모든 점들의 가중 합
        const startY = Math.max(0, y - Math.ceil(kernelRadius));
        const endY = Math.min(rowsCount - 1, y + Math.ceil(kernelRadius));
        const startX = Math.max(0, x - Math.ceil(kernelRadius));
        const endX = Math.min(colsCount - 1, x + Math.ceil(kernelRadius));
        
        for (let ky = startY; ky <= endY; ky += 1) {
          for (let kx = startX; kx <= endX; kx += 1) {
            const distance = Math.sqrt((x - kx) ** 2 + (y - ky) ** 2);
            if (distance <= kernelRadius) {
              // 가우시안 가중치 (더 급격한 감소)
              const weight = Math.exp(-(distance ** 2) / (2 * (kernelRadius / 2.5) ** 2));
              sum += (data[ky][kx] ?? 0) * weight;
              weightSum += weight;
            }
          }
        }
        
        row.push(weightSum > 0 ? sum / weightSum : 0);
      }
      smoothedData.push(row);
    }
    
    // 분위수 기반 클리핑 (이상치 제거)
    const flatValues = smoothedData.flat().filter(v => v > 0).sort((a, b) => a - b);
    const p95 = flatValues[Math.floor(flatValues.length * 0.95)] || 1;
    const p5 = flatValues[Math.floor(flatValues.length * 0.05)] || 0;
    
    // 정규화 (클리핑 적용)
    const maxClipped = p95;
    const normalized = smoothedData.map(row => 
      row.map(v => {
        const clipped = Math.min(maxClipped, Math.max(0, v - p5));
        return maxClipped > 0 ? clipped / maxClipped : 0;
      })
    );

    return { 
      rows: rowsCount, 
      cols: colsCount, 
      normalizedData: normalized, 
      canvasWidth: targetWidth, 
      canvasHeight: targetHeight, 
      cellSize: calculatedCellSize 
    };
  }, [data, containerWidth, aspectRatio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rows || !cols) return;

    const dpr = window.devicePixelRatio || 1;
    const internalCell = smooth ? 1 : cellSize;

    // 실제 그리기 영역은 데이터 크기에 맞춰
    const drawWidth = cols * internalCell;
    const drawHeight = rows * internalCell;

    // 캔버스 픽셀 크기 설정 (고해상도 대응)
    canvas.width = drawWidth * dpr;
    canvas.height = drawHeight * dpr;

    // CSS 크기는 16:9 비율로 설정
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    canvas.style.display = 'block';
    canvas.style.objectFit = 'fill'; // 캔버스 내용을 컨테이너에 맞춤

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, drawWidth, drawHeight);
    ctx.imageSmoothingEnabled = smooth;
    ctx.imageSmoothingQuality = smooth ? 'high' : 'low';

    for (let y = 0; y < rows; y += 1) {
      const row = normalizedData[y];
      for (let x = 0; x < cols; x += 1) {
        const raw = row[x] || 0;
        if (raw <= cutoff) continue;

        const ratioGamma = Math.pow(raw, Math.max(0.01, gamma));
        const alpha = Math.min(1, Math.max(0, alphaMin + (alphaMax - alphaMin) * ratioGamma));
        const { r, g, b } = interpolateColor(colorStops, raw);

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(x * internalCell, y * internalCell, internalCell, internalCell);

        if (!smooth && showGrid) {
          ctx.strokeStyle = '#1f2937';
          ctx.globalAlpha = 0.1;
          ctx.lineWidth = 1;
          ctx.strokeRect(x * internalCell, y * internalCell, internalCell, internalCell);
          ctx.globalAlpha = 1;
        }
      }
    }
  }, [rows, cols, normalizedData, cellSize, colorStops, showGrid, smooth, alphaMin, alphaMax, gamma, cutoff, canvasWidth, canvasHeight]);

  return (
    <canvas 
      ref={canvasRef} 
      className={className} 
      aria-label="Heatmap canvas (thermal)" 
    />
  );
};

export default HeatmapCanvas;