import { useCallback, useEffect, useRef, useState } from 'react';
import { useInterviewAnswerStore } from '@/store/interviewAnswerStore';
import { type QuestionKey, type AnswerItem } from '@/types/interview';
import { sendFollowupAudio } from '@/api/interviewApi';
import { sendVideoUpload } from "@/api/interviewApi";

const extFromMime = (mt: string) =>
  mt.includes('webm') ? 'webm' : mt.includes('ogg') ? 'ogg' : 'wav';
interface ImageCapture {
  track: MediaStreamTrack;
  grabFrame(): Promise<ImageBitmap>;
  takePhoto?(photoSettings?: any): Promise<Blob>;
}
declare var ImageCapture: {
  prototype: ImageCapture;
  new (videoTrack: MediaStreamTrack): ImageCapture;
};
export function useAnswerRecorder({ 
  key, 
  maxDurationSec = 60,
  onUploadComplete,
  onInterviewFinished
}: { 
  key: QuestionKey; 
  maxDurationSec?: number;
  onUploadComplete?: () => void;
  onInterviewFinished?: () => void;
}) {
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
  // 캔버스 보내기
  const processedStreamRef = useRef<MediaStream | null>(null);    // 캔버스 30fps 스트림
  const drawTimerRef = useRef<number | null>(null);
  // 썸네일 추가
  const thumbBlobRef = useRef<Blob | null>(null);

  // 업로드 완료 상태 추적
  const [audioUploaded, setAudioUploaded] = useState(false);
  const [videoUploaded, setVideoUploaded] = useState(false);

  // 질문이 바뀔 때마다 녹음 상태 리셋
  useEffect(() => {
    // 기존 타이머 정리
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // 상태 초기화
    setIsRecording(false);
    setSeconds(0);
    setError(null);
    setAudioUploaded(false);
    setVideoUploaded(false);
    
    // 기존 레코더 정리
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (videoRecorderRef.current?.state === 'recording') {
      videoRecorderRef.current.stop();
    }
    
    // ref 초기화
    mediaRecorderRef.current = null;
    videoRecorderRef.current = null;
    chunksRef.current = [];
    videoChunksRef.current = [];
    
    // 카메라 스트림은 유지 (사용자가 명시적으로 동의한 환경)
  }, [key.sessionId, key.order, key.subOrder]);

  // 썸네일 함수
  const captureThumbFromStream = async (stream: MediaStream): Promise<Blob | null> => {
  const track = stream.getVideoTracks()[0];
  if (!track) return null;

  // ImageCapture 지원 시 우선 사용
  try {
    const win = window as any;
    if (win.ImageCapture && typeof win.ImageCapture === 'function') {
      const cap = new ImageCapture(track);
      const bitmap: ImageBitmap = await cap.grabFrame();

      const s = track.getSettings();
      const w = (s.width as number) ?? bitmap.width;
      const h = (s.height as number) ?? bitmap.height;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);

      return await new Promise<Blob | null>(res =>
        canvas.toBlob(b => res(b), 'image/jpeg', 0.9)
      );
    }
  } catch {}

  // B. 폴백: <video>에 스트림 바인딩 후 원본 크기로 캡처
  return await new Promise<Blob | null>((resolve, reject) => {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    // @ts-ignore
    v.srcObject = stream;

    v.onloadedmetadata = async () => {
      try {
        await v.play().catch(() => {});
        const w = v.videoWidth, h = v.videoHeight;
        if (!w || !h) return reject(new Error('영상 크기 확인 실패'));

        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d')!.drawImage(v, 0, 0, w, h);
        c.toBlob(b => resolve(b), 'image/jpeg', 0.9);
      } catch (err) { reject(err as Error); }
    };
    v.onerror = () => reject(new Error('video load error'));
  });
};



  const stop = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    // 잔여 버퍼 즉시 플러시 시도 후 정지
    try { mediaRecorderRef.current.requestData?.(); } catch {}
    try { videoRecorderRef.current?.requestData?.(); } catch {}
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
      // 썸네일
      const vtrack = stream.getVideoTracks()[0];
      try {
        await vtrack.applyConstraints({
          width: { exact: 960 },
          height: { exact: 540 },
          frameRate: { exact: 30 },
        });
      } catch { /* 미지원이면 협상된 값 사용 */ }


    // 비디오 값
    setVideoStream(stream);

   // 시작 시점 썸네일 캡쳐
    try {
      thumbBlobRef.current = await captureThumbFromStream(stream);
    } catch {
      thumbBlobRef.current = null;
    }

    
    // 캔버스 그리기 30fps
    const w = 960, h = 540;
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const vid = document.createElement('video'); vid.srcObject = stream; vid.muted = true; await vid.play();

    const draw = () => {
      ctx.save();
      ctx.translate(w, 0); ctx.scale(-1, 1); // ← 미러 필요시 활성화
      ctx.drawImage(vid, 0, 0, w, h);
      ctx.restore();
    };
    drawTimerRef.current = window.setInterval(draw, 1000/30); // **30fps 고정**
    const processed = canvas.captureStream(30);                // **30fps 스트림**
    const aTrack = stream.getAudioTracks()[0];
    if (aTrack) processed.addTrack(aTrack);
    processedStreamRef.current = processed;

    // 캔버스 끝

    // 오디오 전용
    const audioOnly = new MediaStream(stream.getAudioTracks());
    const mr = new MediaRecorder(audioOnly);
    chunksRef.current = [];

    mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };

    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType });
      
      // webm -> wav 변환
      const arrayBuf = await blob.arrayBuffer();
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      const audioCtx = new AudioCtx()
      
      const decoded: AudioBuffer = await new Promise((resolve, reject) =>
        audioCtx.decodeAudioData(arrayBuf.slice(0), resolve, reject)
      );

    function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const bitsPerSample = 16;
        const samples = buffer.length;

        const blockAlign = (numChannels * bitsPerSample) >> 3;
        const byteRate = sampleRate * blockAlign;
        const dataSize = samples * blockAlign;

        const ab = new ArrayBuffer(44 + dataSize);
        const view = new DataView(ab);

        const writeString = (off: number, s: string) => {
          for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
        };

        // RIFF/WAVE 헤더
        writeString(0, "RIFF");
        view.setUint32(4, 36 + dataSize, true);
        writeString(8, "WAVE");
        writeString(12, "fmt ");
        view.setUint32(16, 16, true); // PCM
        view.setUint16(20, 1, true);  // PCM format
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        writeString(36, "data");
        view.setUint32(40, dataSize, true);

        // PCM interleave (float32 -> int16)
        const channels: Float32Array[] = [];
        for (let ch = 0; ch < numChannels; ch++) channels.push(buffer.getChannelData(ch));
        let offset = 44;
        for (let i = 0; i < samples; i++) {
          for (let ch = 0; ch < numChannels; ch++) {
            const x = Math.max(-1, Math.min(1, channels[ch][i]));
            view.setInt16(offset, x < 0 ? x * 0x8000 : x * 0x7fff, true);
            offset += 2;
          }
        }
        return ab;
      }

      const wavAB = audioBufferToWav(decoded);
      audioCtx.close?.();
      const wavBlob = new Blob([wavAB], { type: "audio/wav" });

      // webm -> wav 변환 끝


      const localUrl = URL.createObjectURL(wavBlob);
      const now = new Date().toISOString();

      // 저장은 안 하지만, UI 미리듣기와 상태표시를 위해 pending만 기록
      setLocalPending({
        key, localBlobUrl: localUrl, durationSec: seconds,
        mimeType: "audio/wav", createdAt: now, syncStatus: 'pending',
      } as AnswerItem);

      try {
        abortRef.current = new AbortController();
        const order = localStorage.getItem("currentOrder");
        const subOrder = localStorage.getItem("currentSubOrder");
        const sessionId = localStorage.getItem("interviewSessionId");
        const fileName = `answer_${sessionId}_o${order}_s${subOrder}_${Date.now()}.wav`;
        const file = new File([wavBlob], fileName, { type: "audio/wav" });
        console.log("audiofile=======",file);
        const result = await sendFollowupAudio({
          sessionId: key.sessionId,
          order1: key.order,
          subOrder: key.subOrder,
          audio: file,
        });

        // 면접 완료 체크
        if (result?.finished) {
          console.log("🎉 useAnswerRecorder: 면접 완료 감지!");
          onInterviewFinished?.();
          return; // 더 이상 진행하지 않음
        }

        // 응답 바디가 없다 → 성공만 표기
        markSynced(key, {});
        setAudioUploaded(true);
      } catch (e: any) {
        setError(e?.message ?? 'upload failed');
        markFailed(key, e?.message ?? 'upload failed');
      } finally {
        abortRef.current = null;
      }
    }

      // 비디오 저장
      // let videoMR = new MediaRecorder(stream);
    let webmOptions: MediaRecorderOptions | undefined;
    const tryMime = (mt: string) => (window as any).MediaRecorder?.isTypeSupported?.(mt);
    if (tryMime?.('video/webm;codecs=vp8')) webmOptions = { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 1_500_000, audioBitsPerSecond: 128_000 };
    else if (tryMime?.('video/webm')) webmOptions = { mimeType: 'video/webm', videoBitsPerSecond: 1_500_000, audioBitsPerSecond: 128_000 };
    else webmOptions = { videoBitsPerSecond: 1_500_000, audioBitsPerSecond: 128_000 };

      let videoMR = new MediaRecorder(processed, webmOptions);

      videoRecorderRef.current = videoMR;
      videoChunksRef.current = [];
      videoMR.ondataavailable = (e) => { if (e.data.size) videoChunksRef.current.push(e.data); };

      videoMR.onstop = async () => {
          // 현재 video track fps 확인
      const vTrack = processedStreamRef.current?.getVideoTracks()[0];
      if (vTrack) {
        const settings = vTrack.getSettings();
        console.log("[녹화 FPS]", settings.frameRate ?? "알 수 없음");
      }
        const usedMime = videoMR.mimeType || 'video/webm';
          const vblob = new Blob(videoChunksRef.current, { type: usedMime});
          if(vblob.size===0){
            console.warn('녹화 비디오 없음')
            return;
          }
          const order = localStorage.getItem("currentOrder");
          const subOrder = localStorage.getItem("currentSubOrder");
        
          const file = new File([vblob],
            `${order}_${subOrder}.webm`,
            { type: usedMime }
          )
          const calibData = localStorage.getItem("gaze_calibration_data");
          const formData = new FormData();
          formData.append("file", file);
          formData.append("interviewSessionId", localStorage.getItem("interviewSessionId") ?? "");
          formData.append("order", order ?? "0" );
          formData.append("subOrder", subOrder ?? "0");
          formData.append("calibDataJson", JSON.stringify(calibData));


          const thumb = thumbBlobRef.current;
          if (thumb) {
            const thumbFile = new File(
              [thumb],
              `${order}_${subOrder}.jpg`,
              { type: "image/jpeg" }
            );
            formData.append("thumbnail", thumbFile)
          }

          // 동영상 전송 후 url return
          const urls = await sendVideoUpload(formData);
          console.log("==========비디오 레츠고 ======", urls);


          // 카메라를 항상 유지: 트랙/스트림은 유지하고 레코더만 정리
          videoRecorderRef.current = null;

          if (drawTimerRef.current) { clearInterval(drawTimerRef.current); drawTimerRef.current = null; }
          processedStreamRef.current = null;

        };
    
    mr.start(100);
    //비디오
    videoMR.start(100);
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setSeconds(0);

    timerRef.current = window.setInterval(() => {
      setSeconds((s) => { const n = s + 1; if (n >= maxDurationSec) stop(); return n; });
    }, 1000);
  }, [maxDurationSec, setLocalPending, markSynced, markFailed, stop]);

  useEffect(() => {
    if (onUploadComplete && audioUploaded && videoUploaded) {
      onUploadComplete();
    }
  }, [audioUploaded, videoUploaded, onUploadComplete]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    if (videoRecorderRef.current?.state === 'recording') videoRecorderRef.current.stop();
    if (drawTimerRef.current) { clearInterval(drawTimerRef.current); drawTimerRef.current = null; }
  }, []);

  return { start, stop, isRecording, seconds, error, videoStream };
}
