import { create, type StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type AnswerItem as BaseAnswerItem, type QuestionKey, makeKeyId } from '@/types/interview';

/** ===== 로컬 스토어 전용 확장 타입 ===== */
type AnswerItem = BaseAnswerItem & {
  syncStatus?: 'pending' | 'synced' | 'failed';
  errorMessage?: string;
  localBlobUrl?: string;
};

type State = {
  answers: Record<string, AnswerItem>;
  lastId?: string; // 마지막으로 갱신된 항목의 id
  setLocalPending: (item: AnswerItem) => void;
  markSynced: (key: QuestionKey, patch: Partial<AnswerItem>) => void;
  markFailed: (key: QuestionKey, errorMessage: string) => void;
  getByKey: (key: QuestionKey) => AnswerItem | undefined;
  clearSession: (sessionId: string) => void;
};

// Persist할 데이터만 포함하는 타입
type PersistedState = {
  answers: Record<string, AnswerItem>;
  lastId?: string;
};

const creator: StateCreator<State> = (set, get) => ({
  answers: {},

  setLocalPending: (item) => {
    const id = makeKeyId(item.key);
    set((s) => ({
      answers: { ...s.answers, [id]: item },
      lastId: id,
    }));
  },

  markSynced: (key, patch) => {
    const id = makeKeyId(key);
    const cur = get().answers[id];
    if (!cur) return;
    set((s) => ({
      answers: {
        ...s.answers,
        [id]: { ...cur, ...patch, syncStatus: 'synced', errorMessage: undefined },
      },
      lastId: id,
    }));
  },

  markFailed: (key, errorMessage) => {
    const id = makeKeyId(key);
    const cur = get().answers[id];
    if (!cur) return;
    set((s) => ({
      answers: {
        ...s.answers,
        [id]: { ...cur, syncStatus: 'failed', errorMessage },
      },
      lastId: id,
    }));
  },

  getByKey: (key) => {
    const id = makeKeyId(key);
    return get().answers[id];
  },

  clearSession: (sessionId) => {
    set((s) => {
      const next: Record<string, AnswerItem> = {};
      for (const [k, v] of Object.entries(s.answers)) {
        if (!k.startsWith(`${sessionId}:`)) next[k] = v;
        else if (v.localBlobUrl) URL.revokeObjectURL(v.localBlobUrl);
      }
      const lastId = s.lastId && next[s.lastId] ? s.lastId : Object.keys(next).pop();
      return { answers: next, lastId };
    });
  },
});

export const useInterviewAnswerStore = create<State>()(
  persist(creator, {
    name: 'interview-answers-v1',
    version: 4,
    storage: createJSONStorage((): Storage => localStorage),
    // persist할 상태만 선택
    partialize: (state): PersistedState => ({
      answers: state.answers,
      lastId: state.lastId,
    }),
  })
);