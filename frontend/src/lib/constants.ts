// 공통 등급 스케일 (답변 완성도 / 불용어 사용 공용)
export const QUALITY_SCALE_MAP = {
  OUTSTANDING: '우수',
  NORMAL: '양호',
  INADEQUATE: '미흡',
} as const;

export type QualityScaleType = keyof typeof QUALITY_SCALE_MAP;

export const getQualityText = (type: QualityScaleType): string => {
  return QUALITY_SCALE_MAP[type] || String(type);
};

// SpeedType 정의 (SPEED_RANGES에서 추출)
export type SpeedType = typeof SPEED_RANGES[number]['speedType'];

// SPEED_RANGES를 기반으로 한 getSpeedText 함수
export const getSpeedText = (type: SpeedType): string => {
  const range = SPEED_RANGES.find(r => r.speedType === type);
  return range?.label || String(type);
};

// 불린 상태 텍스트
export const getBooleanStatusText = (status: boolean): string => {
  return status ? '우수' : '미흡';
};

// 불린 상태에 따른 아이콘과 색상 정보
export const getBooleanStatusConfig = (status: boolean) => {
  const text = getBooleanStatusText(status);
  if (status) {
    return {
      text,
      iconColor: 'text-green-500',
      textColor: 'text-green-600',
      iconName: 'Smile'
    };
  } else {
    return {
      text,
      iconColor: 'text-red-500',
      textColor: 'text-red-600',
      iconName: 'Frown'
    };
  }
};

// 통합된 속도/구간 설정 (말하기 속도 + 음절 아티큘레이션 공용)
export const SPEED_RANGES = [
  { 
    start: 0, 
    end: 3.6, 
    label: '느림', 
    color: '#FFE4E6', // rose-100
    speedType: 'SLOW' as const
  },
  { 
    start: 3.6, 
    end: 4.0, 
    label: '조금 느림', 
    color: '#FEF3C7', // amber-100
    speedType: 'SLIGHTLY_SLOW' as const
  },
  { 
    start: 4.0, 
    end: 4.6, 
    label: '적정', 
    color: '#DCFCE7', // green-100
    speedType: 'NORMAL' as const
  },
  { 
    start: 4.6, 
    end: 5.2, 
    label: '조금 빠름', 
    color: '#DBEAFE', // blue-100
    speedType: 'SLIGHTLY_FAST' as const
  },
  { 
    start: 5.2, 
    end: 8.0, 
    label: '빠름', 
    color: '#EDE9FE', // violet-100
    speedType: 'FAST' as const
  }
] as const;

// 차트용 상수
export const SPEED_CHART_CONFIG = {
  X_MIN: 0,
  X_MAX: 8.0,
  TICK_COUNT: 7
} as const;

// 값에 따른 구간 찾기
export const getSpeedRange = (value: number) => {
  return SPEED_RANGES.find(range => value >= range.start && value < range.end) || SPEED_RANGES[2]; // 기본값: 적정
};

// 값에 따른 라벨 반환
export const getSpeedLabel = (value: number): string => {
  const range = getSpeedRange(value);
  return range.label;
};

// 값에 따른 속도 타입 반환
export const getSpeedType = (value: number): SpeedType => {
  const range = getSpeedRange(value);
  return range.speedType;
};

// 자세 상태 매핑
export const POSTURE_STATUS_MAP = {
  'Good Posture': '바른 자세',
  'Shoulders Uneven': '자세 틀어짐',
  'Hands Above Shoulders': '불필요한 손동작',
} as const;

export type PostureStatusType = keyof typeof POSTURE_STATUS_MAP;

export const getPostureStatusText = (status: PostureStatusType): string => {
  return POSTURE_STATUS_MAP[status] || String(status);
};

// 자세 상태별 색상 매핑
export const POSTURE_COLOR_MAP = {
  'Good Posture': '#86EFAC',
  'Shoulders Uneven': '#FCD34D',
  'Hands Above Shoulders': '#FCA5A5',
} as const;

export const getPostureColor = (status: string): string => {
  return POSTURE_COLOR_MAP[status as PostureStatusType] || '#6B7280'; // gray-500 as default
};

// 표정 상태 매핑
export const FACE_STATUS_MAP = {
  'sad': '슬픔',
  'fear': '두려움',
} as const;

export type FaceStatusType = keyof typeof FACE_STATUS_MAP;

export const getFaceStatusText = (status: FaceStatusType): string => {
  return FACE_STATUS_MAP[status] || String(status);
};

// 표정 상태별 색상 매핑
export const FACE_COLOR_MAP = {
  'sad': '#3B82F6', // 파란색
  'fear': '#EF4444', // 빨간색
} as const;

export const getFaceColor = (status: string): string => {
  return FACE_COLOR_MAP[status as FaceStatusType] || '#9CA3AF'; // gray-400 as default
};

// 히트맵 색상 팔레트 타입 정의
export type Rgb = { r: number; g: number; b: number };
export type ColorStop = { value: number; color: Rgb };

// 시선 집중도 히트맵 기본 색상 팔레트
export const DEFAULT_THERMAL_STOPS: ColorStop[] = [
  { value: 0.0,  color: { r: 250, g: 252, b: 255 } }, // 거의 흰색 (아무것도 없는 곳)
  { value: 0.1,  color: { r: 220, g: 235, b: 245 } }, // 연한 회색-파랑 (가장 낮은 집중도)
  { value: 0.25, color: { r: 70,  g: 130, b: 255 } }, // 파랑
  { value: 0.45, color: { r: 0,   g: 180, b: 200 } }, // 청록
  { value: 0.65, color: { r: 50,  g: 220, b: 50  } }, // 초록
  { value: 0.8,  color: { r: 255, g: 200, b: 0   } }, // 노랑
  { value: 0.95, color: { r: 255, g: 100, b: 30  } }, // 주황
  { value: 1.0,  color: { r: 220, g: 20,  b: 20  } }, // 진한 빨강 (최고 집중)
];

// 그라데이션 CSS 빌더
export const buildGradientCss = (stops: ColorStop[]): string => {
  const parts = stops.map((s) => `rgb(${s.color.r}, ${s.color.g}, ${s.color.b}) ${Math.round(s.value * 100)}%`);
  return `linear-gradient(90deg, ${parts.join(', ')})`;
};

