// 시선추적 관련 API
import axios from "axios"
import type { CalibrationRequest, CalibrationResponse, TrackingInitRequest, GazeAnalysisResult } from '@/types/gaze'

const GAZE_SERVER_URL = "http://localhost:5000"

// 캘리브레이션 시작
export const startCalibration = async (data: CalibrationRequest): Promise<CalibrationResponse> => {
  const response = await axios.post(`${GAZE_SERVER_URL}/api/calibration/start`, data)
  return response.data
}

// 캘리브레이션 실행
export const runCalibration = async (data: Partial<CalibrationRequest>): Promise<CalibrationResponse> => {
  const response = await axios.post(`${GAZE_SERVER_URL}/api/calibration/run`, data)
  return response.data
}

// 캘리브레이션 목록 조회
export const getCalibrations = async (userId?: string) => {
  const params = userId ? { user_id: userId } : {}
  const response = await axios.get(`${GAZE_SERVER_URL}/api/calibration/list`, { params })
  return response.data
}

// 시선추적 초기화
export const initTracking = async (data: TrackingInitRequest) => {
  const response = await axios.post(`${GAZE_SERVER_URL}/api/tracking/init`, data)
  return response.data
}

// 동영상 시선추적 분석
export const analyzeVideo = async (videoFile: File, calibData?: any): Promise<any> => {
  const formData = new FormData()
  formData.append('video', videoFile)
  
  // 캘리브레이션 데이터가 있으면 추가
  if (calibData) {
    formData.append('calib_data', JSON.stringify(calibData))
  }
  
  const response = await axios.post(`${GAZE_SERVER_URL}/api/tracking/video`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

// 시선추적 결과 조회
export const getTrackingResults = async () => {
  const response = await axios.get(`${GAZE_SERVER_URL}/api/tracking/results`)
  return response.data
}

// 특정 시선추적 결과 조회
export const getTrackingResult = async (filename: string): Promise<GazeAnalysisResult> => {
  const response = await axios.get(`${GAZE_SERVER_URL}/api/tracking/results/${filename}`)
  return response.data.data
}

// 웹 캘리브레이션 데이터 저장
export const saveWebCalibration = async (calibrationData: any) => {
  const response = await axios.post(`${GAZE_SERVER_URL}/api/calibration/web/save`, {
    ...calibrationData,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    window_width: window.innerWidth,
    window_height: window.innerHeight,
    user_id: calibrationData.user_id || 'interview_user',
    session_name: calibrationData.session_name || `session_${Date.now()}`
  })
  return response.data
}

// 서버 상태 확인
export const checkServerHealth = async () => {
  const response = await axios.get(`${GAZE_SERVER_URL}/api/health`)
  return response.data
}