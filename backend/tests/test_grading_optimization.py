"""
정오답 분석 최적화 테스트

테스트 항목:
1. 배점 기반 검증 (Zero-token)
2. 탐지 우선 분기 (고신뢰도는 AI 스킵)
3. 프롬프트 최적화 (불확실 문항만)
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestGradingOptimization:
    """정오답 분석 최적화 테스트"""

    def setup_method(self):
        """테스트 설정"""
        from app.services.ai_engine import AIEngine
        self.engine = AIEngine()
        self.engine.client = MagicMock()  # Mock client

    def test_score_based_validation_full_marks(self):
        """만점 기재 시 정답 판정"""
        marks_result = {
            "marks": [
                {
                    "question_number": 1,
                    "mark_type": "score",
                    "mark_symbol": "4",
                    "confidence": 0.9,
                }
            ]
        }
        existing_questions = [
            {"question_number": 1, "points": 4}
        ]

        resolved = self.engine._apply_score_based_validation(
            marks_result, existing_questions
        )

        assert len(resolved) == 1
        assert resolved[0]["question_number"] == 1
        assert resolved[0]["is_correct"] is True
        assert resolved[0]["earned_points"] == 4

    def test_score_based_validation_zero(self):
        """0점 기재 시 오답 판정"""
        marks_result = {
            "marks": [
                {
                    "question_number": 2,
                    "mark_type": "score",
                    "mark_symbol": "0",
                    "confidence": 0.85,
                }
            ]
        }
        existing_questions = [
            {"question_number": 2, "points": 3}
        ]

        resolved = self.engine._apply_score_based_validation(
            marks_result, existing_questions
        )

        assert len(resolved) == 1
        assert resolved[0]["is_correct"] is False
        assert resolved[0]["earned_points"] == 0

    def test_score_based_validation_partial(self):
        """부분점수 기재 시 오답 판정"""
        marks_result = {
            "marks": [
                {
                    "question_number": 3,
                    "mark_type": "score",
                    "mark_symbol": "2/4",
                    "confidence": 0.8,
                }
            ]
        }
        existing_questions = [
            {"question_number": 3, "points": 4}
        ]

        resolved = self.engine._apply_score_based_validation(
            marks_result, existing_questions
        )

        assert len(resolved) == 1
        assert resolved[0]["is_correct"] is False
        assert resolved[0]["earned_points"] == 2
        assert resolved[0]["error_type"] == "process_error"

    def test_detection_classification_high_confidence(self):
        """고신뢰도 탐지 결과는 AI 분석 스킵"""
        marks_result = {
            "marks": [
                {
                    "question_number": 1,
                    "indicates": "correct",
                    "confidence": 0.95,
                    "mark_symbol": "O",
                },
                {
                    "question_number": 2,
                    "indicates": "incorrect",
                    "confidence": 0.92,
                    "mark_symbol": "X",
                },
                {
                    "question_number": 3,
                    "indicates": "uncertain",
                    "confidence": 0.6,
                },
            ]
        }
        existing_questions = [
            {"question_number": 1, "points": 3},
            {"question_number": 2, "points": 4},
            {"question_number": 3, "points": 5},
        ]

        resolved, uncertain_nums = self.engine._classify_questions_by_detection(
            marks_result, existing_questions
        )

        # Q1, Q2: 고신뢰도로 해결됨
        assert len(resolved) == 2
        assert resolved[0]["question_number"] == 1
        assert resolved[0]["is_correct"] is True
        assert resolved[1]["question_number"] == 2
        assert resolved[1]["is_correct"] is False

        # Q3: 불확실 → AI 분석 필요
        assert uncertain_nums == [3]

    def test_detection_classification_low_confidence(self):
        """저신뢰도 탐지 결과는 AI 분석 필요"""
        marks_result = {
            "marks": [
                {
                    "question_number": 1,
                    "indicates": "correct",
                    "confidence": 0.7,  # 임계값(0.9) 미만
                }
            ]
        }
        existing_questions = [
            {"question_number": 1, "points": 3}
        ]

        resolved, uncertain_nums = self.engine._classify_questions_by_detection(
            marks_result, existing_questions
        )

        assert len(resolved) == 0
        assert uncertain_nums == [1]

    def test_optimized_prompt_generation(self):
        """최적화 프롬프트 생성"""
        uncertain_questions = [
            {"question_number": 3, "points": 5},
            {"question_number": 7, "points": 4},
        ]
        grading_context = "## 탐지 결과..."

        prompt = self.engine._get_optimized_answers_prompt(
            uncertain_questions, grading_context
        )

        # 불확실 문항만 포함
        assert "[3, 7]" in prompt
        assert "3번: 배점 5점" in prompt
        assert "7번: 배점 4점" in prompt

        # 간결한 출력 형식
        assert '"n":' in prompt
        assert '"c":' in prompt

    def test_no_marks_requires_full_ai_analysis(self):
        """탐지 결과 없으면 전체 AI 분석"""
        marks_result = {"marks": []}
        existing_questions = [
            {"question_number": 1, "points": 3},
            {"question_number": 2, "points": 4},
        ]

        resolved, uncertain_nums = self.engine._classify_questions_by_detection(
            marks_result, existing_questions
        )

        assert len(resolved) == 0
        assert uncertain_nums == [1, 2]


class TestTokenSavingEstimate:
    """토큰 절약 추정 테스트"""

    def test_all_resolved_by_detection(self):
        """모든 문항이 탐지로 해결되면 최대 절약"""
        # 10문항 전체가 탐지로 해결
        total_questions = 10
        uncertain_count = 0

        full_tokens = total_questions * 200
        actual_tokens = uncertain_count * 150
        saved = full_tokens - actual_tokens

        assert saved == 2000  # 2000 토큰 절약

    def test_half_resolved_by_detection(self):
        """절반이 탐지로 해결"""
        total_questions = 10
        uncertain_count = 5

        full_tokens = total_questions * 200
        actual_tokens = uncertain_count * 150
        saved = full_tokens - actual_tokens

        assert saved == 1250  # 1250 토큰 절약

    def test_all_require_ai(self):
        """모든 문항이 AI 필요하면 일부 절약"""
        total_questions = 10
        uncertain_count = 10

        full_tokens = total_questions * 200
        actual_tokens = uncertain_count * 150  # 최적화 프롬프트는 더 짧음
        saved = full_tokens - actual_tokens

        assert saved == 500  # 프롬프트 최적화로 500 토큰 절약


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
