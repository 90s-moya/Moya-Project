import { Button } from '@/components/ui/button';
import { type QuestionKey } from '@/types/interview';
import { useInterviewAnswerStore } from '@/store/interviewAnswerStore';
import { useEffect, useRef } from 'react';

type Props = {
  keyInfo: QuestionKey;
  // TTS 컴포넌트에서 내려주는 완료 플래그
  ttsFinished: boolean;
  // 상위에서 내려받은 녹음 제어/상태
  start: () => void;
  stop: () => void;
  isRecording: boolean;
  error: string | null;
  videoStream: MediaStream | null;
};

export default function AnswerRecorder({ keyInfo, ttsFinished, start, stop, isRecording, error, videoStream }: Props) {
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
      } catch {
        // 비디오 재생 실패는 무시 (자동 재생 정책 등)
      }
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
        {/* 시작 버튼 삭제, 종료만 남김 */}
        {/* {isRecording && (
          <Button variant="destructive" onClick={stop}>
            녹음 종
          </Button>
              

        )} */}

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

    </div>
  );
}
