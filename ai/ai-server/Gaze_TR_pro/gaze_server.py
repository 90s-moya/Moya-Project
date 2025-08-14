from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import tempfile
import threading
from datetime import datetime
from werkzeug.utils import secure_filename

from gaze_calibration import GazeCalibrator
from gaze_tracking import GazeTracker
from calibration_manager import CalibrationManager

app = Flask(__name__)
CORS(app)

# 업로드 설정
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB

# 전역 객체들
calibrator = None
tracker = None
manager = CalibrationManager()

# 로컬 스토리지 설정
LOCAL_STORAGE = {
    'calibrations': {},
    'tracking_results': {},
    'current_session': None
}

# 필요한 폴더들 생성
for folder in [UPLOAD_FOLDER, 'calibration_data', 'results']:
    if not os.path.exists(folder):
        os.makedirs(folder)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "calibrator_ready": calibrator is not None,
        "tracker_ready": tracker is not None
    })

@app.route('/api/calibration/start', methods=['POST'])
def start_calibration():
    """캘리브레이션 시작"""
    global calibrator
    
    try:
        data = request.get_json() or {}
        
        # 화면 설정
        screen_width = data.get('screen_width', 1920)
        screen_height = data.get('screen_height', 1080)
        window_width = data.get('window_width', 1344)
        window_height = data.get('window_height', 756)
        
        # 캘리브레이션 모드
        mode = data.get('mode', 'quick')  # quick, balanced, precise, custom
        
        # 사용자 정보
        user_id = data.get('user_id', 'default')
        session_name = data.get('session_name', f'session_{datetime.now().strftime("%H%M%S")}')
        
        # 캘리브레이터 초기화
        calibrator = GazeCalibrator(screen_width, screen_height, window_width, window_height)
        
        return jsonify({
            "status": "success",
            "message": "Calibration initialized",
            "calibrator_id": id(calibrator),
            "settings": {
                "screen_size": f"{screen_width}x{screen_height}",
                "window_size": f"{window_width}x{window_height}",
                "mode": mode,
                "user_id": user_id,
                "session_name": session_name
            }
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/calibration/run', methods=['POST'])
def run_calibration():
    """캘리브레이션 실행 (백그라운드에서 실행)"""
    global calibrator
    
    if not calibrator:
        return jsonify({
            "status": "error",
            "message": "Calibrator not initialized. Call /api/calibration/start first."
        }), 400
    
    try:
        data = request.get_json() or {}
        mode = data.get('mode', 'quick')
        user_id = data.get('user_id', 'default')
        session_name = data.get('session_name', f'session_{datetime.now().strftime("%H%M%S")}')
        
        # 백그라운드에서 캘리브레이션 실행
        def run_calibration_background():
            success = calibrator.run_calibration(mode)
            if success:
                # 캘리브레이션 데이터 저장
                filepath = manager.save_calibration(calibrator, user_id, session_name)
                
                # 로컬 스토리지에 저장
                calib_id = os.path.basename(filepath)
                LOCAL_STORAGE['calibrations'][calib_id] = {
                    'filepath': filepath,
                    'user_id': user_id,
                    'session_name': session_name,
                    'timestamp': datetime.now().isoformat(),
                    'mode': mode,
                    'status': 'completed'
                }
                
                print(f"[INFO] Calibration completed and saved: {filepath}")
            else:
                print("[ERROR] Calibration failed")
        
        thread = threading.Thread(target=run_calibration_background)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "status": "success",
            "message": "Calibration started in background",
            "mode": mode,
            "instructions": "Follow the on-screen calibration points and press SPACE to record each point."
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/calibration/status', methods=['GET'])
def calibration_status():
    """캘리브레이션 상태 확인"""
    global calibrator
    
    if not calibrator:
        return jsonify({
            "status": "not_initialized",
            "calibrator_ready": False
        })
    
    return jsonify({
        "status": "ready" if not calibrator.calibrating else "in_progress",
        "calibrator_ready": True,
        "calibrating": calibrator.calibrating,
        "current_index": calibrator.calib_index,
        "total_targets": len(calibrator.calib_targets),
        "samples_collected": len(calibrator.calib_vectors),
        "transform_ready": calibrator.transform_matrix is not None or calibrator.poly_model_x is not None
    })

@app.route('/api/calibration/list', methods=['GET'])
def list_calibrations():
    """저장된 캘리브레이션 목록 조회"""
    user_id = request.args.get('user_id')
    
    try:
        calibrations = manager.list_calibrations(user_id)
        
        return jsonify({
            "status": "success",
            "calibrations": calibrations,
            "count": len(calibrations)
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/calibration/<path:filename>/summary', methods=['GET'])
def calibration_summary(filename):
    """캘리브레이션 요약 정보 조회"""
    try:
        filepath = os.path.join(manager.data_dir, filename)
        summary = manager.get_calibration_summary(filepath)
        
        if summary:
            return jsonify({
                "status": "success",
                "summary": summary
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Calibration file not found or invalid"
            }), 404
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/calibration/<path:filename>/download', methods=['GET'])
def download_calibration(filename):
    """캘리브레이션 파일 다운로드"""
    try:
        filepath = os.path.join(manager.data_dir, filename)
        
        if os.path.exists(filepath):
            return send_file(filepath, as_attachment=True)
        else:
            return jsonify({
                "status": "error",
                "message": "File not found"
            }), 404
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/calibration/web/save', methods=['POST'])
def save_web_calibration():
    """웹 캘리브레이션 데이터 저장"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "status": "error",
                "message": "No calibration data provided"
            }), 400
        
        # 필수 필드 확인
        required_fields = ['calibration_points', 'calibration_vectors', 'user_id', 'session_name']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "status": "error",
                    "message": f"Missing required field: {field}"
                }), 400
        
        # 캘리브레이션 데이터 구성
        calibration_data = {
            "metadata": {
                "user_id": data.get('user_id', 'web_user'),
                "session_name": data.get('session_name', f'web_session_{datetime.now().strftime("%Y%m%d_%H%M%S")}'),
                "timestamp": data.get('timestamp', datetime.now().isoformat()),
                "calibration_type": "web_calibration",
                "screen_width": data.get('screen_width', 1920),
                "screen_height": data.get('screen_height', 1080),
                "window_width": data.get('window_width', 1344),
                "window_height": data.get('window_height', 756)
            },
            "calibration_points": data.get('calibration_points', []),
            "calibration_vectors": data.get('calibration_vectors', []),
            "transform_method": data.get('transform_method', 'polynomial'),
            "transform_matrix": data.get('transform_matrix'),
            "polynomial_models": data.get('polynomial_models')
        }
        
        # 파일명 생성
        session_name = data.get('session_name', f'web_session_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        filename = f"web_calibration_{session_name}.json"
        filepath = os.path.join(manager.data_dir, filename)
        
        # 파일 저장
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(calibration_data, f, indent=2, ensure_ascii=False)
        
        print(f"[INFO] Web calibration saved: {filepath}")
        
        return jsonify({
            "status": "success",
            "message": "Web calibration data saved successfully",
            "filename": filename,
            "filepath": filepath,
            "points_count": len(calibration_data.get('calibration_points', [])),
            "vectors_count": len(calibration_data.get('calibration_vectors', []))
        })
        
    except Exception as e:
        print(f"[ERROR] Failed to save web calibration: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/tracking/init', methods=['POST'])
def init_tracking():
    """시선 추적 초기화"""
    global tracker
    
    try:
        data = request.get_json() or {}
        
        # 화면 설정
        screen_width = data.get('screen_width', 1920)
        screen_height = data.get('screen_height', 1080)
        window_width = data.get('window_width', 1344)
        window_height = data.get('window_height', 756)
        
        # 캘리브레이션 파일
        calibration_file = data.get('calibration_file')
        
        if not calibration_file:
            return jsonify({
                "status": "error",
                "message": "calibration_file is required"
            }), 400
        
        # 트래커 초기화
        tracker = GazeTracker(screen_width, screen_height, window_width, window_height)
        
        # 캘리브레이션 데이터 로드
        calib_filepath = os.path.join(manager.data_dir, calibration_file)
        success = tracker.load_calibration_data(calib_filepath)
        
        if not success:
            return jsonify({
                "status": "error",
                "message": "Failed to load calibration data"
            }), 400
        
        return jsonify({
            "status": "success",
            "message": "Tracking initialized",
            "tracker_id": id(tracker),
            "calibration_loaded": success,
            "settings": {
                "screen_size": f"{screen_width}x{screen_height}",
                "window_size": f"{window_width}x{window_height}",
                "calibration_file": calibration_file
            }
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/tracking/video', methods=['POST'])
def track_video():
    """동영상 파일 시선 추적"""
    global tracker
    
    if not tracker:
        return jsonify({
            "status": "error",
            "message": "Tracker not initialized. Call /api/tracking/init first."
        }), 400
    
    # 파일 업로드 확인
    if 'video' not in request.files:
        return jsonify({
            "status": "error",
            "message": "No video file provided"
        }), 400
    
    file = request.files['video']
    
    if file.filename == '':
        return jsonify({
            "status": "error",
            "message": "No file selected"
        }), 400
    
    if not allowed_file(file.filename):
        return jsonify({
            "status": "error",
            "message": "File type not allowed"
        }), 400
    
    try:
        # 파일 저장
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], safe_filename)
        file.save(filepath)
        
        # 출력 프리픽스 설정
        output_prefix = f"video_{os.path.splitext(safe_filename)[0]}"
        
        # 백그라운드에서 비디오 처리
        def process_video_background():
            success = tracker.process_video_file(filepath, output_prefix)
            
            # 로컬 스토리지에 결과 저장
            if success:
                result_id = f"{output_prefix}_{timestamp}"
                LOCAL_STORAGE['tracking_results'][result_id] = {
                    'filename': filename,
                    'output_prefix': output_prefix,
                    'timestamp': datetime.now().isoformat(),
                    'type': 'video',
                    'status': 'completed'
                }
            
            # 처리 완료 후 임시 파일 삭제
            try:
                os.remove(filepath)
            except:
                pass
            
            print(f"[INFO] Video processing {'completed' if success else 'failed'}: {filename}")
        
        thread = threading.Thread(target=process_video_background)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "status": "success",
            "message": "Video processing started",
            "filename": filename,
            "output_prefix": output_prefix
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/tracking/live', methods=['POST'])
def start_live_tracking():
    """실시간 웹캠 시선 추적 시작"""
    global tracker
    
    if not tracker:
        return jsonify({
            "status": "error",
            "message": "Tracker not initialized. Call /api/tracking/init first."
        }), 400
    
    try:
        data = request.get_json() or {}
        duration = data.get('duration_seconds')  # 선택적 시간 제한
        
        # 백그라운드에서 실시간 추적
        def live_tracking_background():
            success = tracker.process_webcam_live(duration)
            
            # 로컬 스토리지에 결과 저장
            if success:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                result_id = f"live_tracking_{timestamp}"
                LOCAL_STORAGE['tracking_results'][result_id] = {
                    'timestamp': datetime.now().isoformat(),
                    'type': 'live',
                    'duration': duration,
                    'status': 'completed'
                }
            
            print(f"[INFO] Live tracking {'completed' if success else 'failed'}")
        
        thread = threading.Thread(target=live_tracking_background)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "status": "success",
            "message": "Live tracking started",
            "duration_limit": duration,
            "instructions": "Press 's' to start/stop recording, 'q' to quit"
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/tracking/results', methods=['GET'])
def list_tracking_results():
    """시선 추적 결과 목록 조회"""
    try:
        results_dir = "results"
        if not os.path.exists(results_dir):
            return jsonify({
                "status": "success",
                "results": [],
                "count": 0
            })
        
        files = []
        for filename in os.listdir(results_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(results_dir, filename)
                stat = os.stat(filepath)
                
                file_info = {
                    "filename": filename,
                    "filepath": filepath,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "type": "heatmap" if "heatmap" in filename else "detailed"
                }
                files.append(file_info)
        
        # 수정 시간 기준 정렬 (최신순)
        files.sort(key=lambda x: x['modified'], reverse=True)
        
        return jsonify({
            "status": "success",
            "results": files,
            "count": len(files)
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/tracking/results/<path:filename>', methods=['GET'])
def get_tracking_result(filename):
    """특정 시선 추적 결과 조회"""
    try:
        filepath = os.path.join("results", filename)
        
        if not os.path.exists(filepath):
            return jsonify({
                "status": "error",
                "message": "Result file not found"
            }), 404
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        response_data = {
            "status": "success",
            "filename": filename,
            "data": data
        }
        
        # Flask JSON 설정으로 압축된 응답 생성
        from flask import Response, current_app
        
        # 전체 응답을 압축하여 전송
        json_str = json.dumps(response_data, separators=(',', ':'), ensure_ascii=False)
        return Response(json_str, mimetype='application/json')
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/tracking/results/<path:filename>/download', methods=['GET'])
def download_tracking_result(filename):
    """시선 추적 결과 파일 다운로드"""
    try:
        filepath = os.path.join("results", filename)
        
        if os.path.exists(filepath):
            return send_file(filepath, as_attachment=True)
        else:
            return jsonify({
                "status": "error",
                "message": "File not found"
            }), 404
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/system/info', methods=['GET'])
def system_info():
    """시스템 정보 조회"""
    return jsonify({
        "status": "success",
        "system_info": {
            "upload_folder": UPLOAD_FOLDER,
            "max_file_size": app.config['MAX_CONTENT_LENGTH'],
            "allowed_extensions": list(ALLOWED_EXTENSIONS),
            "calibration_data_dir": manager.data_dir,
            "results_dir": "results"
        },
        "service_status": {
            "calibrator_ready": calibrator is not None,
            "tracker_ready": tracker is not None,
            "calibration_manager_ready": True
        }
    })

@app.errorhandler(413)
def file_too_large(e):
    return jsonify({
        "status": "error",
        "message": "File too large. Maximum size is 500MB."
    }), 413

if __name__ == '__main__':
    print("=== GAZE TRACKING SERVER ===")
    print("Starting Flask server...")
    print("Available endpoints:")
    print("  POST /api/calibration/start - Initialize calibration")
    print("  POST /api/calibration/run - Run calibration")
    print("  GET  /api/calibration/status - Check calibration status")
    print("  GET  /api/calibration/list - List saved calibrations")
    print("  POST /api/tracking/init - Initialize tracking")
    print("  POST /api/tracking/video - Process video file")
    print("  POST /api/tracking/live - Start live tracking")
    print("  GET  /api/tracking/results - List tracking results")
    print("  GET  /api/health - Health check")
    print()
    
    app.run(host='0.0.0.0', port=5000, debug=True)