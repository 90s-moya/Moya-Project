import { Button } from '@/components/ui/button';
import { useAnswerRecorder } from '@/lib/recording/useAnswerRecorder';
import { type QuestionKey } from '@/types/interview';
import { useInterviewAnswerStore } from '@/store/interviewAnswerStore';
import { useEffect, useRef } from 'react';

export default function AnswerRecorder({ keyInfo }: { keyInfo: QuestionKey }) {
  const { start, stop, isRecording, seconds, error, videoStream } = useAnswerRecorder({ key: keyInfo });
  const saved = useInterviewAnswerStore((s) => s.getByKey(keyInfo));
  // 비디오 
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoStream) return;
    // 스트림 바인딩
    el.srcObject = videoStream;
    // 2) 재생 트리거
      const play = async () => {
        try { await el.play(); } catch {}
      };
      if (el.readyState >= 2) play();
      else el.onloadedmetadata = play;

    return () => {
      if (el) {
        el.onloadedmetadata = null;
        el.srcObject = null;
      }
    };
  }, [videoStream]);


  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="text-sm tabular-nums">{seconds}s</div>
        {isRecording
          ? <Button variant="destructive" onClick={stop}>녹음 종료</Button>
          : <Button onClick={start}>녹음 시작</Button>}
        {error && <span className="text-red-600 text-xs">{error}</span>}
        {saved?.syncStatus === 'synced' && <span className="text-green-600 text-xs">전송 완료</span>}
      </div>
      {/* ▼ 카메라 프리뷰: 녹음 시작하면 바로 여기(InterviewScreen의 AnswerRecorder 자리)에서 보임 */}
      {videoStream && (
        <video
          id="answer-preview"
          ref={videoRef}
          className="mt-3 w-full aspect-video rounded-md bg-black"
          autoPlay
          muted
          playsInline
        />
      )}
      {/* 선택: 로컬 미리듣기 */}
      {saved?.localBlobUrl && (
        <audio className="mt-2 w-full" controls src={saved.localBlobUrl} />
      )}
    </div>
  );
}
