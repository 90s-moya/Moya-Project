// src/components/interview/CountdownOverlay.tsx
import { useEffect } from "react"
import { useCountdown } from "@/hooks/useCountdown"

type Props = {
  seconds?: number
  onDone: () => void
}

/**
 * 전체 화면 카운트다운 오버레이 (기능 동일)
 * - CSS만 커스텀: 파스텔 백그라운드, 캐릭터 응원, 팝 애니메이션
 */
export default function CountdownOverlay({ seconds = 3, onDone }: Props) {
  const left = useCountdown(seconds)

  useEffect(() => {
    if (left === 0) onDone()
  }, [left, onDone])

  return (
    <div className="countdown-overlay fixed inset-0 z-[100] flex items-center justify-center">
      <div aria-live="assertive" className="countdown-number select-none">
        {left}
      </div>

      {/* CSS only */}
      <style>{`
        /* 배경 전체 */
        .countdown-overlay {
          background: radial-gradient(1200px 600px at 50% 20%, rgba(99,102,241,0.25), transparent 60%),
                      radial-gradient(1000px 500px at 20% 80%, rgba(59,130,246,0.22), transparent 60%),
                      rgba(2,6,23,0.75); /* slate-900/75 비슷 */
          backdrop-filter: blur(6px);
          overflow: hidden;
        }

        /* 왼쪽/오른쪽 캐릭터 */
        .countdown-overlay::before,
        .countdown-overlay::after {
          content: "";
          position: absolute;
          bottom: 6%;
          width: 120px;
          height: 120px;
          background-image: url('/assets/images/clover.png'); /* public 기준 경로 */
          background-size: contain;
          background-repeat: no-repeat;
          filter: drop-shadow(0 8px 16px rgba(59,130,246,0.35));
          animation: bob 2.4s ease-in-out infinite;
          opacity: 0.95;
        }
        .countdown-overlay::before { left: 6%; transform: rotate(-6deg); }
        .countdown-overlay::after  { right: 6%; transform: scaleX(-1) rotate(-6deg); animation-delay: .6s; }

        @keyframes bob {
          0%,100% { transform: translateY(0) rotate(-6deg); }
          50%     { transform: translateY(-8px) rotate(-6deg); }
        }

        /* 중앙 숫자 */
        .countdown-number {
          font-weight: 900;
          font-size: clamp(72px, 16vw, 160px);
          line-height: 1;
          letter-spacing: -0.02em;
          background: linear-gradient(90deg, #2563eb, #4f46e5, #06b6d4);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow:
            0 8px 28px rgba(99,102,241,0.45),
            0 2px 8px rgba(30,58,138,0.4);
          animation: pop 900ms ease-out infinite;
          position: relative;
        }

        /* 숫자 뒤 아우라/링 */
        .countdown-number::before {
          content: "";
          position: absolute;
          inset: -28px;
          border-radius: 9999px;
          background:
            radial-gradient(closest-side, rgba(99,102,241,0.38), transparent 70%),
            conic-gradient(from 0deg, rgba(59,130,246,0.3), rgba(99,102,241,0.2), rgba(6,182,212,0.25), rgba(59,130,246,0.3));
          filter: blur(10px);
          z-index: -1;
          animation: spin 8s linear infinite;
          pointer-events: none;
        }

        @keyframes pop {
          0%   { transform: scale(0.92); }
          40%  { transform: scale(1.04); }
          100% { transform: scale(1.00); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* 작은 반짝이(보케) */
        .countdown-overlay {
          --spark: radial-gradient(circle at center, rgba(255,255,255,0.9) 0 2px, transparent 3px);
          background-image:
            radial-gradient(1200px 600px at 50% 20%, rgba(99,102,241,0.25), transparent 60%),
            radial-gradient(1000px 500px at 20% 80%, rgba(59,130,246,0.22), transparent 60%),
            rgba(2,6,23,0.75),
            var(--spark), var(--spark), var(--spark), var(--spark), var(--spark), var(--spark);
          background-position:
            center, center, center,
            12% 18%, 86% 24%, 74% 78%, 20% 72%, 50% 88%;
          background-size:
            auto, auto, auto,
            6px 6px, 6px 6px, 6px 6px, 6px 6px, 6px 6px;
        }

        @media (max-width: 480px) {
          .countdown-overlay::before,
          .countdown-overlay::after {
            width: 84px; height: 84px; bottom: 4%;
          }
        }
      `}</style>
    </div>
  )
}
