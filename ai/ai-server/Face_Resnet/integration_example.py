# integration_example.py
# -*- coding: utf-8 -*-
"""
기존 Face_Resnet 시스템과 면접 분석기 통합 예시
기존 리포트 파일을 읽어서 면접 특화 분석 결과를 생성하는 방법을 보여줍니다.
"""

import json
import os
from datetime import datetime
from interview_analyzer import InterviewEmotionAnalyzer


def process_existing_report(report_path: str, output_dir: str = "enhanced_reports"):
    """기존 리포트를 읽어서 면접 특화 분석 결과를 생성"""
    
    # 출력 디렉토리 생성
    os.makedirs(output_dir, exist_ok=True)
    
    # 기존 리포트 읽기
    try:
        with open(report_path, 'r', encoding='utf-8') as f:
            original_data = json.load(f)
        print(f"기존 리포트 로드: {report_path}")
    except Exception as e:
        print(f"리포트 읽기 실패: {e}")
        return None
    
    # 면접 분석기로 분석
    analyzer = InterviewEmotionAnalyzer()
    enhanced_result = analyzer.analyze(original_data)
    
    # 원본 데이터도 포함하여 통합 결과 생성
    integrated_result = {
        "timestamp": datetime.now().isoformat(),
        "original_report_path": report_path,
        "original_data": original_data,
        "interview_analysis": enhanced_result
    }
    
    # 결과 저장
    base_name = os.path.basename(report_path).replace('.json', '')
    output_path = os.path.join(output_dir, f"enhanced_{base_name}.json")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(integrated_result, f, ensure_ascii=False, indent=2)
    
    print(f"향상된 분석 결과 저장: {output_path}")
    
    return integrated_result


def batch_process_reports(reports_dir: str = "report", output_dir: str = "enhanced_reports"):
    """report 디렉토리의 모든 리포트를 일괄 처리"""
    
    if not os.path.exists(reports_dir):
        print(f"리포트 디렉토리가 없습니다: {reports_dir}")
        return
    
    # JSON 파일들 찾기
    json_files = [f for f in os.listdir(reports_dir) if f.endswith('.json')]
    
    if not json_files:
        print(f"처리할 JSON 파일이 없습니다: {reports_dir}")
        return
    
    print(f"총 {len(json_files)}개의 리포트를 처리합니다.")
    
    results_summary = []
    
    for json_file in json_files:
        report_path = os.path.join(reports_dir, json_file)
        print(f"\n처리 중: {json_file}")
        
        result = process_existing_report(report_path, output_dir)
        
        if result:
            interview_analysis = result['interview_analysis']
            summary = {
                "file": json_file,
                "grade": interview_analysis['summary']['grade'],
                "readiness_score": interview_analysis['summary']['interview_readiness'],
                "confidence": interview_analysis['metrics']['confidence'],
                "nervousness": interview_analysis['metrics']['nervousness'],
                "key_insight": interview_analysis['summary']['one_liners'][0]
            }
            results_summary.append(summary)
    
    # 요약 리포트 생성
    summary_path = os.path.join(output_dir, "batch_analysis_summary.json")
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump({
            "processed_at": datetime.now().isoformat(),
            "total_files": len(json_files),
            "results": results_summary
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n=== 일괄 처리 완료 ===")
    print(f"처리된 파일: {len(json_files)}개")
    print(f"요약 리포트: {summary_path}")
    
    # 간단한 통계 출력
    if results_summary:
        grades = [r['grade'] for r in results_summary]
        avg_readiness = sum(r['readiness_score'] for r in results_summary) / len(results_summary)
        
        print(f"평균 준비도 점수: {avg_readiness:.1f}")
        print("등급 분포:")
        for grade in ['A+', 'A', 'B', 'C', 'D']:
            count = grades.count(grade)
            if count > 0:
                print(f"  {grade}: {count}개")


def create_real_time_processor():
    """실시간 처리를 위한 간단한 프로세서 예시"""
    
    class RealTimeInterviewAnalyzer:
        def __init__(self):
            self.analyzer = InterviewEmotionAnalyzer()
            self.frame_buffer = []
        
        def add_frame_data(self, emotion_probs: dict, facial_signals: dict = None):
            """프레임별 데이터 추가"""
            frame_data = {"probs": emotion_probs}
            self.frame_buffer.append(frame_data)
            
            # 최근 N프레임만 유지 (메모리 관리)
            if len(self.frame_buffer) > 300:  # 30초 분량 (10fps 기준)
                self.frame_buffer.pop(0)
        
        def get_current_analysis(self, facial_signals: dict = None):
            """현재까지의 데이터로 분석 수행"""
            if not self.frame_buffer:
                return None
            
            # 프레임별 데이터 구성
            analysis_data = {
                "frames": self.frame_buffer.copy(),
                "aux": facial_signals or {
                    "smile_mean": 0.5,
                    "eye_squeeze_mean": 0.3,
                    "lip_press_mean": 0.2,
                    "blink_per_min": 15,
                    "frames": len(self.frame_buffer),
                    "fps": 10
                }
            }
            
            return self.analyzer.analyze(analysis_data)
        
        def reset(self):
            """버퍼 초기화"""
            self.frame_buffer.clear()
    
    return RealTimeInterviewAnalyzer()


def demo_real_time_usage():
    """실시간 처리 데모"""
    print("=== 실시간 처리 데모 ===")
    
    processor = create_real_time_processor()
    
    # 시뮬레이션: 10프레임의 감정 데이터 추가
    sample_frames = [
        {"happy": 0.1, "neutral": 0.7, "sad": 0.1, "anger": 0.02, "disgust": 0.02, "fear": 0.04, "surprise": 0.02},
        {"happy": 0.15, "neutral": 0.65, "sad": 0.1, "anger": 0.02, "disgust": 0.02, "fear": 0.04, "surprise": 0.02},
        {"happy": 0.2, "neutral": 0.6, "sad": 0.1, "anger": 0.02, "disgust": 0.02, "fear": 0.04, "surprise": 0.02},
        {"happy": 0.18, "neutral": 0.62, "sad": 0.1, "anger": 0.02, "disgust": 0.02, "fear": 0.04, "surprise": 0.02},
        {"happy": 0.22, "neutral": 0.58, "sad": 0.1, "anger": 0.02, "disgust": 0.02, "fear": 0.04, "surprise": 0.02},
    ]
    
    print("프레임별 데이터 추가 중...")
    for i, frame_emotions in enumerate(sample_frames):
        processor.add_frame_data(frame_emotions)
        print(f"프레임 {i+1} 추가됨")
    
    # 현재 상태 분석
    facial_signals = {
        "smile_mean": 0.6,
        "eye_squeeze_mean": 0.25,
        "lip_press_mean": 0.2,
        "blink_per_min": 18,
        "frames": len(sample_frames),
        "fps": 10
    }
    
    result = processor.get_current_analysis(facial_signals)
    
    if result:
        print("\n현재 분석 결과:")
        print(f"등급: {result['summary']['grade']}")
        print(f"준비도: {result['summary']['interview_readiness']}")
        print("실시간 피드백:")
        for rec in result['recommendations']:
            print(f"  - {rec}")


def main():
    """메인 실행 함수"""
    print("Face_Resnet 시스템 통합 예시\n")
    
    # 1. 기존 리포트 일괄 처리
    print("1. 기존 리포트들을 면접 특화 분석으로 처리합니다...")
    batch_process_reports()
    
    print("\n" + "="*50 + "\n")
    
    # 2. 실시간 처리 데모
    demo_real_time_usage()
    
    print("\n통합 예시 완료!")


if __name__ == "__main__":
    main()