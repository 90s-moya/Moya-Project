// Interview Report 관련 모든 타입 정의

// 기본 결과 항목 인터페이스
export interface ReportItemData {
  result_id: string;
  created_at: string;
  status: string;
  order: number;
  suborder: number;
  question: string;
  thumbnail_url: string;
}

// 리포트 목록 인터페이스
export interface ReportListData {
  report_id: string;
  title: string;
  results: ReportItemData[];
}

// ReportCard 컴포넌트 Props
export interface ReportCardProps {
  result: ReportItemData;
  reportId: string;
  onResultClick: (reportId: string, resultId: string) => void;
}

// CarouselNavigation 컴포넌트 Props
export interface CarouselNavigationProps {
  reportId: string;
  results: ReportItemData[];
  onResultClick: (reportId: string, resultId: string) => void;
}

// EditableTitle 컴포넌트 Props
export interface EditableTitleProps {
  reportId: string;
  title: string;
  onTitleChange: (reportId: string, newTitle: string) => void;
}

// 분석 결과 관련 인터페이스들

// 분석 결과 상세조회 응답 데이터 타입
export interface InterviewReportDetailResponse {
  video_url?: string;
  verbal_result?: VerbalResult;
  face_result?: FaceResult;
  posture_result?: PostureResult;
  gaze_result?: GazeResult;
}


// 언어 분석 결과
export interface VerbalResult {
  answer: string;
  stopwords: string;
  is_ended: boolean;
  reason_end: string;
  context_matched: boolean;
  reason_context: string;
  gpt_comment: string;
  end_type: string;
  speech_label: string;
  syll_art: number;
}

// 자세 분석 결과
export interface PostureResult {
  timestamp: string;
  total_frames: number;
  frame_distribution: Record<string, number>;
  detailed_logs: Array<{
    label: string;
    start_frame: number;
    end_frame: number;
  }>;
}

// 표정 분석 결과
export interface FaceResult {
  timestamp: string;
  total_frames: number;
  frame_distribution: Record<string, number>;
  detailed_logs: Array<{
    label: string;
    start_frame: number;
    end_frame: number;
  }>;
}

// 시선 분석 결과
export interface GazeResult {
  center_gaze_percentage: number;
  peripheral_gaze_percentage: number;
  gaze_distribution: string;
}

// 분석 컴포넌트 Props들
export interface VerbalResultProps {
  verbal_result: VerbalResult;
}

export interface PostureResultProps {
  posture_result: PostureResult;
  onFrameChange?: (frame: number) => void;
}

export interface FaceAnalysisProps {
  face_result: FaceResult;
  onFrameChange?: (frame: number) => void;
}

// ResultDetail 페이지에서 사용하는 라우터 state 타입
export interface ResultDetailState {
  question?: string;
  title?: string;
  order?: number;
  suborder?: number;
}

// 탭 타입
export type TabType = 'verbal' | 'face' | 'posture' | 'eye';

// 탭 정의
export interface TabDefinition {
  id: TabType;
  label: string;
}

// Constants 관련 타입들
export type QualityScaleType = 'OUTSTANDING' | 'NORMAL' | 'INADEQUATE';
export type SpeedType = 'SLOW' | 'SLIGHTLY SLOW' | 'NORMAL' | 'SLIGHTLY FAST' | 'FAST';
export type PostureStatusType = 'Good Posture' | 'Shoulders Uneven' | 'Hands Above Shoulders' | 'Head Down' | 'Head Off-Center';
export type FaceStatusType = 'neutral' | 'negative' | 'positive';

// 히트맵 색상 관련 타입
export type Rgb = { r: number; g: number; b: number };
export type ColorStop = { value: number; color: Rgb };