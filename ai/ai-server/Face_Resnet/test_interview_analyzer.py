# test_interview_analyzer.py
# -*- coding: utf-8 -*-
"""
면접 특화 감정 분석기 테스트 및 예시 코드
"""

import json
from interview_analyzer import InterviewEmotionAnalyzer


def test_with_existing_report():
    """기존 리포트 데이터로 테스트"""
    analyzer = InterviewEmotionAnalyzer()
    
    # 기존 리포트 형태의 데이터
    existing_report = {
        "class_distribution": {
            "anger": 0.0,
            "disgust": 0.0,
            "fear": 0.0,
            "happy": 0.0,
            "neutral": 0.0,
            "sad": 0.0,
            "surprise": 1.0
        },
        "tension_features": {
            "eye_squeeze_mean": 9.71,
            "lip_press_mean": 33.39
        },
        "facial_metrics": {
            "smile_mean": 58.7,
            "positive_emotions_ratio": 0.0
        },
        "details": {
            "frames_analyzed": 713,
            "fps_effective": 16.79,
            "analysis_duration_sec": 42.5
        }
    }
    
    print("=== 기존 리포트 데이터 분석 ===")
    result = analyzer.analyze(existing_report)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print()
    
    return result


def test_balanced_scenario():
    """균형 잡힌 시나리오 테스트"""
    analyzer = InterviewEmotionAnalyzer()
    
    # 좋은 면접 상태 시뮬레이션
    balanced_data = {
        "class_distribution": {
            "happy": 0.25,
            "neutral": 0.60,
            "sad": 0.05,
            "anger": 0.02,
            "disgust": 0.01,
            "fear": 0.05,
            "surprise": 0.02
        },
        "facial_metrics": {"smile_mean": 65.0},
        "tension_features": {
            "eye_squeeze_mean": 20.0,
            "lip_press_mean": 15.0,
            "blink_per_min": 18
        },
        "details": {"frames_analyzed": 800, "fps_effective": 12.0}
    }
    
    print("=== 균형 잡힌 면접 상태 분석 ===")
    result = analyzer.analyze(balanced_data)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print()
    
    return result


def test_nervous_scenario():
    """긴장한 상태 시나리오 테스트"""
    analyzer = InterviewEmotionAnalyzer()
    
    # 긴장한 면접 상태 시뮬레이션
    nervous_data = {
        "class_distribution": {
            "happy": 0.05,
            "neutral": 0.40,
            "sad": 0.15,
            "anger": 0.05,
            "disgust": 0.05,
            "fear": 0.25,
            "surprise": 0.05
        },
        "facial_metrics": {"smile_mean": 25.0},
        "tension_features": {
            "eye_squeeze_mean": 60.0,
            "lip_press_mean": 50.0,
            "blink_per_min": 28
        },
        "details": {"frames_analyzed": 500, "fps_effective": 10.0}
    }
    
    print("=== 긴장한 면접 상태 분석 ===")
    result = analyzer.analyze(nervous_data)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print()
    
    return result


def test_frame_based_input():
    """프레임별 입력 테스트"""
    analyzer = InterviewEmotionAnalyzer()
    
    # 프레임별 데이터 시뮬레이션 (10프레임)
    frame_data = {
        "frames": [
            {"probs": {"happy": 0.1, "neutral": 0.7, "sad": 0.05, "anger": 0.02, "disgust": 0.01, "fear": 0.1, "surprise": 0.02}},
            {"probs": {"happy": 0.15, "neutral": 0.65, "sad": 0.05, "anger": 0.02, "disgust": 0.01, "fear": 0.1, "surprise": 0.02}},
            {"probs": {"happy": 0.2, "neutral": 0.6, "sad": 0.05, "anger": 0.02, "disgust": 0.01, "fear": 0.1, "surprise": 0.02}},
            {"probs": {"happy": 0.12, "neutral": 0.68, "sad": 0.05, "anger": 0.02, "disgust": 0.01, "fear": 0.1, "surprise": 0.02}},
            {"probs": {"happy": 0.18, "neutral": 0.62, "sad": 0.05, "anger": 0.02, "disgust": 0.01, "fear": 0.1, "surprise": 0.02}},
            {"probs": {"happy": 0.22, "neutral": 0.58, "sad": 0.05, "anger": 0.02, "disgust": 0.01, "fear": 0.1, "surprise": 0.02}},
            {"probs": {"happy": 0.16, "neutral": 0.64, "sad": 0.05, "anger": 0.02, "disgust": 0.01, "fear": 0.1, "surprise": 0.02}},
            {"probs": {"happy": 0.14, "neutral": 0.66, "sad": 0.05, "anger": 0.02, "disgust": 0.01, "fear": 0.1, "surprise": 0.02}},
            {"probs": {"happy": 0.19, "neutral": 0.61, "sad": 0.05, "anger": 0.02, "disgust": 0.01, "fear": 0.1, "surprise": 0.02}},
            {"probs": {"happy": 0.17, "neutral": 0.63, "sad": 0.05, "anger": 0.02, "disgust": 0.01, "fear": 0.1, "surprise": 0.02}},
        ],
        "aux": {
            "smile_mean": 0.55,
            "eye_squeeze_mean": 0.30,
            "lip_press_mean": 0.25,
            "blink_per_min": 16,
            "frames": 10,
            "fps": 10
        }
    }
    
    print("=== 프레임별 입력 데이터 분석 ===")
    result = analyzer.analyze(frame_data)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print()
    
    return result


def compare_scenarios():
    """다양한 시나리오 비교"""
    print("=== 시나리오별 준비도 점수 비교 ===")
    
    scenarios = [
        ("기존 리포트 (surprise 100%)", test_with_existing_report),
        ("균형 잡힌 상태", test_balanced_scenario),
        ("긴장한 상태", test_nervous_scenario),
        ("프레임별 입력", test_frame_based_input)
    ]
    
    results = []
    for name, test_func in scenarios:
        result = test_func()
        results.append((name, result))
    
    print("\n=== 요약 비교 ===")
    for name, result in results:
        summary = result['summary']
        print(f"{name}:")
        print(f"  등급: {summary['grade']}, 준비도: {summary['interview_readiness']}")
        print(f"  핵심: {summary['one_liners'][0]}")
        print()


def demonstrate_api_usage():
    """API 사용법 데모"""
    print("=== API 사용법 데모 ===")
    
    analyzer = InterviewEmotionAnalyzer()
    
    # 방법 1: 간단한 집계 데이터로 분석
    simple_data = {
        "class_distribution": {
            "happy": 0.2, "neutral": 0.5, "sad": 0.1,
            "anger": 0.05, "disgust": 0.05, "fear": 0.08, "surprise": 0.02
        },
        "facial_metrics": {"smile_mean": 50.0},
        "tension_features": {"eye_squeeze_mean": 30.0, "lip_press_mean": 25.0},
        "details": {"frames_analyzed": 300}
    }
    
    result = analyzer.analyze(simple_data)
    
    print("입력 데이터:")
    print(json.dumps(simple_data, ensure_ascii=False, indent=2))
    print("\n분석 결과:")
    print(f"등급: {result['summary']['grade']}")
    print(f"준비도 점수: {result['summary']['interview_readiness']}")
    print("추천사항:")
    for i, rec in enumerate(result['recommendations'], 1):
        print(f"  {i}. {rec}")


if __name__ == "__main__":
    print("면접 특화 감정 분석기 테스트 시작\n")
    
    # 개별 테스트 실행
    compare_scenarios()
    
    # API 사용법 데모
    demonstrate_api_usage()
    
    print("\n테스트 완료!")