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

// 말하기 속도 매핑
export const SPEED_MAP = {
  SLOW: '느림',
  SLIGHTLY_SLOW: '조금 느림',
  NORMAL: '양호',
  SLIGHTLY_FAST: '조금 빠름',
  FAST: '빠름',
} as const;

export type SpeedType = keyof typeof SPEED_MAP;

export const getSpeedText = (type: SpeedType): string => {
  return SPEED_MAP[type] || String(type);
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