// src/components/interview/QuestionTTS.tsx
import { useEffect, useRef } from "react";
import { useBrowserTTS, type Segment } from "@/hooks/useBrowserTTS";

type Props = {
  storageKey?: string;          // 기본 "lastQuestion" (localStorage에서 읽음)
  autoplay?: boolean;           // 마운트 시 자동 재생
  onQuestionEnd?: () => void;   // 재생 종료 후(지연 뒤) 콜백
  onStart?: () => void;         // 재생 시작 콜백
  onError?: (e: any) => void;   // 오류 콜백
  lang?: string;                // 기본 "ko-KR"
  voiceName?: string;           // 보이스 강제 선택
  style?: "neutral" | "friendly" | "assertive"; // 말투 프리셋
  delayMs?: number;             // 종료 → 다음 단계까지 대기 시간, 기본 3000ms
  debug?: boolean;              // 콘솔 로그 토글
  nonce?: number;               // 값이 바뀌면 재생 재시도 트리거
};

export default function QuestionTTS({
  storageKey = "lastQuestion",
  autoplay = true,
  onQuestionEnd,
  onStart,
  onError,
  lang = "ko-KR",
  voiceName,
  style = "neutral",
  delayMs = 3000,
  debug = false,
  nonce = 0,
}: Props) {
  const { ready, speakSequence, cancel } = useBrowserTTS(lang);

  // 레이스 컨디션 방지 토큰
  const tokenRef = useRef(0);
  // onend 지연 타이머
  const timerRef = useRef<number | null>(null);

  // 텍스트를 문장/절 단위로 분할하고 구간별 쉼을 삽입
  const toSegments = (text: string): Segment[] => {
    // 구두점 보존 분리 → 재조합
    const parts = text
      .split(/([.?!…]|,|:|;)/g)
      .reduce<string[]>((acc, cur) => {
        if (!acc.length) return [cur];
        const last = acc.pop()!;
        acc.push(last + cur);
        return acc;
      }, [])
      .map(s => s.trim())
      .filter(Boolean);

    // 스타일별 기본값
    const preset = {
      neutral:  { rate: 0.97, pitch: 0.98, pause: 180 },
      friendly: { rate: 1.01, pitch: 1.02, pause: 150 },
      assertive:{ rate: 0.99, pitch: 0.96, pause: 160 },
    }[style];

    return parts.map((p, i) => ({
      text: p,
      rate: preset.rate,
      pitch: preset.pitch,
      pauseMs: i === parts.length - 1 ? 0 : preset.pause,
    }));
  };

  useEffect(() => {
    // 이전 타이머 정리
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!autoplay || !ready) {
      if (debug) console.log("[QuestionTTS] skip autoplay:", { autoplay, ready });
      return;
    }

    const text = (localStorage.getItem(storageKey) || "").trim();
    if (!text) {
      if (debug) console.warn(`[QuestionTTS] '${storageKey}' 값이 비어있음`);
      return;
    }

    const my = ++tokenRef.current;
    const segments = toSegments(text);

    // 새 시퀀스 시작 전 큐/타이머 정리는 hook의 speakSequence에서 처리
    (async () => {
      try {
        if (debug) console.log("[QuestionTTS] speakSequence start", { style, lang, voiceName, segments });
        onStart?.();
        await speakSequence(segments, { lang, voiceName });
        if (tokenRef.current !== my) return;
        if (debug) console.log("[QuestionTTS] speakSequence end →", delayMs, "ms 대기");
        timerRef.current = window.setTimeout(() => {
          if (tokenRef.current !== my) return;
          onQuestionEnd?.();
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }, delayMs);
      } catch (e) {
        if (tokenRef.current !== my) return;
        if (debug) console.error("[QuestionTTS] speakSequence error", e);
        onError?.(e);
      }
    })();

    // 언마운트/의존 변경 시 정리
    return () => {
      tokenRef.current++;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      cancel();
    };
    // ready가 true로 바뀌거나, nonce가 바뀌면 재시도됨
  }, [autoplay, ready, storageKey, lang, voiceName, style, delayMs, debug, nonce, speakSequence, cancel, onQuestionEnd, onStart, onError]);

  return null;
}
