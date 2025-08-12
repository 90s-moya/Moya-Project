// src/types/interview.ts

export type SessionId = string;

export type QuestionKey = {
  sessionId: SessionId;
  order: number;     // 1~3
  subOrder: number;  // 0~2
};

export type AnswerSyncStatus = 'pending' | 'synced' | 'failed';

export type AnswerItem = {
  key: QuestionKey;
  // 로컬 재생용 임시 URL(Blob → objectURL)
  localBlobUrl?: string;
  // 서버가 돌려준 최종 접근 URL(S3 presigned, CDN 등)
  audioUrl?: string;
  // 서버 측 식별자
  answerId?: string;
  durationSec?: number;
  mimeType?: string;
  createdAt: string; // ISO
  syncStatus: AnswerSyncStatus;
  errorMessage?: string;
};

// (sessionId, order, subOrder) → 문자열 키
export const makeKeyId = (k: QuestionKey) =>
  `${k.sessionId}:o${k.order}-s${k.subOrder}`;