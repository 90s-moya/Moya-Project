// 시선추적 관련 타입 정의
export interface GazeAnalysisResult {
  heatmap_data: number[][]
  metadata: {
    timestamp: string
    total_gaze_samples: number
    center_gaze_ratio: number
    max_gaze_count: number
  }
  analysis: {
    center_gaze_percentage: number
    peripheral_gaze_percentage: number
    gaze_distribution: 'concentrated' | 'distributed' | 'scattered'
  }
}

export interface CalibrationRequest {
  screen_width: number
  screen_height: number
  window_width: number
  window_height: number
  mode: 'quick' | 'balanced' | 'precise' | 'custom'
  user_id: string
  session_name: string
}

export interface CalibrationResponse {
  status: 'success' | 'error'
  message: string
  calibrator_id?: number
  settings?: any
}

export interface TrackingInitRequest {
  screen_width: number
  screen_height: number
  window_width: number
  window_height: number
  calibration_file?: string
  calibration_data?: any
  session_id?: string
}