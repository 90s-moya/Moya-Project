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
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const saved = useInterviewAnswerStore((s) => s.getByKey(keyInfo));

  // 자동 녹음 시작 로직 제거 - 사용자가 명시적으로 버튼을 눌러야만 시작

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
