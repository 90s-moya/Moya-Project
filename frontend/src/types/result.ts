// Result 관련 모든 타입 정의

// 기본 결과 항목 인터페이스
export interface ReportResultItem {
  result_id: string;
  created_at: string;
  status: string;
  order: number;
  suborder: number;
  question: string;
  thumbnail_url: string;
}

// 리포트 인터페이스
export interface ReportItem {
  report_id: string;
  title: string;
  results: ReportResultItem[];
}

// ResultCard 컴포넌트 Props
export interface ResultCardProps {
  result: ReportResultItem;
  reportId: string;
  onResultClick: (reportId: string, resultId: string) => void;
}

// CarouselNavigation 컴포넌트 Props
export interface CarouselNavigationProps {
  reportId: string;
  results: ReportResultItem[];
  onResultClick: (reportId: string, resultId: string) => void;
}

// EditableTitle 컴포넌트 Props
export interface EditableTitleProps {
  reportId: string;
  title: string;
  onTitleChange: (reportId: string, newTitle: string) => void;
}

// 분석 결과 관련 인터페이스들

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
