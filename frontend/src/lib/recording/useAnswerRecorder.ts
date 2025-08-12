import { useCallback, useEffect, useRef, useState } from 'react';
import { useInterviewAnswerStore } from '@/store/interviewAnswerStore';
import { type QuestionKey, type AnswerItem } from '@/types/interview';
import { sendFollowupAudio } from '@/api/interviewApi';

const extFromMime = (mt: string) =>
  mt.includes('webm') ? 'webm' : mt.includes('ogg') ? 'ogg' : 'wav';

export function useAnswerRecorder({ key, maxDurationSec = 60 }: { key: QuestionKey; maxDurationSec?: number; }) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 로컬 미리듣기/상태표시 용(원치 않으면 스토어 관련 전부 제거 가능)
  const setLocalPending = useInterviewAnswerStore((s) => s.setLocalPending);
  const markSynced = useInterviewAnswerStore((s) => s.markSynced);
  const markFailed = useInterviewAnswerStore((s) => s.markFailed);

  const stop = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    mediaRecorderRef.current.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];

    mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };

    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType });
      const localUrl = URL.createObjectURL(blob);
      const now = new Date().toISOString();

      // 저장은 안 하지만, UI 미리듣기와 상태표시를 위해 pending만 기록
      setLocalPending({
        key, localBlobUrl: localUrl, durationSec: seconds,
        mimeType: mr.mimeType, createdAt: now, syncStatus: 'pending',
      } as AnswerItem);

      try {
        abortRef.current = new AbortController();
        const fileName = `answer_${key.sessionId}_o${key.order}_s${key.subOrder}_${Date.now()}.${extFromMime(mr.mimeType)}`;
        const file = new File([blob], fileName, { type: mr.mimeType });

        await sendFollowupAudio({
          sessionId: key.sessionId,
          order: key.order,
          subOrder: key.subOrder,
          audio: file,
        });

        // 응답 바디가 없다 → 성공만 표기
        markSynced(key, {});
      } catch (e: any) {
        setError(e?.message ?? 'upload failed');
        markFailed(key, e?.message ?? 'upload failed');
      } finally {
        abortRef.current = null;
        stream.getTracks().forEach((t) => t.stop());
      }
    };

    mr.start(100);
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setSeconds(0);

    timerRef.current = window.setInterval(() => {
      setSeconds((s) => { const n = s + 1; if (n >= maxDurationSec) stop(); return n; });
    }, 1000);
  }, [key, maxDurationSec, setLocalPending, markSynced, markFailed, seconds, stop]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  }, []);

  return { start, stop, isRecording, seconds, error };
}
