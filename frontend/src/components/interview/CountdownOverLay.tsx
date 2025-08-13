// src/components/interview/CountdownOverlay.tsx
import { useEffect } from "react"
import { useCountdown } from "@/hooks/useCountdown"

type Props = {
  /** 몇 초부터 시작할지 (기본: 3) */
  seconds?: number
  /** 0이 되었을 때 호출되는 콜백 */
  onDone: () => void
}

/**
 * 전체 화면 카운트다운 오버레이
 * - 숫자 표시만 담당 (부모 상태 변경은 렌더 중 절대 수행하지 않음)
 * - 완료 콜백은 렌더 이후 useEffect에서 한 번만 실행
 */
export default function CountdownOverlay({ seconds = 3, onDone }: Props) {
  // 훅은 숫자 계산만 담당 (타이머/클린업 내부 처리)
  const left = useCountdown(seconds)

  // 완료는 렌더 이후에만 호출
  useEffect(() => {
    if (left === 0) onDone()
  }, [left, onDone])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
      <div
        aria-live="assertive"
        className="text-white text-[120px] font-extrabold leading-none select-none"
      >
        {left}
      </div>
    </div>
  )
}
