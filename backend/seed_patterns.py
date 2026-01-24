"""
패턴 시스템 초기 데이터 시드
수학 문제 유형별 카테고리, 오류 패턴, 기본 프롬프트 템플릿 생성
"""
import asyncio
import sys
from pathlib import Path

# Windows console encoding fix
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

# 프로젝트 루트를 path에 추가
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal as async_session
from app.models.pattern import (
    ProblemCategory,
    ProblemType,
    ErrorPattern,
    PromptTemplate,
)


async def seed_categories():
    """문제 카테고리 (대분류) 시드"""
    categories = [
        {"name": "수와 연산", "description": "정수, 유리수, 실수의 연산", "display_order": 1},
        {"name": "문자와 식", "description": "다항식, 인수분해, 방정식", "display_order": 2},
        {"name": "함수", "description": "일차함수, 이차함수, 그래프", "display_order": 3},
        {"name": "기하", "description": "도형, 좌표, 벡터", "display_order": 4},
        {"name": "확률과 통계", "description": "경우의 수, 확률, 통계", "display_order": 5},
    ]

    async with async_session() as db:
        for cat_data in categories:
            # 중복 확인
            result = await db.execute(
                select(ProblemCategory).where(ProblemCategory.name == cat_data["name"])
            )
            if result.scalar_one_or_none():
                print(f"  [건너뜀] 카테고리 '{cat_data['name']}' 이미 존재")
                continue

            category = ProblemCategory(**cat_data)
            db.add(category)
            print(f"  [추가] 카테고리: {cat_data['name']}")

        await db.commit()
        print("✓ 카테고리 시드 완료")


async def seed_problem_types():
    """문제 유형 (세부 분류) 시드"""
    async with async_session() as db:
        # 카테고리 ID 조회
        result = await db.execute(select(ProblemCategory))
        categories = {c.name: c.id for c in result.scalars().all()}

        if not categories:
            print("  [오류] 카테고리가 없습니다. 먼저 seed_categories를 실행하세요.")
            return

        problem_types = [
            # 수와 연산
            {
                "category": "수와 연산",
                "name": "정수의 사칙연산",
                "grade_levels": ["중1"],
                "keywords": ["정수", "덧셈", "뺄셈", "곱셈", "나눗셈", "음수"],
                "core_concepts": ["부호 규칙", "연산 순서"],
            },
            {
                "category": "수와 연산",
                "name": "유리수의 계산",
                "grade_levels": ["중1", "중2"],
                "keywords": ["분수", "유리수", "통분", "약분"],
                "core_concepts": ["통분", "약분", "분수 연산"],
            },

            # 문자와 식
            {
                "category": "문자와 식",
                "name": "일차방정식",
                "grade_levels": ["중1", "중2"],
                "keywords": ["방정식", "일차", "이항", "등호", "미지수"],
                "core_concepts": ["이항", "등호 성질", "미지수"],
            },
            {
                "category": "문자와 식",
                "name": "연립방정식",
                "grade_levels": ["중2"],
                "keywords": ["연립", "대입법", "가감법", "소거"],
                "core_concepts": ["대입법", "가감법", "변수 소거"],
            },
            {
                "category": "문자와 식",
                "name": "이차방정식",
                "grade_levels": ["중3", "고1"],
                "keywords": ["이차", "인수분해", "근의 공식", "판별식"],
                "core_concepts": ["인수분해", "근의 공식", "판별식"],
            },
            {
                "category": "문자와 식",
                "name": "인수분해",
                "grade_levels": ["중3", "고1"],
                "keywords": ["인수분해", "공통인수", "완전제곱", "곱셈공식"],
                "core_concepts": ["공통인수", "완전제곱식", "곱셈공식"],
            },

            # 함수
            {
                "category": "함수",
                "name": "일차함수",
                "grade_levels": ["중2"],
                "keywords": ["일차함수", "기울기", "y절편", "그래프"],
                "core_concepts": ["기울기", "y절편", "직선 그래프"],
            },
            {
                "category": "함수",
                "name": "이차함수",
                "grade_levels": ["중3", "고1"],
                "keywords": ["이차함수", "포물선", "꼭짓점", "대칭축"],
                "core_concepts": ["꼭짓점", "대칭축", "포물선"],
            },

            # 기하
            {
                "category": "기하",
                "name": "삼각형의 성질",
                "grade_levels": ["중1", "중2"],
                "keywords": ["삼각형", "내각", "외각", "합동", "닮음"],
                "core_concepts": ["내각의 합", "외각", "합동 조건"],
            },
            {
                "category": "기하",
                "name": "피타고라스 정리",
                "grade_levels": ["중2", "중3"],
                "keywords": ["피타고라스", "직각삼각형", "빗변"],
                "core_concepts": ["a² + b² = c²", "직각삼각형"],
            },
            {
                "category": "기하",
                "name": "원의 성질",
                "grade_levels": ["중3", "고1"],
                "keywords": ["원", "호", "현", "접선", "원주각"],
                "core_concepts": ["중심각", "원주각", "접선"],
            },

            # 확률과 통계
            {
                "category": "확률과 통계",
                "name": "경우의 수",
                "grade_levels": ["중2", "중3"],
                "keywords": ["경우의 수", "순열", "조합"],
                "core_concepts": ["합의 법칙", "곱의 법칙"],
            },
            {
                "category": "확률과 통계",
                "name": "확률",
                "grade_levels": ["중2", "중3", "고1"],
                "keywords": ["확률", "사건", "독립", "종속"],
                "core_concepts": ["수학적 확률", "독립사건", "조건부 확률"],
            },
        ]

        for type_data in problem_types:
            category_name = type_data.pop("category")
            category_id = categories.get(category_name)

            if not category_id:
                print(f"  [건너뜀] 카테고리 '{category_name}' 없음")
                continue

            # 중복 확인
            result = await db.execute(
                select(ProblemType).where(
                    ProblemType.name == type_data["name"],
                    ProblemType.category_id == category_id
                )
            )
            if result.scalar_one_or_none():
                print(f"  [건너뜀] 유형 '{type_data['name']}' 이미 존재")
                continue

            problem_type = ProblemType(category_id=category_id, **type_data)
            db.add(problem_type)
            print(f"  [추가] 유형: {type_data['name']}")

        await db.commit()
        print("✓ 문제 유형 시드 완료")


async def seed_error_patterns():
    """오류 패턴 시드"""
    async with async_session() as db:
        # 문제 유형 ID 조회
        result = await db.execute(select(ProblemType))
        types = {t.name: t.id for t in result.scalars().all()}

        if not types:
            print("  [오류] 문제 유형이 없습니다. 먼저 seed_problem_types를 실행하세요.")
            return

        error_patterns = [
            # 일차방정식 오류 패턴
            {
                "problem_type": "일차방정식",
                "name": "이항 시 부호 미변경",
                "error_type": "concept",
                "frequency": "very_high",
                "feedback_message": "등호를 넘길 때는 부호가 바뀌어야 해요!",
                "feedback_detail": "양변에 같은 수를 더하거나 빼면 등식이 성립합니다. 이항은 양변에서 같은 수를 빼는 것과 같으므로 부호가 바뀝니다.",
                "wrong_examples": [
                    {"problem": "3x + 5 = 11", "wrong_answer": "3x = 16", "wrong_process": "+5를 이항했지만 부호 유지"},
                    {"problem": "2x - 3 = 7", "wrong_answer": "2x = 4", "wrong_process": "-3을 이항했지만 부호 유지"},
                ],
                "correct_examples": [
                    {"problem": "3x + 5 = 11", "correct_answer": "x = 2", "correct_process": "3x = 11 - 5 = 6, x = 2"},
                ],
                "detection_keywords": ["이항", "부호", "등호"],
            },
            {
                "problem_type": "일차방정식",
                "name": "계수 나눗셈 순서 오류",
                "error_type": "calculation",
                "frequency": "high",
                "feedback_message": "계수로 나눌 때는 양변을 모두 나눠야 해요!",
                "feedback_detail": "ax = b에서 x를 구하려면 양변을 a로 나눕니다. x = b/a가 됩니다.",
                "wrong_examples": [
                    {"problem": "5x = 20", "wrong_answer": "x = 100", "wrong_process": "20 × 5로 계산"},
                ],
                "correct_examples": [
                    {"problem": "5x = 20", "correct_answer": "x = 4", "correct_process": "양변을 5로 나눔: x = 20/5 = 4"},
                ],
                "detection_keywords": ["계수", "나눗셈", "곱셈"],
            },

            # 이차방정식 오류 패턴
            {
                "problem_type": "이차방정식",
                "name": "근의 공식 부호 오류",
                "error_type": "concept",
                "frequency": "high",
                "feedback_message": "근의 공식에서 -b의 부호에 주의하세요!",
                "feedback_detail": "x = (-b ± √(b²-4ac)) / 2a 에서 b 앞의 마이너스를 놓치기 쉽습니다.",
                "wrong_examples": [
                    {"problem": "x² - 4x + 3 = 0", "wrong_answer": "x = (4 ± 2)/2", "wrong_process": "-b를 b로 잘못 적용"},
                ],
                "correct_examples": [
                    {"problem": "x² - 4x + 3 = 0", "correct_answer": "x = 1 또는 x = 3", "correct_process": "x = (4 ± 2)/2"},
                ],
                "detection_keywords": ["근의 공식", "-b", "부호"],
            },
            {
                "problem_type": "이차방정식",
                "name": "인수분해 누락",
                "error_type": "process",
                "frequency": "medium",
                "feedback_message": "이차방정식은 먼저 인수분해 가능한지 확인해보세요!",
                "feedback_detail": "근의 공식보다 인수분해가 더 빠르고 정확한 경우가 많습니다.",
                "wrong_examples": [
                    {"problem": "x² - 5x + 6 = 0", "wrong_answer": "복잡한 계산 후 오답", "wrong_process": "인수분해 대신 근의 공식 사용"},
                ],
                "correct_examples": [
                    {"problem": "x² - 5x + 6 = 0", "correct_answer": "x = 2 또는 x = 3", "correct_process": "(x-2)(x-3) = 0"},
                ],
                "detection_keywords": ["인수분해", "이차방정식"],
            },

            # 일차함수 오류 패턴
            {
                "problem_type": "일차함수",
                "name": "기울기 부호 혼동",
                "error_type": "concept",
                "frequency": "high",
                "feedback_message": "기울기의 부호는 그래프의 방향을 결정해요!",
                "feedback_detail": "기울기가 양수면 오른쪽 위로, 음수면 오른쪽 아래로 향합니다.",
                "wrong_examples": [
                    {"problem": "y = -2x + 3의 기울기", "wrong_answer": "2", "wrong_process": "부호 무시"},
                ],
                "correct_examples": [
                    {"problem": "y = -2x + 3의 기울기", "correct_answer": "-2", "correct_process": "x의 계수가 기울기"},
                ],
                "detection_keywords": ["기울기", "부호", "음수"],
            },

            # 이차함수 오류 패턴
            {
                "problem_type": "이차함수",
                "name": "꼭짓점 좌표 부호 오류",
                "error_type": "concept",
                "frequency": "very_high",
                "feedback_message": "y = (x-p)² + q에서 꼭짓점은 (p, q)예요!",
                "feedback_detail": "(x-p)에서 p의 부호에 주의하세요. x-2라면 꼭짓점의 x좌표는 +2입니다.",
                "wrong_examples": [
                    {"problem": "y = (x-3)² + 2의 꼭짓점", "wrong_answer": "(-3, 2)", "wrong_process": "부호 반대로 적용"},
                ],
                "correct_examples": [
                    {"problem": "y = (x-3)² + 2의 꼭짓점", "correct_answer": "(3, 2)", "correct_process": "x-3=0일 때 x=3"},
                ],
                "detection_keywords": ["꼭짓점", "좌표", "부호"],
            },

            # 피타고라스 정리 오류 패턴
            {
                "problem_type": "피타고라스 정리",
                "name": "빗변 위치 오류",
                "error_type": "concept",
                "frequency": "high",
                "feedback_message": "피타고라스 정리에서 빗변(가장 긴 변)이 c예요!",
                "feedback_detail": "a² + b² = c²에서 c는 항상 직각의 대변(빗변)입니다.",
                "wrong_examples": [
                    {"problem": "직각삼각형 3, 4, ?", "wrong_answer": "7", "wrong_process": "3+4로 계산"},
                ],
                "correct_examples": [
                    {"problem": "직각삼각형 3, 4, ?", "correct_answer": "5", "correct_process": "√(3²+4²) = √25 = 5"},
                ],
                "detection_keywords": ["피타고라스", "빗변", "직각"],
            },

            # 확률 오류 패턴
            {
                "problem_type": "확률",
                "name": "독립사건 곱셈 누락",
                "error_type": "concept",
                "frequency": "medium",
                "feedback_message": "독립사건의 동시 발생 확률은 곱해야 해요!",
                "feedback_detail": "두 독립사건 A, B가 동시에 일어날 확률은 P(A) × P(B)입니다.",
                "wrong_examples": [
                    {"problem": "동전 2번 앞면 확률", "wrong_answer": "1/2 + 1/2 = 1", "wrong_process": "확률을 더함"},
                ],
                "correct_examples": [
                    {"problem": "동전 2번 앞면 확률", "correct_answer": "1/4", "correct_process": "1/2 × 1/2 = 1/4"},
                ],
                "detection_keywords": ["독립", "동시", "확률"],
            },
        ]

        for pattern_data in error_patterns:
            type_name = pattern_data.pop("problem_type")
            type_id = types.get(type_name)

            if not type_id:
                print(f"  [건너뜀] 유형 '{type_name}' 없음")
                continue

            # 중복 확인
            result = await db.execute(
                select(ErrorPattern).where(
                    ErrorPattern.name == pattern_data["name"],
                    ErrorPattern.problem_type_id == type_id
                )
            )
            if result.scalar_one_or_none():
                print(f"  [건너뜀] 패턴 '{pattern_data['name']}' 이미 존재")
                continue

            pattern = ErrorPattern(problem_type_id=type_id, **pattern_data)
            db.add(pattern)
            print(f"  [추가] 오류 패턴: {pattern_data['name']}")

        await db.commit()
        print("✓ 오류 패턴 시드 완료")


async def seed_prompt_templates():
    """프롬프트 템플릿 시드"""
    async with async_session() as db:
        templates = [
            # 기본 프롬프트
            {
                "name": "기본 분석 프롬프트",
                "template_type": "base",
                "content": """당신은 전문적인 수학 시험지 분석 AI입니다.

## 역할
- 시험지의 각 문제를 정확하게 인식합니다
- 문제 유형과 난이도를 분류합니다
- 학생 답안이 있다면 오류를 분석합니다
- 교육적인 피드백을 제공합니다

## 분석 원칙
1. 정확성: 문제와 답안을 정확히 인식
2. 객관성: 일관된 기준으로 평가
3. 교육성: 학습에 도움이 되는 피드백 제공""",
                "priority": 100,
            },

            # 시험지 유형별 템플릿
            {
                "name": "빈 시험지 분석",
                "template_type": "analysis_guide",
                "content": "이 시험지는 답안이 작성되지 않은 빈 시험지입니다. 문제 추출과 유형 분류에 집중하세요.",
                "conditions": {"exam_paper_type": "blank"},
                "priority": 50,
            },
            {
                "name": "채점된 시험지 분석",
                "template_type": "analysis_guide",
                "content": """채점이 완료된 시험지입니다.
- O, X 표시를 확인하여 정답/오답을 파악하세요
- 오답 문항의 오류 유형을 분석하세요
- 채점 결과와 AI 분석이 다르면 신뢰도를 낮추세요""",
                "conditions": {"exam_paper_type": "answered"},
                "priority": 50,
            },

            # 학년별 템플릿
            {
                "name": "중학교 1학년 분석 가이드",
                "template_type": "analysis_guide",
                "content": """중1 수준의 시험지입니다.
주요 확인 사항:
- 정수의 사칙연산 (특히 음수 계산)
- 문자와 식의 기초 개념
- 일차방정식 기본 풀이""",
                "conditions": {"grade_levels": ["중1"]},
                "priority": 30,
            },
            {
                "name": "중학교 3학년 분석 가이드",
                "template_type": "analysis_guide",
                "content": """중3 수준의 시험지입니다.
주요 확인 사항:
- 이차방정식 풀이 (인수분해, 근의 공식)
- 이차함수 그래프 분석
- 피타고라스 정리 응용""",
                "conditions": {"grade_levels": ["중3"]},
                "priority": 30,
            },

            # 오류 탐지 템플릿
            {
                "name": "계산 오류 탐지",
                "template_type": "error_detection",
                "content": """계산 오류 탐지 시 확인사항:
- 부호 처리 (+, - 변환)
- 사칙연산 순서
- 분수/소수 변환
- 제곱근 계산""",
                "priority": 40,
            },
            {
                "name": "개념 오류 탐지",
                "template_type": "error_detection",
                "content": """개념 오류 탐지 시 확인사항:
- 정의/공식 적용 오류
- 조건 해석 오류
- 그래프/도형 성질 오해
- 변수/상수 혼동""",
                "priority": 40,
            },

            # 피드백 스타일 템플릿
            {
                "name": "격려형 피드백",
                "template_type": "feedback_style",
                "content": """피드백 작성 원칙:
- 긍정적인 부분을 먼저 언급
- 오류를 지적할 때 "~하면 더 좋아요" 형식 사용
- 다음 단계 학습 방향 제시
- 격려의 말로 마무리""",
                "priority": 20,
            },
        ]

        for template_data in templates:
            # 중복 확인
            result = await db.execute(
                select(PromptTemplate).where(PromptTemplate.name == template_data["name"])
            )
            if result.scalar_one_or_none():
                print(f"  [건너뜀] 템플릿 '{template_data['name']}' 이미 존재")
                continue

            template = PromptTemplate(**template_data)
            db.add(template)
            print(f"  [추가] 템플릿: {template_data['name']}")

        await db.commit()
        print("✓ 프롬프트 템플릿 시드 완료")


async def main():
    """전체 시드 실행"""
    print("\n" + "="*50)
    print("패턴 시스템 초기 데이터 시드")
    print("="*50 + "\n")

    print("[1/4] 문제 카테고리 시드...")
    await seed_categories()

    print("\n[2/4] 문제 유형 시드...")
    await seed_problem_types()

    print("\n[3/4] 오류 패턴 시드...")
    await seed_error_patterns()

    print("\n[4/4] 프롬프트 템플릿 시드...")
    await seed_prompt_templates()

    print("\n" + "="*50)
    print("✅ 패턴 시스템 초기화 완료!")
    print("="*50 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
