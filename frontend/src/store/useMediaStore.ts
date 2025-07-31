import { create } from "zustand";

type MediaStore = {
  micStream: MediaStream | null;
  cameraStream: MediaStream | null;
  setMicStream: (stream: MediaStream | null) => void;
  setCameraStream: (stream: MediaStream | null) => void;
  stopAll: () => void;
};

export const useMediaStore = create<MediaStore>((set, get) => ({
  micStream: null,
  cameraStream: null,
  setMicStream: (stream) => set({ micStream: stream }),
  setCameraStream: (stream) => set({ cameraStream: stream }),
  stopAll: () => {
    get()
      .micStream?.getTracks()
      .forEach((t) => t.stop());
    get()
      .cameraStream?.getTracks()
      .forEach((t) => t.stop());
    set({ micStream: null, cameraStream: null });
  },
}));
