import { create, type StateCreator } from 'zustand';
import { persist, createJSONStorage, type StorageValue } from 'zustand/middleware';
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

/** v4 직렬화 포맷: 마지막 항목 한 건만 저장 */
type SerializedV4 = { state: AnswerItem | null };

/** v3 레거시 포맷들 호환용 타입 */
type LegacyV3Flat = { state: (Omit<AnswerItem, 'localBlobUrl'> & Partial<Pick<AnswerItem, 'localBlobUrl'>>) | null };
type LegacyV3Map = {
  state:
    | null
    | {
        answers: Record<string, AnswerItem>;
        lastId?: string;
      };
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

    /** v4 직렬화: 마지막 항목 한 건만 저장하며 localBlobUrl 포함 */
    serialize: (persisted: StorageValue<State>): string => {
      const s = persisted.state;
      const lastId = s.lastId ?? Object.keys(s.answers).pop();
      const item = lastId ? s.answers[lastId] : undefined;

      const payload: SerializedV4 = { state: item ?? null };
      return JSON.stringify(payload);
    },

    /** 역직렬화: v4 우선, v3(flat 또는 map) 포맷도 호환 */
    deserialize: (str: string): StorageValue<State> => {
      try {
        const raw = JSON.parse(str) as SerializedV4 | LegacyV3Flat | LegacyV3Map;

        // v4 또는 v3(flat) : { state: AnswerItem | null } 형태
        if ('state' in raw && (raw as SerializedV4 | LegacyV3Flat).state && !('answers' in (raw as any).state)) {
          const item = (raw as SerializedV4 | LegacyV3Flat).state as AnswerItem;
          const id = makeKeyId(item.key);
          return { state: { answers: { [id]: item }, lastId: id }, version: 4 };
        }

        // v3(map): { state: { answers, lastId } }
        if ('state' in raw && (raw as LegacyV3Map).state && 'answers' in (raw as LegacyV3Map).state!) {
          const legacy = (raw as LegacyV3Map).state!;
          const answers = legacy.answers ?? {};
          const lastId = legacy.lastId ?? Object.keys(answers).pop();

          if (!lastId || !answers[lastId]) {
            return { state: { answers: {}, lastId: undefined }, version: 4 };
          }
          const item = answers[lastId];
          const id = makeKeyId(item.key);
          return { state: { answers: { [id]: item }, lastId: id }, version: 4 };
        }

        // 빈 값이거나 알 수 없는 포맷
        return { state: { answers: {}, lastId: undefined }, version: 4 };
      } catch {
        return { state: { answers: {}, lastId: undefined }, version: 4 };
      }
    },
  })
);