// // src/components/interview/QuestionTTS.tsx
// import { useEffect, useRef, useState } from "react";
// import { useBrowserTTS, type Segment } from "@/hooks/useBrowserTTS";

// type Props = {
//   storageKey?: string;          // 기본 "lastQuestion" (localStorage에서 읽음)
//   autoplay?: boolean;           // 마운트 시 자동 재생
//   onQuestionEnd?: () => void;   // 재생 종료 후(지연 뒤) 콜백
//   onStart?: () => void;         // 재생 시작 콜백
//   onError?: (e: any) => void;   // 오류 콜백
//   lang?: string;                // 기본 "ko-KR"
//   voiceName?: string;           // 보이스 강제 선택
//   style?: "neutral" | "friendly" | "assertive"; // 말투 프리셋
//   delayMs?: number;             // 종료 → 다음 단계까지 대기 시간, 기본 3000ms
//   debug?: boolean;              // 콘솔 로그 토글
//   nonce?: number;               // 값이 바뀌면 재생 재시도 트리거
// };

// export default function QuestionTTS({
//   storageKey = "lastQuestion",
//   autoplay = true,
//   onQuestionEnd,
//   onStart,
//   onError,
//   lang = "ko-KR",
//   voiceName,
//   style = "neutral",
//   delayMs = 3000,
//   debug = false,
//   nonce = 0,
// }: Props) {
//   const { ready, speakSequence, cancel, userInteracted } = useBrowserTTS(lang);

//   // 레이스 컨디션 방지 토큰
//   const tokenRef = useRef(0);
//   // onend 지연 타이머
//   const timerRef = useRef<number | null>(null);

//   // 텍스트를 문장/절 단위로 분할하고 구간별 쉼을 삽입
//   const toSegments = (text: string): Segment[] => {
//     // 구두점 보존 분리 → 재조합
//     const parts = text
//       .split(/([.?!…]|,|:|;)/g)
//       .reduce<string[]>((acc, cur) => {
//         if (!acc.length) return [cur];
//         const last = acc.pop()!;
//         acc.push(last + cur);
//         return acc;
//       }, [])
//       .map(s => s.trim())
//       .filter(Boolean);

//     // 스타일별 기본값
//     const preset = {
//       neutral:  { rate: 0.97, pitch: 0.98, pause: 180 },
//       friendly: { rate: 1.01, pitch: 1.02, pause: 150 },
//       assertive:{ rate: 0.99, pitch: 0.96, pause: 160 },
//     }[style];

//     return parts.map((p, i) => ({
//       text: p,
//       rate: preset.rate,
//       pitch: preset.pitch,
//       pauseMs: i === parts.length - 1 ? 0 : preset.pause,
//     }));
//   };

//   useEffect(() => {
//     console.log("[QuestionTTS] useEffect 시작:", { autoplay, ready, storageKey, lang, voiceName, style });
    
//     // 이전 타이머 정리
//     if (timerRef.current) {
//       clearTimeout(timerRef.current);
//       timerRef.current = null;
//     }

//     if (!autoplay || !ready) {
//       console.log("[QuestionTTS] skip autoplay:", { autoplay, ready });
//       return;
//     }

//     // 즉시 재생 모드 - 인터랙션 체크 제거

//     const text = (localStorage.getItem(storageKey) || "").trim();
//     console.log("[QuestionTTS] localStorage에서 가져온 텍스트:", text);
    
//     if (!text) {
//       console.warn(`[QuestionTTS] '${storageKey}' 값이 비어있음`);
//       return;
//     }

//     const my = ++tokenRef.current;
//     const segments = toSegments(text);
//     console.log("[QuestionTTS] 생성된 segments:", segments);

//     // 새 시퀀스 시작 전 큐/타이머 정리는 hook의 speakSequence에서 처리
//     (async () => {
//       try {
//         console.log("[QuestionTTS] speakSequence 시작 호출", { style, lang, voiceName, segments });
//         onStart?.();
//         await speakSequence(segments, { lang, voiceName });
//         if (tokenRef.current !== my) {
//           console.log("[QuestionTTS] 토큰 불일치로 중단됨");
//           return;
//         }
//         console.log("[QuestionTTS] speakSequence 완료 →", delayMs, "ms 대기");
//         timerRef.current = window.setTimeout(() => {
//           if (tokenRef.current !== my) return;
//           console.log("[QuestionTTS] onQuestionEnd 콜백 실행");
//           onQuestionEnd?.();
//           if (timerRef.current) {
//             clearTimeout(timerRef.current);
//             timerRef.current = null;
//           }
//         }, delayMs);
//       } catch (e) {
//         if (tokenRef.current !== my) return;
//         console.error("[QuestionTTS] speakSequence 에러", e);
//         // not-allowed 에러는 무시하고 다음 단계로 진행
//         if (e?.error !== 'not-allowed') {
//           onError?.(e);
//         } else {
//           console.warn("[QuestionTTS] TTS 차단됨 - 다음 단계로 진행");
//           // 차단되어도 콜백 실행하여 다음 단계 진행
//           setTimeout(() => {
//             if (tokenRef.current === my) {
//               onQuestionEnd?.();
//             }
//           }, delayMs);
//         }
//       }
//     })();

//     // 언마운트/의존 변경 시 정리
//     return () => {
//       tokenRef.current++;
//       if (timerRef.current) {
//         clearTimeout(timerRef.current);
//         timerRef.current = null;
//       }
//       cancel();
//     };
//     // ready가 true로 바뀌거나, nonce가 바뀌면 재시도됨
//   }, [autoplay, ready, storageKey, lang, voiceName, style, delayMs, debug, nonce, speakSequence, cancel, onQuestionEnd, onStart, onError]);



//   return null;
// }
