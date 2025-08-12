# interview_analyzer.py
# -*- coding: utf-8 -*-
"""
면접 특화 감정 분석가
7가지 감정 라벨을 면접 맥락으로 해석하여 핵심 지표와 실전 피드백을 제공합니다.
"""

import json
import numpy as np
from typing import Dict, List, Union, Optional, Any


class InterviewEmotionAnalyzer:
    """면접 장면 분석을 수행하는 면접 특화 감정 분석가"""
    
    def __init__(self):
        # 감정별 면접 맥락 가중치
        self.emotion_weights = {
            'happy': 0.40,
            'neutral': 0.30,
            'surprise': 0.10,  # 보수적 반영
            'fear': -0.50,
            'anger': -0.80,
            'disgust': -0.80,
            'sad': -0.60
        }
        
        # 등급 기준
        self.grade_thresholds = {
            'A+': 85,
            'A': 75,
            'B': 65,
            'C': 55,
            'D': 0
        }
    
    def _normalize_percentage(self, value: Union[float, int]) -> float:
        """백분율(0~100)을 0~1로 정규화"""
        if value > 1.0:
            return value / 100.0
        return float(value)
    
    def _clamp(self, value: float, min_val: float = 0.0, max_val: float = 1.0) -> float:
        """값을 지정된 범위로 제한"""
        return max(min_val, min(value, max_val))
    
    def _parse_input(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """입력 데이터를 표준 형식으로 파싱"""
        result = {
            'distributions': {},
            'signals': {
                'smile_mean': None,
                'eye_squeeze_mean': None,
                'lip_press_mean': None,
                'blink_per_min': None
            },
            'frames_info': {'frames': 0, 'fps': 0}
        }
        
        # Case A: 프레임별 데이터
        if 'frames' in data and isinstance(data['frames'], list):
            # 프레임별 분포를 평균으로 집계
            emotion_sums = {emotion: 0.0 for emotion in ['happy', 'neutral', 'sad', 'anger', 'disgust', 'fear', 'surprise']}
            frame_count = len(data['frames'])
            
            for frame in data['frames']:
                probs = frame.get('probs', {})
                for emotion in emotion_sums:
                    emotion_sums[emotion] += probs.get(emotion, 0.0)
            
            # 평균 계산
            for emotion in emotion_sums:
                result['distributions'][emotion] = emotion_sums[emotion] / max(frame_count, 1)
            
            # 보조 지표
            aux = data.get('aux', {})
            result['signals']['smile_mean'] = self._normalize_percentage(aux.get('smile_mean', 0))
            result['signals']['eye_squeeze_mean'] = self._normalize_percentage(aux.get('eye_squeeze_mean', 0))
            result['signals']['lip_press_mean'] = self._normalize_percentage(aux.get('lip_press_mean', 0))
            result['signals']['blink_per_min'] = aux.get('blink_per_min', 0)
            result['frames_info']['frames'] = aux.get('frames', frame_count)
            result['frames_info']['fps'] = aux.get('fps', 10)
            
        # Case B: 집계 분포 데이터
        else:
            # 클래스 분포
            class_dist = data.get('class_distribution', {})
            for emotion in ['happy', 'neutral', 'sad', 'anger', 'disgust', 'fear', 'surprise']:
                result['distributions'][emotion] = class_dist.get(emotion, 0.0)
            
            # 얼굴 지표
            facial_metrics = data.get('facial_metrics', {})
            result['signals']['smile_mean'] = self._normalize_percentage(facial_metrics.get('smile_mean', 0))
            
            # 긴장 지표
            tension_features = data.get('tension_features', {})
            result['signals']['eye_squeeze_mean'] = self._normalize_percentage(tension_features.get('eye_squeeze_mean', 0))
            result['signals']['lip_press_mean'] = self._normalize_percentage(tension_features.get('lip_press_mean', 0))
            result['signals']['blink_per_min'] = tension_features.get('blink_per_min', 0)
            
            # 상세 정보
            details = data.get('details', {})
            result['frames_info']['frames'] = details.get('frames_analyzed', 0)
            result['frames_info']['fps'] = details.get('fps_effective', 10.0)
        
        return result
    
    def _calculate_metrics(self, distributions: Dict[str, float], signals: Dict[str, Optional[float]]) -> Dict[str, float]:
        """핵심 지표들을 계산"""
        # Positive Ratio 계산
        positive_ratio = (distributions['happy'] + distributions['neutral'] + 
                         0.3 * distributions['surprise'])
        
        # 자신감 (Confidence)
        smile_contrib = 0.20 * self._clamp(signals['smile_mean'] or 0, 0, 1)
        confidence = 100 * (0.40 * distributions['happy'] + 
                           0.30 * distributions['neutral'] + 
                           0.10 * distributions['surprise'] + 
                           smile_contrib)
        
        # 긴장 (Nervousness)
        eye_squeeze = self._clamp(signals['eye_squeeze_mean'] or 0, 0, 1)
        lip_press = self._clamp(signals['lip_press_mean'] or 0, 0, 1)
        
        # 깜박임 긴장도
        blink_per_min = signals['blink_per_min'] or 0
        blink_tension = 1.0 if (blink_per_min >= 25 or blink_per_min <= 8) and blink_per_min > 0 else 0.0
        
        nervousness = 100 * (0.60 * eye_squeeze + 0.25 * lip_press + 0.15 * blink_tension)
        
        # 스트레스 (Stress)
        stress = 100 * (0.50 * distributions['anger'] + 
                       0.30 * distributions['disgust'] + 
                       0.20 * distributions['fear'])
        
        # 불안 (Anxiety)
        anxiety = 100 * (0.45 * distributions['fear'] + 
                        0.25 * distributions['sad'] + 
                        0.15 * distributions['surprise'] + 
                        0.15 * distributions['disgust'])
        
        # 친근감 (Approachability)
        smile_contrib_2 = 0.20 * self._clamp(signals['smile_mean'] or 0, 0, 1)
        approachability = 100 * (0.60 * distributions['happy'] + 
                                0.20 * distributions['neutral'] + 
                                smile_contrib_2)
        
        # 안정성 (Stability) - 배치 데이터의 경우 고정값 사용
        stability = 70.0  # 프레임별 시계열이 없으므로 기본값
        
        return {
            'confidence': round(confidence, 1),
            'approachability': round(approachability, 1),
            'nervousness': round(nervousness, 1),
            'stress': round(stress, 1),
            'anxiety': round(anxiety, 1),
            'stability': round(stability, 1),
            'positive_ratio': round(positive_ratio, 3)
        }
    
    def _calculate_interview_readiness(self, metrics: Dict[str, float]) -> tuple[float, str]:
        """종합 준비도 점수와 등급 계산"""
        negative_avg = (metrics['nervousness'] + metrics['stress'] + metrics['anxiety']) / 3
        
        interview_readiness = self._clamp(
            0.65 * metrics['confidence'] + 
            0.35 * metrics['approachability'] - 
            0.50 * negative_avg + 50,
            0, 100
        )
        
        # 등급 결정
        grade = 'D'
        for g, threshold in self.grade_thresholds.items():
            if interview_readiness >= threshold:
                grade = g
                break
        
        return round(interview_readiness, 1), grade
    
    def _generate_recommendations(self, metrics: Dict[str, float], distributions: Dict[str, float], 
                                signals: Dict[str, Optional[float]]) -> List[str]:
        """행동지향 추천사항 생성"""
        recommendations = []
        
        # 자신감 관련
        if metrics['confidence'] < 55:
            recommendations.append("자신감 향상: 모의면접 반복, 성공 경험 회상")
        
        # 긴장 관련
        if metrics['nervousness'] > 65:
            recommendations.append("긴장 완화: 4-7-8 호흡 2~3분, 답변 전 미소 유지")
        
        # 스트레스 관련
        if metrics['stress'] > 60:
            recommendations.append("스트레스 관리: 예상 질문 키워드 요약/리허설")
        
        # 불안 관련
        if metrics['anxiety'] > 60:
            recommendations.append("불안 완화: 긍정적 시각화, 초반 아이컨택 고정")
        
        # 감정별 피드백
        if distributions['sad'] > 0.2:
            recommendations.append("에너지 보강: 발성 워밍업(e,o), 표정 스트레칭")
        
        if distributions['anger'] > 0.15 or distributions['disgust'] > 0.15:
            recommendations.append("표정 위생: 미간 이완, 부정적 표정 자각 훈련")
        
        # 미소 관련
        smile_mean = signals['smile_mean'] or 0
        if smile_mean < 0.4:
            recommendations.append("친근감 강화: 은은한 미소 유지(40~60%)")
        
        # 얼굴 긴장 관련
        eye_squeeze = signals['eye_squeeze_mean'] or 0
        lip_press = signals['lip_press_mean'] or 0
        if eye_squeeze > 0.4 or lip_press > 0.4:
            recommendations.append("얼굴 근긴장 이완: 턱/입 주변 이완 루틴")
        
        # 기본 추천사항이 없으면 일반적인 조언 제공
        if not recommendations:
            if metrics['confidence'] >= 70:
                recommendations.append("현재 상태를 유지하며 실전에서도 자신감을 발휘하세요.")
            recommendations.append("초반 자기소개에서 은은한 미소로 첫인상을 개선하세요.")
            recommendations.append("답변 시작 전 짧은 호흡으로 안정감을 높이세요.")
        
        return recommendations[:3]  # 최대 3개만 반환
    
    def _generate_summary(self, metrics: Dict[str, float], distributions: Dict[str, float], 
                         signals: Dict[str, Optional[float]], grade: str) -> List[str]:
        """3줄 요약 생성"""
        summary_lines = []
        
        # 긍정적 요소 파악
        positive_ratio = distributions['happy'] + distributions['neutral']
        smile_mean = signals['smile_mean'] or 0
        
        if positive_ratio > 0.6 and smile_mean > 0.4:
            summary_lines.append("은은한 미소와 안정된 중립 표정으로 긍정 인상이 유지되었습니다.")
        elif positive_ratio > 0.5:
            summary_lines.append("전반적으로 중립적이고 안정된 표정을 보여주고 있습니다.")
        else:
            summary_lines.append("표정에서 약간의 긴장이나 불안 신호가 감지되었습니다.")
        
        # 개선 포인트
        if metrics['nervousness'] > 50 or (signals['eye_squeeze_mean'] or 0) > 0.3:
            summary_lines.append("일부 구간에서 눈가 긴장이 포착되어 긴장 지수를 소폭 상승시켰습니다.")
        elif metrics['stress'] > 40:
            summary_lines.append("부정적 감정이 일부 감지되어 스트레스 관리가 필요합니다.")
        else:
            summary_lines.append("감정적으로 안정된 상태를 잘 유지하고 있습니다.")
        
        # 종합 평가
        if grade in ['A+', 'A']:
            summary_lines.append("종합적으로는 준비도가 양호하며, 초반 10초의 미소 유지가 성과를 높입니다.")
        elif grade == 'B':
            summary_lines.append("준비도는 보통 수준이며, 자신감 향상을 통해 더 나은 결과를 기대할 수 있습니다.")
        else:
            summary_lines.append("면접 준비도 향상을 위해 긴장 완화와 표정 관리 연습이 필요합니다.")
        
        return summary_lines[:3]
    
    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """메인 분석 함수"""
        # 입력 데이터 파싱
        parsed_data = self._parse_input(data)
        distributions = parsed_data['distributions']
        signals = parsed_data['signals']
        
        # 지표 계산
        metrics = self._calculate_metrics(distributions, signals)
        
        # 종합 준비도 및 등급
        interview_readiness, grade = self._calculate_interview_readiness(metrics)
        
        # 추천사항 생성
        recommendations = self._generate_recommendations(metrics, distributions, signals)
        
        # 3줄 요약 생성
        summary_lines = self._generate_summary(metrics, distributions, signals, grade)
        
        # 데이터 품질 주석
        notes = []
        if signals['blink_per_min'] is None or signals['blink_per_min'] == 0:
            notes.append("깜박임 데이터 미수집")
        if parsed_data['frames_info']['frames'] < 100:
            notes.append("분석 프레임 수가 적어 신뢰도가 제한될 수 있음")
        
        return {
            "summary": {
                "grade": grade,
                "interview_readiness": interview_readiness,
                "one_liners": summary_lines
            },
            "metrics": {
                "confidence": metrics['confidence'],
                "approachability": metrics['approachability'],
                "nervousness": metrics['nervousness'],
                "stress": metrics['stress'],
                "anxiety": metrics['anxiety'],
                "stability": metrics['stability']
            },
            "distributions": {
                **distributions,
                "positive_ratio": metrics['positive_ratio']
            },
            "signals": signals,
            "recommendations": recommendations,
            "notes": notes
        }


def main():
    """테스트 및 사용 예시"""
    analyzer = InterviewEmotionAnalyzer()
    
    # 예시 1: 집계 분포 형태
    sample_data_1 = {
        "class_distribution": {
            "happy": 0.18, "neutral": 0.52, "sad": 0.06,
            "anger": 0.03, "disgust": 0.02, "fear": 0.17, "surprise": 0.02
        },
        "facial_metrics": {"smile_mean": 58.2},
        "tension_features": {
            "eye_squeeze_mean": 31.0, "lip_press_mean": 27.0, "blink_per_min": 16
        },
        "details": {"frames_analyzed": 600, "fps_effective": 10.0}
    }
    
    result = analyzer.analyze(sample_data_1)
    print("=== 면접 감정 분석 결과 ===")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()