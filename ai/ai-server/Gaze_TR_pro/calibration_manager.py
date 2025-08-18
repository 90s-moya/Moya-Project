import os
import json
import glob
from datetime import datetime
from typing import List, Dict, Optional

class CalibrationManager:
    """캘리브레이션 데이터 저장 및 관리 클래스"""
    
    def __init__(self, data_dir="calibration_data"):
        self.data_dir = data_dir
        self.ensure_data_directory()
    
    def ensure_data_directory(self):
        """데이터 디렉토리 생성"""
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
            print(f"[INFO] Created calibration data directory: {self.data_dir}")
    
    def save_calibration(self, calibrator, user_id=None, session_name=None) -> str:
        """캘리브레이션 데이터 저장"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 파일명 생성
        if user_id and session_name:
            filename = f"calib_{user_id}_{session_name}_{timestamp}.json"
        elif user_id:
            filename = f"calib_{user_id}_{timestamp}.json"
        else:
            filename = f"calib_{timestamp}.json"
        
        filepath = os.path.join(self.data_dir, filename)
        
        # 캘리브레이션 데이터 구성
        calib_data = {
            "metadata": {
                "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "user_id": user_id,
                "session_name": session_name,
                "version": "1.0",
                "created_by": "GazeCalibrator"
            },
            "screen_settings": {
                "screen_width": calibrator.SCREEN_WIDTH_PX,
                "screen_height": calibrator.SCREEN_HEIGHT_PX,
                "window_width": calibrator.WINDOW_WIDTH,
                "window_height": calibrator.WINDOW_HEIGHT
            },
            "calibration_data": {
                "vectors": calibrator.calib_vectors,
                "points": calibrator.calib_points,
                "transform_method": calibrator.transform_method,
                "samples_per_point": calibrator.samples_per_point,
                "total_points": len(calibrator.calib_points),
                "targets_used": calibrator.calib_targets
            }
        }
        
        # 변환 모델 데이터 추가
        if calibrator.transform_method == "polynomial" and calibrator.poly_model_x is not None:
            calib_data["polynomial_models"] = {
                "degree": calibrator.poly_model_x.named_steps['poly'].degree,
                "x_coefficients": calibrator.poly_model_x.named_steps['linear'].coef_.tolist(),
                "y_coefficients": calibrator.poly_model_y.named_steps['linear'].coef_.tolist(),
                "x_intercept": float(calibrator.poly_model_x.named_steps['linear'].intercept_),
                "y_intercept": float(calibrator.poly_model_y.named_steps['linear'].intercept_)
            }
        elif calibrator.transform_method == "geometric" and calibrator.transform_matrix is not None:
            calib_data["transform_matrix"] = calibrator.transform_matrix.tolist()
        
        # JSON 파일로 저장
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(calib_data, f, indent=2, ensure_ascii=False)
        
        print(f"[INFO] Calibration data saved: {filepath}")
        return filepath
    
    def load_calibration(self, filepath: str) -> Optional[Dict]:
        """캘리브레이션 데이터 로드"""
        try:
            if not os.path.exists(filepath):
                print(f"[ERROR] Calibration file not found: {filepath}")
                return None
            
            with open(filepath, 'r', encoding='utf-8') as f:
                calib_data = json.load(f)
            
            print(f"[INFO] Calibration data loaded: {filepath}")
            return calib_data
            
        except Exception as e:
            print(f"[ERROR] Failed to load calibration data: {e}")
            return None
    
    def list_calibrations(self, user_id=None) -> List[Dict]:
        """저장된 캘리브레이션 목록 조회"""
        pattern = os.path.join(self.data_dir, "*.json")
        files = glob.glob(pattern)
        
        calibrations = []
        for file_path in files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                metadata = data.get('metadata', {})
                
                # 사용자 ID 필터링
                if user_id and metadata.get('user_id') != user_id:
                    continue
                
                calib_info = {
                    "filepath": file_path,
                    "filename": os.path.basename(file_path),
                    "timestamp": metadata.get('timestamp', ''),
                    "user_id": metadata.get('user_id', ''),
                    "session_name": metadata.get('session_name', ''),
                    "total_points": data.get('calibration_data', {}).get('total_points', 0),
                    "transform_method": data.get('calibration_data', {}).get('transform_method', ''),
                    "file_size": os.path.getsize(file_path)
                }
                calibrations.append(calib_info)
                
            except Exception as e:
                print(f"[WARNING] Failed to read calibration file {file_path}: {e}")
                continue
        
        # 타임스탬프 기준 정렬 (최신순)
        calibrations.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return calibrations
    
    def delete_calibration(self, filepath: str) -> bool:
        """캘리브레이션 데이터 삭제"""
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
                print(f"[INFO] Calibration file deleted: {filepath}")
                return True
            else:
                print(f"[ERROR] File not found: {filepath}")
                return False
        except Exception as e:
            print(f"[ERROR] Failed to delete file: {e}")
            return False
    
    def find_latest_calibration(self, user_id=None) -> Optional[str]:
        """가장 최근 캘리브레이션 파일 경로 반환"""
        calibrations = self.list_calibrations(user_id)
        
        if calibrations:
            return calibrations[0]['filepath']  # 최신순 정렬되어 있음
        else:
            return None
    
    def get_calibration_summary(self, filepath: str) -> Optional[Dict]:
        """캘리브레이션 데이터 요약 정보"""
        data = self.load_calibration(filepath)
        if not data:
            return None
        
        metadata = data.get('metadata', {})
        calib_data = data.get('calibration_data', {})
        screen_settings = data.get('screen_settings', {})
        
        summary = {
            "basic_info": {
                "timestamp": metadata.get('timestamp', ''),
                "user_id": metadata.get('user_id', ''),
                "session_name": metadata.get('session_name', ''),
                "version": metadata.get('version', ''),
            },
            "calibration_info": {
                "total_points": calib_data.get('total_points', 0),
                "samples_per_point": calib_data.get('samples_per_point', 0),
                "transform_method": calib_data.get('transform_method', ''),
                "targets_count": len(calib_data.get('targets_used', []))
            },
            "screen_info": {
                "resolution": f"{screen_settings.get('window_width', 0)}x{screen_settings.get('window_height', 0)}",
                "screen_size": f"{screen_settings.get('screen_width', 0)}x{screen_settings.get('screen_height', 0)}"
            }
        }
        
        return summary
    
    def export_calibration_data(self, filepath: str, export_format="csv") -> Optional[str]:
        """캘리브레이션 데이터를 다른 형식으로 내보내기"""
        data = self.load_calibration(filepath)
        if not data:
            return None
        
        base_name = os.path.splitext(os.path.basename(filepath))[0]
        
        if export_format.lower() == "csv":
            import csv
            
            export_path = os.path.join(self.data_dir, f"{base_name}.csv")
            
            calib_data = data.get('calibration_data', {})
            vectors = calib_data.get('vectors', [])
            points = calib_data.get('points', [])
            
            with open(export_path, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(['vector_yaw', 'vector_pitch', 'screen_x', 'screen_y'])
                
                for i in range(min(len(vectors), len(points))):
                    if len(vectors[i]) >= 2 and len(points[i]) >= 2:
                        writer.writerow([
                            vectors[i][0], vectors[i][1],
                            points[i][0], points[i][1]
                        ])
            
            print(f"[INFO] Calibration data exported to CSV: {export_path}")
            return export_path
        
        else:
            print(f"[ERROR] Unsupported export format: {export_format}")
            return None
    
    def validate_calibration_data(self, filepath: str) -> Dict[str, bool]:
        """캘리브레이션 데이터 유효성 검사"""
        data = self.load_calibration(filepath)
        if not data:
            return {"valid": False, "error": "Failed to load data"}
        
        validation_results = {
            "valid": True,
            "has_metadata": "metadata" in data,
            "has_calibration_data": "calibration_data" in data,
            "has_screen_settings": "screen_settings" in data,
            "sufficient_points": False,
            "valid_vectors": False,
            "valid_points": False,
            "has_transform_method": False
        }
        
        # 캘리브레이션 데이터 검증
        if "calibration_data" in data:
            calib_data = data["calibration_data"]
            vectors = calib_data.get("vectors", [])
            points = calib_data.get("points", [])
            
            validation_results["sufficient_points"] = len(points) >= 4
            validation_results["valid_vectors"] = len(vectors) == len(points) and len(vectors) > 0
            validation_results["valid_points"] = all(len(p) >= 2 for p in points) if points else False
            validation_results["has_transform_method"] = bool(calib_data.get("transform_method"))
        
        # 전체 유효성 판정
        required_checks = [
            "has_metadata", "has_calibration_data", "has_screen_settings",
            "sufficient_points", "valid_vectors", "valid_points", "has_transform_method"
        ]
        
        validation_results["valid"] = all(validation_results[check] for check in required_checks)
        
        return validation_results

def main():
    """캘리브레이션 관리자 테스트"""
    manager = CalibrationManager()
    
    print("=== CALIBRATION MANAGER ===")
    print("1. List calibrations")
    print("2. View calibration summary")
    print("3. Delete calibration")
    print("4. Export calibration to CSV")
    print("5. Validate calibration")
    
    choice = input("Select option (1-5): ").strip()
    
    if choice == "1":
        user_id = input("Enter user ID (or press Enter for all): ").strip()
        if not user_id:
            user_id = None
        
        calibrations = manager.list_calibrations(user_id)
        
        if calibrations:
            print(f"\nFound {len(calibrations)} calibration(s):")
            for i, calib in enumerate(calibrations, 1):
                print(f"{i}. {calib['filename']}")
                print(f"   Timestamp: {calib['timestamp']}")
                print(f"   User ID: {calib['user_id']}")
                print(f"   Points: {calib['total_points']}")
                print(f"   Method: {calib['transform_method']}")
                print(f"   Size: {calib['file_size']} bytes")
                print()
        else:
            print("No calibrations found.")
    
    elif choice == "2":
        filepath = input("Enter calibration file path: ").strip()
        summary = manager.get_calibration_summary(filepath)
        
        if summary:
            print("\n=== CALIBRATION SUMMARY ===")
            print(f"Timestamp: {summary['basic_info']['timestamp']}")
            print(f"User ID: {summary['basic_info']['user_id']}")
            print(f"Session: {summary['basic_info']['session_name']}")
            print(f"Total Points: {summary['calibration_info']['total_points']}")
            print(f"Samples per Point: {summary['calibration_info']['samples_per_point']}")
            print(f"Transform Method: {summary['calibration_info']['transform_method']}")
            print(f"Screen Resolution: {summary['screen_info']['resolution']}")
        else:
            print("Failed to load calibration summary.")
    
    elif choice == "3":
        filepath = input("Enter calibration file path to delete: ").strip()
        confirm = input("Are you sure? (y/N): ").strip().lower()
        
        if confirm == 'y':
            manager.delete_calibration(filepath)
        else:
            print("Deletion cancelled.")
    
    elif choice == "4":
        filepath = input("Enter calibration file path: ").strip()
        export_path = manager.export_calibration_data(filepath, "csv")
        
        if export_path:
            print(f"Exported to: {export_path}")
        else:
            print("Export failed.")
    
    elif choice == "5":
        filepath = input("Enter calibration file path: ").strip()
        results = manager.validate_calibration_data(filepath)
        
        print("\n=== VALIDATION RESULTS ===")
        for key, value in results.items():
            status = "✓" if value else "✗"
            print(f"{status} {key}: {value}")

if __name__ == "__main__":
    main()