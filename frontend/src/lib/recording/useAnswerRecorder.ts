import { useCallback, useEffect, useRef, useState } from 'react';
import { useInterviewAnswerStore } from '@/store/interviewAnswerStore';
import { type QuestionKey, type AnswerItem } from '@/types/interview';
import { sendFollowupAudio } from '@/api/interviewApi';
import { sendVideoUpload } from "@/api/interviewApi";

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

  // 비디오 추가
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);


  const stop = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    mediaRecorderRef.current.stop();
    // 비디오도 멈춤
    if (videoRecorderRef.current?.state !== 'inactive') {
      videoRecorderRef.current?.stop();
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: true,
      video: {
        width: { ideal: 960, max: 960 },
        height: { ideal: 540, max: 540 },
        frameRate: { ideal: 30, max: 30 },
      }
      });
    // 비디오 값
    setVideoStream(stream);
    // 오디오 전용
    const audioOnly = new MediaStream(stream.getAudioTracks());
    const mr = new MediaRecorder(audioOnly);
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
          order1: key.order,
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
      }
    }

      // 비디오 저장
      let videoMR = new MediaRecorder(stream);

      videoRecorderRef.current = videoMR;
      videoChunksRef.current = [];
      videoMR.ondataavailable = (e) => { if (e.data.size) videoChunksRef.current.push(e.data); };

      videoMR.onstop = async () => {
          // 자동 저장(다운로드)만 수행
          const vmime = videoMR.mimeType || 'video/webm';
          const vblob = new Blob(videoChunksRef.current, { type: vmime });
          if(vblob.size===0){
            console.warn('녹화 비디오 없음')
            return;
          }
          
          // 다운로드용
          // const vname = `answer_video_${key.sessionId}_o${key.order}_s${key.subOrder}_${Date.now()}.webm`;
          // const url = URL.createObjectURL(vblob);

          // const a = document.createElement('a');
          // a.href = url;
          // a.download = vname;
          // document.body.appendChild(a);
          // a.click();
          // a.remove();
          // setTimeout(() => URL.revokeObjectURL(url), 10_000);
          
          const file = new File([vblob],
            `${key.order}_${key.subOrder}.webm`,
            {type:vmime}
          )

          const formData = new FormData();
          formData.append("file", file);
          formData.append("interviewSessionId", localStorage.getItem("interviewSessionId") ?? "");
          formData.append("order", String(key.order));
          formData.append("subOrder", String(key.subOrder))

          // 동영상 전송 후 url return
          const urls = await sendVideoUpload(formData);
          console.log("==========비디오 레츠고 ======", urls);


          // 카메라 끄기
          stream.getTracks().forEach((t) => t.stop());
          setVideoStream(null)

          videoRecorderRef.current = null;

        };
    
    mr.start(100);
    //비디오
    videoMR.start(250);
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setSeconds(0);

    timerRef.current = window.setInterval(() => {
      setSeconds((s) => { const n = s + 1; if (n >= maxDurationSec) stop(); return n; });
    }, 1000);
  }, [key, maxDurationSec, setLocalPending, markSynced, markFailed, seconds, stop, seconds]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  }, []);

  return { start, stop, isRecording, seconds, error, videoStream };
}
