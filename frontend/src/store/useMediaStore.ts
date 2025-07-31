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
  setMicStream: (stream) => set,
}));
