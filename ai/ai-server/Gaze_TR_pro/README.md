# Gaze Tracking System

시선 추적 시스템 - 캘리브레이션부터 시선 추적까지 완벽한 솔루션

## 개요

이 시스템은 4개의 주요 모듈로 구성되어 있습니다:

1. **gaze_calibration.py** - 캘리브레이션 전용 모듈
2. **gaze_tracking.py** - 시선 추적 전용 모듈  
3. **calibration_manager.py** - 캘리브레이션 데이터 관리
4. **gaze_server.py** - Flask 웹 서버 API

## 설치 및 설정

### 1. 의존성 설치

```bash
cd ai/ai-server
pip install -r requirements.txt
```

### 2. ptgaze 모델 다운로드

시스템을 처음 실행하면 ptgaze 모델이 자동으로 다운로드됩니다.

## 사용 방법

### 1. 간편 실행 (권장)

```bash
cd ai/ai-server/Gaze_TR_pro
python run_simple_gui.py
```

3가지 인터페이스 중 선택:
- **GUI Interface** (권장) - 사용자 친화적인 그래픽 인터페이스
- **Web Server Interface** - REST API 서버
- **Command Line Interface** - 터미널 기반 인터페이스

### 2. 개별 모듈 실행

#### 캘리브레이션
```bash
python gaze_calibration.py
```

#### 시선 추적
```bash
python gaze_tracking.py
```

#### 캘리브레이션 관리
```bash
python calibration_manager.py
```

#### 웹 서버
```bash
python gaze_server.py
```

## 기능 설명

### 캘리브레이션 (gaze_calibration.py)

4가지 캘리브레이션 모드 지원:
- **Quick**: 9개 포인트, 샘플 1개씩 (빠른 설정용)
- **Balanced**: 9개 포인트, 샘플 2개씩 (권장)
- **Precise**: 9개 포인트, 샘플 3개씩 (고정밀)
- **Custom**: 13개 포인트, 샘플 1개씩 (최대 정밀도)

### 시선 추적 (gaze_tracking.py)

- **실시간 웹캠 추적**: 라이브 카메라에서 시선 추적
- **동영상 파일 처리**: 녹화된 비디오에서 시선 분석
- **히트맵 생성**: 시선 분포 히트맵 생성
- **상세 데이터**: 타임스탬프별 시선 좌표 데이터

### 데이터 관리 (calibration_manager.py)

- 캘리브레이션 데이터 CRUD 기능
- 데이터 유효성 검사
- CSV 내보내기
- 메타데이터 관리

### 웹 API (gaze_server.py)

REST API 엔드포인트:

#### 캘리브레이션
- `POST /api/calibration/start` - 캘리브레이션 초기화
- `POST /api/calibration/run` - 캘리브레이션 실행
- `GET /api/calibration/status` - 상태 확인
- `GET /api/calibration/list` - 저장된 캘리브레이션 목록

#### 시선 추적
- `POST /api/tracking/init` - 추적기 초기화
- `POST /api/tracking/video` - 비디오 파일 업로드 및 처리
- `POST /api/tracking/live` - 실시간 추적 시작
- `GET /api/tracking/results` - 결과 목록 조회

#### 기타
- `GET /api/health` - 서버 상태 확인
- `GET /api/system/info` - 시스템 정보

## 폴더 구조

```
Gaze_TR_pro/
├── gaze_calibration.py      # 캘리브레이션 모듈
├── gaze_tracking.py         # 시선 추적 모듈
├── calibration_manager.py   # 데이터 관리 모듈
├── gaze_server.py          # Flask 웹 서버
├── simple_gaze_interface.py # GUI 인터페이스
├── run_simple_gui.py       # 통합 실행기
├── calibration_data/       # 캘리브레이션 데이터 저장소
├── results/               # 시선 추적 결과 저장소
├── uploads/              # 업로드 파일 임시 저장소
└── calib/               # 카메라 캘리브레이션 파일
    └── sample_params.yaml
```

## 데이터 형식

### 캘리브레이션 데이터 (JSON)
```json
{
  "metadata": {
    "timestamp": "2025-01-15 10:30:00",
    "user_id": "user01",
    "session_name": "session_001"
  },
  "calibration_data": {
    "vectors": [[yaw, pitch], ...],
    "points": [[x, y], ...],
    "transform_method": "polynomial"
  }
}
```

### 시선 추적 결과 (JSON)
```json
{
  "metadata": {
    "timestamp": "2025-01-15 10:35:00",
    "total_gaze_samples": 1500,
    "center_gaze_ratio": 65.2
  },
  "heatmap_data": [[counts...]],
  "analysis": {
    "center_gaze_percentage": 65.2,
    "gaze_distribution": "concentrated"
  }
}
```

## 설정 옵션

### 화면 설정
- `screen_width`, `screen_height`: 실제 화면 해상도
- `window_width`, `window_height`: 처리 윈도우 크기

### 캘리브레이션 설정
- 모드별 포인트 수 및 샘플링 옵션
- 변환 방법 (기하학적, 다항식, RBF)

### 추적 설정
- 히트맵 그리드 크기
- 카메라 플립 옵션
- 결과 저장 형식

## 문제 해결

### 일반적인 문제들

1. **카메라 접근 실패**
   - 웹캠이 다른 프로그램에서 사용 중인지 확인
   - 카메라 권한 설정 확인

2. **모델 로딩 실패**
   - 인터넷 연결 확인 (첫 실행시 모델 다운로드)
   - `~/.ptgaze/` 폴더의 모델 파일 확인

3. **캘리브레이션 정확도 낮음**
   - 조명 조건 개선
   - 더 정밀한 모드 사용 (Balanced 또는 Precise)
   - 안정된 자세 유지

4. **의존성 오류**
   ```bash
   pip install flask flask-cors omegaconf scikit-learn ptgaze
   ```

### 로그 확인
모든 모듈은 상세한 로그를 출력합니다:
- `[INFO]`: 일반 정보
- `[ERROR]`: 오류 발생
- `[CALIB]`: 캘리브레이션 관련

## 성능 최적화

1. **캘리브레이션**: Quick 모드로 시작하여 필요시 Precise 모드 사용
2. **실시간 추적**: 웹캠 해상도를 1344x756으로 제한
3. **비디오 처리**: 대용량 파일은 청크 단위로 처리

## 확장 가능성

이 시스템은 다음과 같이 확장 가능합니다:
- 다중 사용자 지원
- 실시간 분석 대시보드
- 머신러닝 기반 행동 분석
- 외부 API 연동

## 라이선스

이 프로젝트는 교육 및 연구 목적으로 제작되었습니다.