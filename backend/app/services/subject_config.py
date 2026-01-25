"""
과목별 설정 관리 모듈

각 과목(수학, 영어 등)에 대한 question_type, error_type, 학년별 가이드라인을 정의합니다.
"""

from typing import TypedDict


class SubjectConfig(TypedDict):
    """과목별 설정 타입"""
    name: str
    question_types: dict[str, str]  # {코드: 한글라벨}
    error_types: dict[str, str]  # {코드: 한글라벨}
    grade_guidelines: dict[str, list[str]]  # {학년: [가이드라인 목록]}


# 수학 과목 설정 (기존)
MATH_CONFIG: SubjectConfig = {
    "name": "수학",
    "question_types": {
        "calculation": "계산",
        "geometry": "도형",
        "application": "응용",
        "proof": "증명",
        "graph": "그래프",
        "statistics": "통계",
        "concept": "개념",
        "other": "기타",
    },
    "error_types": {
        "calculation_error": "계산 실수",
        "concept_error": "개념 오해",
        "careless_mistake": "단순 실수",
        "process_error": "풀이 오류",
        "incomplete": "미완성",
    },
    "grade_guidelines": {
        "중1": [
            "정수와 유리수 계산 오류에 주의하세요.",
            "문자와 식에서 동류항 처리 확인하세요.",
            "일차방정식 풀이 과정을 점검하세요.",
        ],
        "중2": [
            "연립방정식 풀이 과정을 단계별로 확인하세요.",
            "일차함수 그래프 해석 능력을 평가하세요.",
            "도형의 성질 적용을 확인하세요.",
        ],
        "중3": [
            "이차방정식의 근의 공식 적용을 확인하세요.",
            "인수분해 과정의 정확성을 검토하세요.",
            "이차함수 그래프와 최대/최소 문제를 확인하세요.",
        ],
        "고1": [
            "집합과 명제의 논리적 오류를 확인하세요.",
            "다항식 연산의 정확성을 검토하세요.",
            "방정식과 부등식의 풀이를 점검하세요.",
        ],
        "고2": [
            "삼각함수 공식 적용을 확인하세요.",
            "수열의 일반항과 합 공식을 검토하세요.",
            "미분과 적분의 기본 개념을 점검하세요.",
        ],
        "고3": [
            "확률과 통계의 복합 문제를 분석하세요.",
            "미적분 응용 문제의 풀이 과정을 확인하세요.",
            "기하와 벡터 문제의 정확성을 검토하세요.",
        ],
    },
}

# 영어 과목 설정 (신규)
ENGLISH_CONFIG: SubjectConfig = {
    "name": "영어",
    "question_types": {
        "vocabulary": "어휘",
        "grammar": "문법",
        "reading_main_idea": "대의파악",
        "reading_detail": "세부정보",
        "reading_inference": "추론",
        "listening": "듣기",
        "writing": "영작",
        "sentence_completion": "문장완성",
        "conversation": "대화문",
        "other": "기타",
    },
    "error_types": {
        "tense_error": "시제오류",
        "word_order_error": "어순오류",
        "vocabulary_error": "어휘오류",
        "comprehension_error": "독해오류",
        "listening_error": "청취오류",
        "careless_mistake": "단순실수",
    },
    "grade_guidelines": {
        "중1": [
            "be동사와 일반동사 구분에 주의하세요.",
            "기본 시제(현재, 과거, 미래) 활용을 확인하세요.",
            "기초 어휘 500단어 수준의 문제입니다.",
            "짧은 지문의 대의파악 능력을 평가하세요.",
        ],
        "중2": [
            "to부정사와 동명사 구분을 확인하세요.",
            "비교급과 최상급 표현을 평가하세요.",
            "조동사(can, may, must 등) 사용을 점검하세요.",
            "중간 길이 지문의 세부정보 파악 능력을 확인하세요.",
        ],
        "중3": [
            "관계대명사(who, which, that) 사용을 확인하세요.",
            "현재완료 시제 활용을 평가하세요.",
            "수동태 문장 구조를 점검하세요.",
            "추론 문제의 논리적 흐름을 확인하세요.",
        ],
        "고1": [
            "가정법 과거와 과거완료를 구분하세요.",
            "분사구문 해석 능력을 평가하세요.",
            "복잡한 구문(강조, 도치 등)을 점검하세요.",
            "긴 지문의 빈칸 추론 능력을 확인하세요.",
        ],
        "고2": [
            "수능형 어휘 문제 패턴을 분석하세요.",
            "문맥상 적절한 어휘 선택을 평가하세요.",
            "글의 순서 배열 문제를 점검하세요.",
            "문장 삽입 위치 파악 능력을 확인하세요.",
        ],
        "고3": [
            "고난도 추론 문제(빈칸, 함축 의미)를 분석하세요.",
            "복잡한 지문의 요지/주제 파악을 평가하세요.",
            "실용문(광고, 안내문 등) 독해를 점검하세요.",
            "장문 독해의 세부 정보 파악을 확인하세요.",
        ],
    },
}

# 과목별 설정 매핑
SUBJECT_CONFIGS: dict[str, SubjectConfig] = {
    "수학": MATH_CONFIG,
    "영어": ENGLISH_CONFIG,
}


def get_subject_config(subject: str) -> SubjectConfig:
    """
    과목명으로 해당 과목의 설정을 반환합니다.

    Args:
        subject: 과목명 (수학, 영어 등)

    Returns:
        SubjectConfig: 해당 과목의 설정. 없으면 수학 기본값 반환.
    """
    return SUBJECT_CONFIGS.get(subject, MATH_CONFIG)


def get_question_types(subject: str) -> dict[str, str]:
    """과목별 문항 유형 목록 반환"""
    config = get_subject_config(subject)
    return config["question_types"]


def get_error_types(subject: str) -> dict[str, str]:
    """과목별 오류 유형 목록 반환"""
    config = get_subject_config(subject)
    return config["error_types"]


def get_grade_guidelines(subject: str, grade: str) -> list[str]:
    """과목 및 학년별 가이드라인 반환"""
    config = get_subject_config(subject)
    return config["grade_guidelines"].get(grade, [])


def get_valid_question_types(subject: str) -> set[str]:
    """과목별 유효한 question_type 코드 집합 반환"""
    config = get_subject_config(subject)
    return set(config["question_types"].keys())


def get_valid_error_types(subject: str) -> set[str]:
    """과목별 유효한 error_type 코드 집합 반환"""
    config = get_subject_config(subject)
    return set(config["error_types"].keys())


def get_supported_subjects() -> list[str]:
    """지원되는 과목 목록 반환"""
    return list(SUBJECT_CONFIGS.keys())
