"use client";

import { useEffect, useRef } from "react";

interface MicVisualizerProps {
  stream: MediaStream | null;
}

export default function MicVisualizer({ stream }: MicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / dataArray.length;

      dataArray.forEach((value, i) => {
        const barHeight = (value / 255) * canvas.height;
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(
          i * barWidth,
          canvas.height - barHeight,
          barWidth - 1,
          barHeight
        );
      });
    };

    draw();

    return () => {
      audioContext.close();
    };
  }, [stream]);

  return <canvas ref={canvasRef} width={300} height={50} />;
}
