import { useCallback, useEffect, useRef, useState } from "react";

export type SpeakOptions = {
  lang?: string;
  voiceName?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onstart?: () => void;
  onend?: () => void;
  onerror?: (e: any) => void;
};

export type Segment = {
  text: string;
  pauseMs?: number;
  rate?: number;
  pitch?: number;
};

export function useBrowserTTS(defaultLang = "ko-KR") {
  const synthRef = useRef(window.speechSynthesis);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const list = synthRef.current.getVoices();
      if (list.length > 0) {
        setVoices(list);
        setReady(true);
      }
    };
    loadVoices();
    (window.speechSynthesis as any).onvoiceschanged = loadVoices;
    return () => { (window.speechSynthesis as any).onvoiceschanged = null; };
  }, []);

  const pickVoice = useCallback((lang?: string, voiceName?: string) => {
    const targetLang = lang ?? defaultLang;
    if (voiceName) {
      const v = voices.find(v => v.name === voiceName);
      if (v) return v;
    }
    const prefer = voices.find(v => v.lang?.startsWith(targetLang) && /Microsoft|Natural|Neural/i.test(v.name));
    return prefer ?? voices.find(v => v.lang?.startsWith(targetLang)) ?? null;
  }, [voices, defaultLang]);

  const speak = useCallback((text: string, opts: SpeakOptions = {}) => {
    if (!text?.trim()) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = opts.lang ?? defaultLang;
    const voice = pickVoice(utter.lang, opts.voiceName);
    if (voice) utter.voice = voice;
    utter.rate = opts.rate ?? 0.97;
    utter.pitch = opts.pitch ?? 0.98;
    if (opts.volume !== undefined) utter.volume = opts.volume;
    if (opts.onstart) utter.onstart = opts.onstart;
    if (opts.onend) utter.onend = opts.onend;
    if (opts.onerror) utter.onerror = opts.onerror;
    synthRef.current.speak(utter);
  }, [defaultLang, pickVoice]);

  // ✅ 추가: 여러 구간을 이어서 말하기
  const speakSequence = useCallback(async (segments: Segment[], opts: Omit<SpeakOptions, "rate"|"pitch"> = {}) => {
    return new Promise<void>((resolve, reject) => {
      let i = 0;
      const next = () => {
        if (i >= segments.length) { resolve(); return; }
        const seg = segments[i++];
        speak(seg.text, {
          ...opts,
          rate: seg.rate ?? 0.97,
          pitch: seg.pitch ?? 0.98,
          onend: () => seg.pauseMs ? setTimeout(next, seg.pauseMs) : next(),
          onerror: reject,
        });
      };
      synthRef.current.cancel();
      next();
    });
  }, [speak]);

  const cancel = useCallback(() => synthRef.current.cancel(), []);
  const pause = useCallback(() => synthRef.current.pause(), []);
  const resume = useCallback(() => synthRef.current.resume(), []);

  // ✅ 반드시 포함
  return { ready, voices, speak, speakSequence, cancel, pause, resume };
}
