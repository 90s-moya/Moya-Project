import { create } from "zustand";

interface FileState {
  resume: File | null;
  introduction: File | null;
  portfolio: File | null;
  setFile: (
    type: "resume" | "introduction" | "portfolio",
    file: File | null
  ) => void;
}

export const useFileStore = create<FileState>((set) => ({
  resume: null,
  introduction: null,
  portfolio: null,

  setFile: (type, file) => set({ [type]: file }),
}));
