import type { QualityScaleType, SpeedType, PostureStatusType, FaceStatusType, Rgb, ColorStop } from '../types/interviewReport';

// 공통 등급 스케일 (답변 완성도 / 불용어 사용 공용)
export const QUALITY_SCALE_MAP = {
  OUTSTANDING: '우수',
  NORMAL: '양호',
  INADEQUATE: '미흡',
} as const;

export const getQualityText = (type: QualityScaleType): string => {
  return QUALITY_SCALE_MAP[type] || String(type);
};

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
    speedType: 'SLIGHTLY SLOW' as const
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
    speedType: 'SLIGHTLY FAST' as const
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

// 시선 집중도 히트맵 기본 색상 팔레트
export const DEFAULT_THERMAL_STOPS: ColorStop[] = [
  { value: 0.0,  color: { r: 173, g: 216, b: 230 } }, // 연한 하늘색 (아무것도 없는 곳)
  { value: 0.15, color: { r: 135, g: 206, b: 235 } }, // 조금 진한 하늘색 (가장 낮은 집중도)
  { value: 0.3,  color: { r: 70,  g: 130, b: 255 } }, // 파랑
  { value: 0.5,  color: { r: 0,   g: 180, b: 200 } }, // 청록
  { value: 0.7,  color: { r: 50,  g: 220, b: 50  } }, // 초록
  { value: 0.85, color: { r: 255, g: 200, b: 0   } }, // 노랑
  { value: 0.95, color: { r: 255, g: 100, b: 30  } }, // 주황
  { value: 1.0,  color: { r: 220, g: 20,  b: 20  } }, // 진한 빨강 (최고 집중)
];

// 그라데이션 CSS 빌더
export const buildGradientCss = (stops: ColorStop[]): string => {
  const parts = stops.map((s) => `rgb(${s.color.r}, ${s.color.g}, ${s.color.b}) ${Math.round(s.value * 100)}%`);
  return `linear-gradient(90deg, ${parts.join(', ')})`;
};

// 질문 순서 포맷 함수
export const formatQuestionOrder = (order: number, suborder: number): string => {
  if (suborder === 0) {
    return `${order}번 질문`;
  }
  return `${order}-${suborder} 꼬리질문`;
};

// ResultDetail 페이지 탭 목록 상수
export const RESULT_DETAIL_TABS = [
  { id: 'verbal' as const, label: '답변 분석' },
  { id: 'face' as const, label: '표정 분석' },
  { id: 'posture' as const, label: '자세 분석' },
  { id: 'eye' as const, label: '시선 분석' }
] as const;

// 시선 분포 패턴 매핑
export const GAZE_DISTRIBUTION_MAP = {
  'concentrated': '집중형',
  'distributed': '분산형',
  'scattered': '산재형',
  '중앙 집중': '집중형'
} as const;

export const getGazeDistributionText = (distribution: string): string => {
  return GAZE_DISTRIBUTION_MAP[distribution as keyof typeof GAZE_DISTRIBUTION_MAP] || String(distribution);
};

// 시선 분석 원형 그래프 데이터 생성 함수
export const generateGazePieChartData = (centerGazePercentage: number, peripheralGazePercentage: number) => {
  return [
    {
      name: '중앙 시선',
      value: centerGazePercentage,
      color: '#2B7FFF'
    },
    {
      name: '주변 시선',
      value: peripheralGazePercentage,
      color: '#E5E7EB'
    }
  ];
};

// 더미 이미지 데이터
export const DUMMY_IMAGES = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop",
    alt: "면접 준비 1",
    title: "AI 면접 연습",
    description: "실전 같은 면접 경험"
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop",
    alt: "면접 준비 2",
    title: "피드백 분석",
    description: "개인 맞춤형 피드백"
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop",
    alt: "면접 준비 3",
    title: "스터디 그룹",
    description: "함께 성장하는 공간"
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop",
    alt: "면접 준비 4",
    title: "실시간 분석",
    description: "즉시 확인하는 결과"
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop",
    alt: "면접 준비 5",
    title: "다양한 질문",
    description: "실제 면접 질문 유형"
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=300&fit=crop",
    alt: "면접 준비 6",
    title: "전문가 조언",
    description: "업계 전문가의 팁"
  },
  {
    id: 7,
    src: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=300&fit=crop",
    alt: "면접 준비 7",
    title: "팀워크 연습",
    description: "그룹 면접 대비"
  },
  {
    id: 8,
    src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop",
    alt: "면접 준비 8",
    title: "자기소개 연습",
    description: "완벽한 자기소개"
  }
];

export const STUDY_IMAGES = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=300&fit=crop",
    alt: "스터디 1",
    title: "실시간 스터디",
    description: "온라인으로 함께하는 면접 연습"
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=300&fit=crop",
    alt: "스터디 2",
    title: "피드백 공유",
    description: "서로의 답변에 대한 피드백"
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop",
    alt: "스터디 3",
    title: "다양한 관점",
    description: "다양한 배경의 참가자들"
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop",
    alt: "스터디 4",
    title: "체계적 학습",
    description: "단계별 면접 준비 과정"
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop",
    alt: "스터디 5",
    title: "실전 모의고사",
    description: "실제 면접과 동일한 환경"
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop",
    alt: "스터디 6",
    title: "개인별 맞춤",
    description: "개인별 약점 보완"
  }
];

