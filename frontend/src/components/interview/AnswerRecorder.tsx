import { Button } from '@/components/ui/button';
import { useAnswerRecorder } from '@/lib/recording/useAnswerRecorder';
import { type QuestionKey } from '@/types/interview';
import { useInterviewAnswerStore } from '@/store/interviewAnswerStore';

export default function AnswerRecorder({ keyInfo }: { keyInfo: QuestionKey }) {
  const { start, stop, isRecording, seconds, error } = useAnswerRecorder({ key: keyInfo });
  const saved = useInterviewAnswerStore((s) => s.getByKey(keyInfo));

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

      {/* 선택: 로컬 미리듣기 */}
      {saved?.localBlobUrl && (
        <audio className="mt-2 w-full" controls src={saved.localBlobUrl} />
      )}
    </div>
  );
}
