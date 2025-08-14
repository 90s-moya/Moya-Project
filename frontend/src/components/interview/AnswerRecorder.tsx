import { Button } from '@/components/ui/button';
import { useAnswerRecorder } from '@/lib/recording/useAnswerRecorder';
import { type QuestionKey } from '@/types/interview';
import { useInterviewAnswerStore } from '@/store/interviewAnswerStore';
import { useEffect, useRef } from 'react';

type Props = {
  keyInfo: QuestionKey;
  // TTS 컴포넌트에서 내려주는 완료 플래그
  ttsFinished: boolean;
};

export default function AnswerRecorder({ keyInfo, ttsFinished }: Props) {
  const { start, stop, isRecording, seconds, error, videoStream } =
    useAnswerRecorder({ key: keyInfo });
  const saved = useInterviewAnswerStore((s) => s.getByKey(keyInfo));

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // TTS 종료 후 3초 뒤 자동 녹음 시작
  useEffect(() => {
    if (!ttsFinished) return;
    const timer = setTimeout(() => {
      // 이미 녹음 중이면 중복 호출 방지
      if (!isRecording) start();
    }, 3000);
    return () => clearTimeout(timer);
  }, [ttsFinished, isRecording, start]);

  // 카메라 스트림 바인딩
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoStream) return;

    el.srcObject = videoStream as MediaStream;

    const play = async () => {
      try {
        await el.play();
      } catch {}
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

        {/* 시작 버튼 삭제, 종료만 남김 */}
        {isRecording && (
          <Button variant="destructive" onClick={stop}>
            녹음 종료
          </Button>
        )}

        {error && <span className="text-red-600 text-xs">{error}</span>}
        {saved?.syncStatus === 'synced' && (
          <span className="text-green-600 text-xs">전송 완료</span>
        )}
      </div>

      {/* 카메라 프리뷰 */}
      {videoStream && (
        <video
          id="answer-preview"
          ref={videoRef}
          className="mt-3 w-full aspect-video rounded-md bg-black"
          autoPlay
          muted
          playsInline
          style={{ transform: "scaleX(-1)" }}
        />
      )}

      {/* 로컬 미리듣기 */}
      {saved?.localBlobUrl && (
        <audio className="mt-2 w-full" controls src={saved.localBlobUrl} />
      )}
    </div>
  );
}
