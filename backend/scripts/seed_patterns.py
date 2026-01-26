"""
한국 수학 교육과정 기반 패턴 시스템 시드 데이터
중학교/고등학교 수학 문제 유형 및 오류 패턴

실행: python -m scripts.seed_patterns
"""
import asyncio
import uuid
from datetime import datetime

from app.db.supabase_client import get_supabase


def now():
    return datetime.utcnow().isoformat()


def uid():
    return str(uuid.uuid4())


# ============================================
# 1. 문제 카테고리 (대분류) - 22개정 교육과정
# ============================================
CATEGORIES = [
    # 중학교 (학기별)
    {"name": "중1-1", "description": "중학교 1학년 1학기 수학", "display_order": 1},
    {"name": "중1-2", "description": "중학교 1학년 2학기 수학", "display_order": 2},
    {"name": "중2-1", "description": "중학교 2학년 1학기 수학", "display_order": 3},
    {"name": "중2-2", "description": "중학교 2학년 2학기 수학", "display_order": 4},
    {"name": "중3-1", "description": "중학교 3학년 1학기 수학", "display_order": 5},
    {"name": "중3-2", "description": "중학교 3학년 2학기 수학", "display_order": 6},

    # 고등학교 - 22개정 공통과목
    {"name": "공통수학1", "description": "다항식, 방정식과 부등식, 도형의 방정식 (22개정)", "display_order": 10},
    {"name": "공통수학2", "description": "집합과 명제, 함수, 경우의 수 (22개정)", "display_order": 11},

    # 고등학교 - 22개정 일반선택
    {"name": "대수", "description": "지수/로그/삼각함수, 수열 (22개정)", "display_order": 20},
    {"name": "미적분I", "description": "수열의 극한, 미분, 적분 기초 (22개정)", "display_order": 21},
    {"name": "미적분II", "description": "여러 가지 미분법, 적분법 (22개정)", "display_order": 22},
    {"name": "확률과 통계", "description": "순열/조합, 확률, 통계 (22개정)", "display_order": 23},
    {"name": "기하", "description": "이차곡선, 평면벡터, 공간벡터 (22개정)", "display_order": 24},
]


# ============================================
# 2. 문제 유형 (세부 분류) - 카테고리별
# - 중학교: 수와 연산, 문자와 식, 함수, 기하, 확률과 통계
# - 고등학교 22개정: 공통수학1/2, 대수, 미적분I/II, 확률과 통계, 기하
# ============================================
PROBLEM_TYPES = {
    # ==========================================
    # 중학교 (학기별)
    # ==========================================
    "중1-1": [
        {
            "name": "소인수분해",
            "grade_levels": ["중1-1", "중1"],
            "keywords": ["소인수", "소인수분해", "거듭제곱", "약수", "배수"],
            "core_concepts": ["소수", "합성수", "소인수분해", "최대공약수", "최소공배수"],
        },
        {
            "name": "정수와 유리수",
            "grade_levels": ["중1-1", "중1"],
            "keywords": ["정수", "유리수", "덧셈", "뺄셈", "곱셈", "나눗셈", "음수"],
            "core_concepts": ["부호 규칙", "절댓값", "통분", "약분"],
        },
        {
            "name": "문자와 식",
            "grade_levels": ["중1-1", "중1"],
            "keywords": ["문자", "식", "항", "계수", "차수", "다항식"],
            "core_concepts": ["항", "계수", "식의 값", "일차식"],
        },
    ],
    "중1-2": [
        {
            "name": "일차방정식",
            "grade_levels": ["중1-2", "중1"],
            "keywords": ["일차방정식", "등식", "이항", "해"],
            "core_concepts": ["등식의 성질", "이항", "방정식의 해"],
        },
        {
            "name": "좌표평면과 그래프",
            "grade_levels": ["중1-2", "중1"],
            "keywords": ["좌표", "좌표평면", "x축", "y축", "원점", "그래프"],
            "core_concepts": ["좌표", "사분면", "점의 위치"],
        },
        {
            "name": "정비례와 반비례",
            "grade_levels": ["중1-2", "중1"],
            "keywords": ["정비례", "반비례", "비례상수", "그래프"],
            "core_concepts": ["정비례 관계", "반비례 관계", "비례상수"],
        },
        {
            "name": "통계",
            "grade_levels": ["중1-2", "중1"],
            "keywords": ["자료", "평균", "중앙값", "최빈값", "도수분포표", "히스토그램"],
            "core_concepts": ["평균", "중앙값", "최빈값", "도수분포표"],
        },
    ],
    "중2-1": [
        {
            "name": "유리수와 순환소수",
            "grade_levels": ["중2-1", "중2"],
            "keywords": ["유리수", "순환소수", "유한소수", "분수"],
            "core_concepts": ["유한소수", "순환소수", "분수로 나타내기"],
        },
        {
            "name": "식의 계산",
            "grade_levels": ["중2-1", "중2"],
            "keywords": ["단항식", "다항식", "지수법칙", "곱셈공식"],
            "core_concepts": ["지수법칙", "단항식의 곱셈과 나눗셈", "다항식의 계산"],
        },
        {
            "name": "일차부등식",
            "grade_levels": ["중2-1", "중2"],
            "keywords": ["부등식", "부등호", "해집합", "수직선"],
            "core_concepts": ["부등호 방향", "음수 곱셈 시 부등호 반전", "해집합"],
        },
    ],
    "중2-2": [
        {
            "name": "연립일차방정식",
            "grade_levels": ["중2-2", "중2"],
            "keywords": ["연립방정식", "대입법", "가감법", "해"],
            "core_concepts": ["대입법", "가감법", "미지수 소거"],
        },
        {
            "name": "일차함수",
            "grade_levels": ["중2-2", "중2"],
            "keywords": ["일차함수", "기울기", "y절편", "그래프"],
            "core_concepts": ["기울기", "y절편", "x절편", "일차함수의 그래프"],
        },
        {
            "name": "확률",
            "grade_levels": ["중2-2", "중2"],
            "keywords": ["확률", "시행", "사건", "표본공간", "경우의 수"],
            "core_concepts": ["확률의 정의", "여사건", "확률의 계산"],
        },
    ],
    "중3-1": [
        {
            "name": "제곱근과 실수",
            "grade_levels": ["중3-1", "중3"],
            "keywords": ["제곱근", "루트", "무리수", "실수", "유리화"],
            "core_concepts": ["제곱근의 성질", "유리화", "실수의 대소 관계"],
        },
        {
            "name": "다항식의 곱셈과 인수분해",
            "grade_levels": ["중3-1", "중3"],
            "keywords": ["곱셈공식", "인수분해", "완전제곱식", "공통인수"],
            "core_concepts": ["곱셈공식", "인수분해 공식", "치환"],
        },
        {
            "name": "이차방정식",
            "grade_levels": ["중3-1", "중3"],
            "keywords": ["이차방정식", "근의 공식", "인수분해", "판별식"],
            "core_concepts": ["인수분해", "근의 공식", "판별식", "근과 계수의 관계"],
        },
    ],
    "중3-2": [
        {
            "name": "이차함수",
            "grade_levels": ["중3-2", "중3"],
            "keywords": ["이차함수", "포물선", "꼭짓점", "대칭축", "그래프"],
            "core_concepts": ["표준형", "일반형", "꼭짓점 공식", "이차함수의 그래프"],
        },
        {
            "name": "삼각비",
            "grade_levels": ["중3-2", "중3"],
            "keywords": ["삼각비", "sin", "cos", "tan", "직각삼각형"],
            "core_concepts": ["삼각비 정의", "특수각", "삼각비의 활용"],
        },
        {
            "name": "원의 성질",
            "grade_levels": ["중3-2", "중3"],
            "keywords": ["원", "현", "접선", "원주각", "중심각"],
            "core_concepts": ["원주각과 중심각", "접선의 성질", "원과 직선"],
        },
        {
            "name": "통계",
            "grade_levels": ["중3-2", "중3"],
            "keywords": ["대푯값", "산포도", "분산", "표준편차", "상관관계"],
            "core_concepts": ["평균", "분산", "표준편차", "상관관계"],
        },
    ],
    # ==========================================
    # 고등학교 22개정 - 공통수학1 (4단원)
    # Ⅰ. 다항식, Ⅱ. 방정식과 부등식, Ⅲ. 경우의 수, Ⅳ. 행렬
    # ==========================================
    "공통수학1": [
        # Ⅰ. 다항식
        {
            "name": "다항식의 연산",
            "grade_levels": ["고1"],
            "keywords": ["다항식", "곱셈", "나눗셈", "조립제법"],
            "core_concepts": ["다항식 곱셈과 나눗셈", "조립제법"],
        },
        {
            "name": "항등식과 나머지정리",
            "grade_levels": ["고1"],
            "keywords": ["항등식", "나머지정리", "인수정리"],
            "core_concepts": ["항등식", "나머지정리", "인수정리"],
        },
        {
            "name": "인수분해",
            "grade_levels": ["고1"],
            "keywords": ["인수분해", "공통인수", "치환"],
            "core_concepts": ["인수분해 공식", "치환을 이용한 인수분해"],
        },
        # Ⅱ. 방정식과 부등식
        {
            "name": "복소수",
            "grade_levels": ["고1"],
            "keywords": ["복소수", "허수", "켤레복소수", "i"],
            "core_concepts": ["복소수 연산", "켤레복소수"],
        },
        {
            "name": "이차방정식",
            "grade_levels": ["고1"],
            "keywords": ["이차방정식", "판별식", "근과 계수"],
            "core_concepts": ["근의 공식", "판별식", "근과 계수의 관계"],
        },
        {
            "name": "이차방정식과 이차함수",
            "grade_levels": ["고1"],
            "keywords": ["이차함수", "이차방정식", "그래프"],
            "core_concepts": ["이차함수와 이차방정식의 관계", "그래프"],
        },
        {
            "name": "여러 가지 방정식",
            "grade_levels": ["고1"],
            "keywords": ["삼차방정식", "사차방정식", "연립방정식"],
            "core_concepts": ["고차방정식", "연립방정식"],
        },
        {
            "name": "연립일차부등식",
            "grade_levels": ["고1"],
            "keywords": ["일차부등식", "연립부등식", "영역"],
            "core_concepts": ["연립일차부등식", "부등식의 영역"],
        },
        {
            "name": "이차부등식",
            "grade_levels": ["고1"],
            "keywords": ["이차부등식", "연립이차부등식"],
            "core_concepts": ["이차부등식", "연립이차부등식"],
        },
        # Ⅲ. 경우의 수
        {
            "name": "경우의 수",
            "grade_levels": ["고1"],
            "keywords": ["경우의 수", "합의 법칙", "곱의 법칙"],
            "core_concepts": ["합의 법칙", "곱의 법칙"],
        },
        {
            "name": "순열",
            "grade_levels": ["고1"],
            "keywords": ["순열", "팩토리얼", "원순열", "중복순열"],
            "core_concepts": ["순열 공식", "원순열", "중복순열"],
        },
        {
            "name": "조합",
            "grade_levels": ["고1"],
            "keywords": ["조합", "이항계수", "중복조합"],
            "core_concepts": ["조합 공식", "이항계수"],
        },
        # Ⅳ. 행렬
        {
            "name": "행렬",
            "grade_levels": ["고1"],
            "keywords": ["행렬", "행", "열", "성분", "행렬의 덧셈", "곱셈"],
            "core_concepts": ["행렬의 연산", "역행렬", "일차변환"],
        },
    ],

    # ==========================================
    # 고등학교 22개정 - 공통수학2 (3단원)
    # Ⅰ. 도형의 방정식, Ⅱ. 집합과 명제, Ⅲ. 함수와 그래프
    # ==========================================
    "공통수학2": [
        # Ⅰ. 도형의 방정식
        {
            "name": "평면좌표",
            "grade_levels": ["고1"],
            "keywords": ["좌표", "거리", "내분점"],
            "core_concepts": ["두 점 사이 거리", "내분점 공식"],
        },
        {
            "name": "직선의 방정식",
            "grade_levels": ["고1"],
            "keywords": ["직선", "기울기", "수직", "평행"],
            "core_concepts": ["직선의 방정식", "두 직선의 위치관계"],
        },
        {
            "name": "원의 방정식",
            "grade_levels": ["고1"],
            "keywords": ["원", "중심", "반지름", "접선"],
            "core_concepts": ["원의 방정식", "원과 직선"],
        },
        {
            "name": "도형의 이동",
            "grade_levels": ["고1"],
            "keywords": ["평행이동", "대칭이동", "회전이동"],
            "core_concepts": ["평행이동", "대칭이동"],
        },
        # Ⅱ. 집합과 명제
        {
            "name": "집합",
            "grade_levels": ["고1"],
            "keywords": ["집합", "원소", "부분집합", "합집합", "교집합"],
            "core_concepts": ["집합의 연산", "부분집합의 개수"],
        },
        {
            "name": "명제",
            "grade_levels": ["고1"],
            "keywords": ["명제", "역", "이", "대우", "진리집합"],
            "core_concepts": ["명제의 역이대우", "필요충분조건"],
        },
        # Ⅲ. 함수와 그래프
        {
            "name": "함수",
            "grade_levels": ["고1"],
            "keywords": ["함수", "정의역", "공역", "치역", "합성함수", "역함수"],
            "core_concepts": ["함수의 정의", "합성함수", "역함수"],
        },
        {
            "name": "유리함수",
            "grade_levels": ["고1"],
            "keywords": ["유리함수", "점근선", "그래프"],
            "core_concepts": ["유리함수 그래프", "점근선"],
        },
        {
            "name": "무리함수",
            "grade_levels": ["고1"],
            "keywords": ["무리함수", "루트", "그래프"],
            "core_concepts": ["무리함수 그래프", "정의역"],
        },
    ],

    # ==========================================
    # 고등학교 22개정 - 대수
    # ==========================================
    "대수": [
        {
            "name": "지수",
            "grade_levels": ["고2"],
            "keywords": ["지수", "거듭제곱", "지수법칙"],
            "core_concepts": ["지수법칙", "유리수 지수", "실수 지수"],
        },
        {
            "name": "로그",
            "grade_levels": ["고2"],
            "keywords": ["로그", "상용로그", "자연로그"],
            "core_concepts": ["로그 정의", "로그 성질", "밑 변환"],
        },
        {
            "name": "지수함수",
            "grade_levels": ["고2"],
            "keywords": ["지수함수", "그래프", "점근선"],
            "core_concepts": ["지수함수 그래프", "점근선"],
        },
        {
            "name": "로그함수",
            "grade_levels": ["고2"],
            "keywords": ["로그함수", "그래프", "역함수"],
            "core_concepts": ["로그함수 그래프", "지수함수와의 관계"],
        },
        {
            "name": "지수/로그 방정식과 부등식",
            "grade_levels": ["고2"],
            "keywords": ["지수방정식", "로그방정식", "부등식"],
            "core_concepts": ["지수방정식 풀이", "로그방정식 풀이"],
        },
        {
            "name": "삼각함수",
            "grade_levels": ["고2"],
            "keywords": ["삼각함수", "호도법", "단위원"],
            "core_concepts": ["호도법", "단위원", "삼각함수 정의"],
        },
        {
            "name": "삼각함수의 그래프",
            "grade_levels": ["고2"],
            "keywords": ["주기", "진폭", "위상"],
            "core_concepts": ["주기", "진폭", "그래프 변환"],
        },
        {
            "name": "삼각함수의 활용",
            "grade_levels": ["고2"],
            "keywords": ["사인법칙", "코사인법칙", "삼각형 넓이"],
            "core_concepts": ["사인법칙", "코사인법칙"],
        },
        {
            "name": "등차수열",
            "grade_levels": ["고2"],
            "keywords": ["등차수열", "공차", "일반항"],
            "core_concepts": ["일반항 공식", "등차중항", "등차수열의 합"],
        },
        {
            "name": "등비수열",
            "grade_levels": ["고2"],
            "keywords": ["등비수열", "공비", "일반항"],
            "core_concepts": ["일반항 공식", "등비중항", "등비수열의 합"],
        },
        {
            "name": "수열의 합",
            "grade_levels": ["고2"],
            "keywords": ["시그마", "합", "자연수 거듭제곱의 합"],
            "core_concepts": ["Σ 기호", "자연수 거듭제곱의 합"],
        },
        {
            "name": "수학적 귀납법",
            "grade_levels": ["고2"],
            "keywords": ["귀납법", "증명"],
            "core_concepts": ["귀납적 정의", "수학적 귀납법"],
        },
    ],

    # ==========================================
    # 고등학교 22개정 - 미적분I
    # ==========================================
    "미적분I": [
        {
            "name": "수열의 극한",
            "grade_levels": ["고2"],
            "keywords": ["수열", "극한", "수렴", "발산"],
            "core_concepts": ["수열의 극한", "급수", "등비급수"],
        },
        {
            "name": "급수",
            "grade_levels": ["고2"],
            "keywords": ["급수", "등비급수", "수렴", "발산"],
            "core_concepts": ["급수의 수렴", "등비급수"],
        },
        {
            "name": "함수의 극한",
            "grade_levels": ["고2"],
            "keywords": ["극한", "연속", "좌극한", "우극한"],
            "core_concepts": ["극한의 성질", "연속성"],
        },
        {
            "name": "함수의 연속",
            "grade_levels": ["고2"],
            "keywords": ["연속", "불연속", "최대최소정리"],
            "core_concepts": ["연속함수의 성질", "사잇값 정리"],
        },
        {
            "name": "미분계수와 도함수",
            "grade_levels": ["고2"],
            "keywords": ["미분계수", "도함수", "미분"],
            "core_concepts": ["미분계수 정의", "도함수"],
        },
        {
            "name": "미분법",
            "grade_levels": ["고2"],
            "keywords": ["미분", "곱의 미분", "합성함수 미분"],
            "core_concepts": ["미분 공식", "합성함수 미분법"],
        },
        {
            "name": "도함수의 활용",
            "grade_levels": ["고2"],
            "keywords": ["접선", "극값", "최대", "최소", "변화율"],
            "core_concepts": ["접선의 방정식", "증가감소", "극대극소"],
        },
        {
            "name": "부정적분",
            "grade_levels": ["고2"],
            "keywords": ["부정적분", "원시함수", "적분상수"],
            "core_concepts": ["적분 공식", "적분상수"],
        },
        {
            "name": "정적분",
            "grade_levels": ["고2"],
            "keywords": ["정적분", "구분구적법", "넓이"],
            "core_concepts": ["정적분 정의", "미적분의 기본정리"],
        },
        {
            "name": "정적분의 활용",
            "grade_levels": ["고2"],
            "keywords": ["넓이", "부피", "속도"],
            "core_concepts": ["넓이 계산", "부피 계산"],
        },
    ],

    # ==========================================
    # 고등학교 22개정 - 확률과 통계
    # ==========================================
    "확률과 통계": [
        {
            "name": "순열과 조합 심화",
            "grade_levels": ["고2"],
            "keywords": ["순열", "조합", "분할", "이항정리"],
            "core_concepts": ["같은 것이 있는 순열", "조합의 활용", "이항정리"],
        },
        {
            "name": "확률의 뜻과 활용",
            "grade_levels": ["고2"],
            "keywords": ["확률", "시행", "사건", "여사건"],
            "core_concepts": ["확률의 정의", "확률의 덧셈정리"],
        },
        {
            "name": "조건부확률",
            "grade_levels": ["고2"],
            "keywords": ["조건부확률", "독립", "종속"],
            "core_concepts": ["조건부확률 공식", "사건의 독립"],
        },
        {
            "name": "확률분포",
            "grade_levels": ["고2"],
            "keywords": ["확률변수", "확률분포", "기댓값", "분산"],
            "core_concepts": ["이산확률변수", "기댓값", "분산"],
        },
        {
            "name": "이항분포",
            "grade_levels": ["고2"],
            "keywords": ["이항분포", "베르누이"],
            "core_concepts": ["이항분포", "이항분포의 평균과 분산"],
        },
        {
            "name": "정규분포",
            "grade_levels": ["고2"],
            "keywords": ["정규분포", "표준정규분포", "Z"],
            "core_concepts": ["정규분포", "표준화", "표준정규분포표"],
        },
        {
            "name": "통계적 추정",
            "grade_levels": ["고2"],
            "keywords": ["모평균", "신뢰구간", "추정"],
            "core_concepts": ["표본평균의 분포", "모평균 추정", "신뢰구간"],
        },
    ],

    # ==========================================
    # 고등학교 22개정 - 기하
    # ==========================================
    "기하": [
        {
            "name": "이차곡선 - 포물선",
            "grade_levels": ["고2", "고3"],
            "keywords": ["포물선", "초점", "준선"],
            "core_concepts": ["포물선의 정의", "포물선의 방정식"],
        },
        {
            "name": "이차곡선 - 타원",
            "grade_levels": ["고2", "고3"],
            "keywords": ["타원", "초점", "장축", "단축"],
            "core_concepts": ["타원의 정의", "타원의 방정식"],
        },
        {
            "name": "이차곡선 - 쌍곡선",
            "grade_levels": ["고2", "고3"],
            "keywords": ["쌍곡선", "초점", "점근선"],
            "core_concepts": ["쌍곡선의 정의", "쌍곡선의 방정식"],
        },
        {
            "name": "평면벡터",
            "grade_levels": ["고2"],
            "keywords": ["벡터", "성분", "내적"],
            "core_concepts": ["벡터 연산", "내적", "수직"],
        },
        {
            "name": "평면벡터의 활용",
            "grade_levels": ["고2"],
            "keywords": ["직선의 방정식", "원의 방정식"],
            "core_concepts": ["벡터를 이용한 직선/원의 방정식"],
        },
        {
            "name": "공간도형",
            "grade_levels": ["고3"],
            "keywords": ["공간도형", "직선", "평면", "수직", "평행"],
            "core_concepts": ["직선과 평면의 위치관계", "삼수선의 정리"],
        },
        {
            "name": "공간벡터",
            "grade_levels": ["고3"],
            "keywords": ["공간벡터", "좌표공간", "외적"],
            "core_concepts": ["공간좌표", "벡터 연산", "평면의 방정식"],
        },
    ],

    # ==========================================
    # 고등학교 22개정 - 미적분II (진로선택)
    # ==========================================
    "미적분II": [
        {
            "name": "여러 가지 미분법",
            "grade_levels": ["고3"],
            "keywords": ["지수함수 미분", "로그함수 미분", "삼각함수 미분"],
            "core_concepts": ["지수/로그 미분", "삼각함수 미분", "음함수 미분"],
        },
        {
            "name": "여러 가지 적분법",
            "grade_levels": ["고3"],
            "keywords": ["치환적분", "부분적분"],
            "core_concepts": ["치환적분법", "부분적분법"],
        },
        {
            "name": "정적분의 활용 심화",
            "grade_levels": ["고3"],
            "keywords": ["넓이", "부피", "회전체"],
            "core_concepts": ["곡선의 길이", "회전체의 부피"],
        },
    ],
}


# ============================================
# 3. 오류 패턴 - 문제 유형별
# - 중학교 + 고등학교 공통 오류 패턴
# ============================================
ERROR_PATTERNS = {
    # ==========================================
    # 중학교 오류 패턴
    # ==========================================
    "일차방정식": [
        {
            "name": "이항 시 부호 미변경",
            "error_type": "calculation",
            "frequency": "very_high",
            "feedback_message": "이항할 때는 부호를 반드시 바꿔야 합니다.",
            "feedback_detail": "등호의 한쪽에서 다른 쪽으로 항을 옮길 때, + 는 - 로, - 는 + 로 바뀝니다.",
            "wrong_examples": [
                {"problem": "3x + 5 = 11", "wrong_answer": "3x = 16", "wrong_process": "5를 이항했으나 부호 유지"},
            ],
            "correct_examples": [
                {"answer": "3x = 6, x = 2", "process": "3x = 11 - 5 = 6"},
            ],
            "detection_keywords": ["이항", "부호", "옮기"],
        },
        {
            "name": "양변 나눗셈 누락",
            "error_type": "process",
            "frequency": "high",
            "feedback_message": "양변을 계수로 나누어 x의 값을 구해야 합니다.",
            "wrong_examples": [
                {"problem": "3x = 6", "wrong_answer": "x = 6", "wrong_process": "계수 3으로 나누지 않음"},
            ],
            "detection_keywords": ["계수", "나누기"],
        },
    ],
    "연립방정식": [
        {
            "name": "가감법 부호 오류",
            "error_type": "calculation",
            "frequency": "very_high",
            "feedback_message": "가감법에서 더하거나 뺄 때 각 항의 부호에 주의하세요.",
            "wrong_examples": [
                {
                    "problem": "x + y = 5, x - y = 1",
                    "wrong_answer": "2x = 4",
                    "wrong_process": "두 식을 더했으나 부호 오류",
                },
            ],
            "detection_keywords": ["가감법", "더하기", "빼기", "부호"],
        },
        {
            "name": "대입 후 계산 오류",
            "error_type": "calculation",
            "frequency": "high",
            "feedback_message": "대입 후 계산을 꼼꼼히 확인하세요.",
            "detection_keywords": ["대입", "치환"],
        },
    ],
    "이차방정식": [
        {
            "name": "인수분해 부호 오류",
            "error_type": "calculation",
            "frequency": "very_high",
            "feedback_message": "인수분해할 때 부호를 주의깊게 확인하세요. (x-a)(x-b)=0 형태에서 근은 x=a, x=b입니다.",
            "wrong_examples": [
                {
                    "problem": "x² - 5x + 6 = 0",
                    "wrong_answer": "x = -2, -3",
                    "wrong_process": "(x-2)(x-3)=0에서 부호 혼동",
                },
            ],
            "detection_keywords": ["인수분해", "인수", "근"],
        },
        {
            "name": "근의 공식 계산 오류",
            "error_type": "calculation",
            "frequency": "high",
            "feedback_message": "근의 공식 적용 시 판별식(b²-4ac) 계산을 정확히 하세요.",
            "feedback_detail": "x = (-b ± √(b²-4ac)) / 2a에서 각 부분을 정확히 대입하세요.",
            "detection_keywords": ["근의 공식", "판별식"],
        },
        {
            "name": "중근 인식 실패",
            "error_type": "concept",
            "frequency": "medium",
            "feedback_message": "판별식이 0이면 중근(서로 같은 두 근)을 가집니다.",
            "detection_keywords": ["중근", "판별식", "D=0"],
        },
    ],
    "일차부등식": [
        {
            "name": "음수 곱셈/나눗셈 시 부등호 방향 유지",
            "error_type": "concept",
            "frequency": "very_high",
            "feedback_message": "부등식의 양변에 음수를 곱하거나 나눌 때는 부등호 방향이 바뀝니다!",
            "wrong_examples": [
                {"problem": "-2x > 6", "wrong_answer": "x > -3", "wrong_process": "음수로 나눴으나 부등호 방향 유지"},
            ],
            "correct_examples": [
                {"answer": "x < -3", "process": "-2로 나누면 부등호 방향 반전"},
            ],
            "detection_keywords": ["부등호", "음수", "방향"],
        },
    ],
    "일차함수": [
        {
            "name": "기울기 계산 오류 (분자/분모 혼동)",
            "error_type": "calculation",
            "frequency": "very_high",
            "feedback_message": "기울기 = (y좌표 변화량)/(x좌표 변화량)입니다. 분자와 분모를 바꾸지 마세요.",
            "feedback_detail": "두 점 (x₁,y₁), (x₂,y₂)에서 기울기 m = (y₂-y₁)/(x₂-x₁)",
            "wrong_examples": [
                {
                    "problem": "두 점 (1,2), (3,6)을 지나는 직선의 기울기",
                    "wrong_answer": "1/2",
                    "wrong_process": "(3-1)/(6-2)로 계산",
                },
            ],
            "detection_keywords": ["기울기", "변화량"],
        },
        {
            "name": "y절편과 x절편 혼동",
            "error_type": "concept",
            "frequency": "high",
            "feedback_message": "y절편은 x=0일 때 y값, x절편은 y=0일 때 x값입니다.",
            "detection_keywords": ["절편", "y절편", "x절편"],
        },
    ],
    "이차함수": [
        {
            "name": "꼭짓점 좌표 계산 오류",
            "error_type": "calculation",
            "frequency": "very_high",
            "feedback_message": "y=a(x-p)²+q에서 꼭짓점은 (p,q)입니다. 부호에 주의하세요!",
            "wrong_examples": [
                {"problem": "y = (x-2)² + 3의 꼭짓점", "wrong_answer": "(-2, 3)", "wrong_process": "x-2=0에서 부호 혼동"},
            ],
            "detection_keywords": ["꼭짓점", "정점"],
        },
        {
            "name": "대칭축 공식 오류",
            "error_type": "calculation",
            "frequency": "high",
            "feedback_message": "y=ax²+bx+c의 대칭축은 x=-b/2a입니다.",
            "detection_keywords": ["대칭축", "축"],
        },
        {
            "name": "최댓값/최솟값 혼동",
            "error_type": "concept",
            "frequency": "high",
            "feedback_message": "a>0이면 아래로 볼록(최솟값), a<0이면 위로 볼록(최댓값)입니다.",
            "detection_keywords": ["최댓값", "최솟값", "볼록"],
        },
    ],
    "삼각비": [
        {
            "name": "sin, cos, tan 정의 혼동",
            "error_type": "concept",
            "frequency": "very_high",
            "feedback_message": "sin=대변/빗변, cos=밑변/빗변, tan=대변/밑변입니다.",
            "feedback_detail": "SOH-CAH-TOA를 기억하세요!",
            "detection_keywords": ["sin", "cos", "tan", "삼각비"],
        },
        {
            "name": "특수각 값 오류",
            "error_type": "calculation",
            "frequency": "high",
            "feedback_message": "30°, 45°, 60° 등 특수각의 삼각비 값을 정확히 외우세요.",
            "detection_keywords": ["30도", "45도", "60도", "특수각"],
        },
    ],
    "경우의 수": [
        {
            "name": "합의 법칙과 곱의 법칙 혼동",
            "error_type": "concept",
            "frequency": "very_high",
            "feedback_message": "'또는'은 더하기, '그리고/동시에'는 곱하기입니다.",
            "detection_keywords": ["합의 법칙", "곱의 법칙", "또는", "그리고"],
        },
        {
            "name": "중복 카운팅",
            "error_type": "process",
            "frequency": "high",
            "feedback_message": "경우의 수를 셀 때 같은 경우를 여러 번 세지 않았는지 확인하세요.",
            "detection_keywords": ["중복", "겹치는"],
        },
    ],
    "순열과 조합": [
        {
            "name": "순열과 조합 구분 오류",
            "error_type": "concept",
            "frequency": "very_high",
            "feedback_message": "순서가 중요하면 순열(P), 순서가 상관없으면 조합(C)입니다.",
            "wrong_examples": [
                {
                    "problem": "5명 중 3명을 뽑는 경우의 수",
                    "wrong_answer": "5P3 = 60",
                    "wrong_process": "순서 상관없이 뽑는데 순열 사용",
                },
            ],
            "detection_keywords": ["순열", "조합", "뽑는", "선택"],
        },
        {
            "name": "팩토리얼 계산 오류",
            "error_type": "calculation",
            "frequency": "high",
            "feedback_message": "n! = n × (n-1) × ... × 2 × 1입니다. 계산을 다시 확인하세요.",
            "detection_keywords": ["팩토리얼", "!"],
        },
    ],
    "확률의 기본": [
        {
            "name": "확률 범위 오류",
            "error_type": "concept",
            "frequency": "high",
            "feedback_message": "확률은 항상 0과 1 사이입니다. 결과가 이 범위를 벗어났다면 계산을 다시 확인하세요.",
            "detection_keywords": ["확률", "범위"],
        },
        {
            "name": "여사건 활용 미숙",
            "error_type": "process",
            "frequency": "medium",
            "feedback_message": "'적어도 하나'는 여사건(전체 - 아무것도 아닌 경우)을 활용하면 쉽습니다.",
            "detection_keywords": ["적어도", "여사건"],
        },
    ],
    "지수": [
        {
            "name": "지수법칙 오적용",
            "error_type": "concept",
            "frequency": "very_high",
            "feedback_message": "aᵐ × aⁿ = aᵐ⁺ⁿ, (aᵐ)ⁿ = aᵐⁿ입니다. 법칙을 혼동하지 마세요.",
            "wrong_examples": [
                {"problem": "2³ × 2⁴", "wrong_answer": "2¹²", "wrong_process": "지수를 곱함"},
            ],
            "detection_keywords": ["지수법칙", "거듭제곱"],
        },
    ],
    "로그": [
        {
            "name": "로그 정의 혼동",
            "error_type": "concept",
            "frequency": "very_high",
            "feedback_message": "log_a(b) = c는 aᶜ = b와 같습니다.",
            "detection_keywords": ["로그", "정의", "밑"],
        },
        {
            "name": "로그 성질 오적용",
            "error_type": "concept",
            "frequency": "high",
            "feedback_message": "log(A×B) = logA + logB, log(A/B) = logA - logB입니다.",
            "wrong_examples": [
                {"problem": "log(3×4)", "wrong_answer": "log3 × log4", "wrong_process": "성질 혼동"},
            ],
            "detection_keywords": ["로그 성질"],
        },
    ],
    "등차수열": [
        {
            "name": "일반항 공식 오류",
            "error_type": "calculation",
            "frequency": "high",
            "feedback_message": "aₙ = a₁ + (n-1)d입니다. (n-1)을 빠뜨리지 마세요.",
            "detection_keywords": ["일반항", "공차"],
        },
        {
            "name": "합 공식 혼동",
            "error_type": "concept",
            "frequency": "medium",
            "feedback_message": "Sₙ = n(a₁ + aₙ)/2 = n(2a₁ + (n-1)d)/2입니다.",
            "detection_keywords": ["합", "시그마"],
        },
    ],
    "등비수열": [
        {
            "name": "일반항 지수 오류",
            "error_type": "calculation",
            "frequency": "high",
            "feedback_message": "aₙ = a₁ × rⁿ⁻¹입니다. 지수가 n-1임을 주의하세요.",
            "detection_keywords": ["일반항", "공비"],
        },
    ],
    "함수의 극한": [
        {
            "name": "0/0 꼴 처리 미숙",
            "error_type": "process",
            "frequency": "very_high",
            "feedback_message": "0/0 꼴일 때는 인수분해나 유리화로 약분 가능한지 확인하세요.",
            "detection_keywords": ["극한", "0/0", "부정형"],
        },
    ],
    "미분계수와 도함수": [
        {
            "name": "미분 공식 오류",
            "error_type": "calculation",
            "frequency": "very_high",
            "feedback_message": "(xⁿ)' = nxⁿ⁻¹입니다. 지수를 앞으로 내리고 1을 뺍니다.",
            "wrong_examples": [
                {"problem": "x³의 미분", "wrong_answer": "x²", "wrong_process": "계수 3 누락"},
            ],
            "detection_keywords": ["미분", "도함수"],
        },
        {
            "name": "곱의 미분법 오류",
            "error_type": "concept",
            "frequency": "high",
            "feedback_message": "(fg)' = f'g + fg'입니다. 두 항 모두 써야 합니다.",
            "detection_keywords": ["곱의 미분", "곱미분"],
        },
    ],
    "부정적분": [
        {
            "name": "적분상수 누락",
            "error_type": "process",
            "frequency": "very_high",
            "feedback_message": "부정적분에서는 항상 적분상수 C를 붙여야 합니다.",
            "detection_keywords": ["적분상수", "+C"],
        },
    ],
    "정적분": [
        {
            "name": "정적분 구간 대입 오류",
            "error_type": "calculation",
            "frequency": "high",
            "feedback_message": "∫[a,b] = F(b) - F(a)입니다. 위끝 - 아래끝 순서를 지키세요.",
            "detection_keywords": ["정적분", "구간"],
        },
    ],

    # ==========================================
    # 고등학교 22개정 오류 패턴 (추가)
    # ==========================================
    "복소수": [
        {
            "name": "i² = -1 미적용",
            "error_type": "concept",
            "frequency": "very_high",
            "feedback_message": "i² = -1입니다. 복소수 계산 시 반드시 적용하세요.",
            "wrong_examples": [
                {"problem": "i³", "wrong_answer": "i³", "wrong_process": "i² = -1 미적용"},
            ],
            "correct_examples": [
                {"answer": "-i", "process": "i³ = i² × i = -1 × i = -i"},
            ],
            "detection_keywords": ["허수", "i²", "복소수"],
        },
        {
            "name": "켤레복소수 부호 오류",
            "error_type": "calculation",
            "frequency": "high",
            "feedback_message": "a+bi의 켤레복소수는 a-bi입니다. 실수부는 그대로, 허수부 부호만 바꿉니다.",
            "detection_keywords": ["켤레", "켤레복소수"],
        },
    ],
    "항등식과 나머지정리": [
        {
            "name": "나머지정리 대입값 오류",
            "error_type": "concept",
            "frequency": "high",
            "feedback_message": "f(x)를 (x-a)로 나눈 나머지는 f(a)입니다.",
            "feedback_detail": "나머지정리: f(x) ÷ (x-a)의 나머지 = f(a)",
            "detection_keywords": ["나머지정리", "나머지"],
        },
    ],
    "집합": [
        {
            "name": "부분집합 개수 공식 오류",
            "error_type": "calculation",
            "frequency": "high",
            "feedback_message": "원소가 n개인 집합의 부분집합 개수는 2ⁿ개입니다.",
            "wrong_examples": [
                {"problem": "{1,2,3}의 부분집합 개수", "wrong_answer": "6개", "wrong_process": "3!로 계산"},
            ],
            "detection_keywords": ["부분집합", "개수"],
        },
        {
            "name": "합집합/교집합 혼동",
            "error_type": "concept",
            "frequency": "medium",
            "feedback_message": "∪는 합집합(또는), ∩는 교집합(그리고)입니다.",
            "detection_keywords": ["합집합", "교집합", "∪", "∩"],
        },
    ],
    "수열의 극한": [
        {
            "name": "∞/∞ 꼴 처리 미숙",
            "error_type": "process",
            "frequency": "very_high",
            "feedback_message": "분자/분모 모두 ∞일 때, 최고차항으로 나누어 정리하세요.",
            "feedback_detail": "분자, 분모를 최고차항으로 나누면 극한값을 구할 수 있습니다.",
            "detection_keywords": ["극한", "무한대", "∞"],
        },
        {
            "name": "등비급수 수렴 조건 무시",
            "error_type": "concept",
            "frequency": "high",
            "feedback_message": "등비급수 Σarⁿ은 |r|<1일 때만 수렴합니다.",
            "detection_keywords": ["등비급수", "수렴", "공비"],
        },
    ],
    "이차곡선 - 포물선": [
        {
            "name": "초점/준선 공식 혼동",
            "error_type": "concept",
            "frequency": "high",
            "feedback_message": "y²=4px에서 초점 (p,0), 준선 x=-p입니다.",
            "detection_keywords": ["포물선", "초점", "준선"],
        },
    ],
    "이차곡선 - 타원": [
        {
            "name": "장축/단축 구분 오류",
            "error_type": "concept",
            "frequency": "high",
            "feedback_message": "타원에서 a>b이면 x축이 장축, a<b이면 y축이 장축입니다.",
            "detection_keywords": ["타원", "장축", "단축"],
        },
        {
            "name": "초점 거리 공식 오류",
            "error_type": "calculation",
            "frequency": "high",
            "feedback_message": "타원의 초점: c²=a²-b² (a>b일 때)",
            "detection_keywords": ["타원", "초점"],
        },
    ],
    "이차곡선 - 쌍곡선": [
        {
            "name": "점근선 공식 오류",
            "error_type": "calculation",
            "frequency": "high",
            "feedback_message": "쌍곡선 x²/a² - y²/b² = 1의 점근선은 y = ±(b/a)x입니다.",
            "detection_keywords": ["쌍곡선", "점근선"],
        },
    ],
    "조건부확률": [
        {
            "name": "조건부확률 공식 오류",
            "error_type": "concept",
            "frequency": "very_high",
            "feedback_message": "P(A|B) = P(A∩B)/P(B)입니다. 분자는 교집합 확률!",
            "wrong_examples": [
                {"problem": "P(A|B) 계산", "wrong_answer": "P(A)/P(B)", "wrong_process": "분자 P(A∩B) 대신 P(A) 사용"},
            ],
            "detection_keywords": ["조건부확률", "P(A|B)"],
        },
        {
            "name": "독립사건 판정 오류",
            "error_type": "concept",
            "frequency": "high",
            "feedback_message": "A, B가 독립 ⟺ P(A∩B) = P(A)×P(B)",
            "detection_keywords": ["독립", "독립사건"],
        },
    ],
    "정규분포": [
        {
            "name": "표준화 공식 오류",
            "error_type": "calculation",
            "frequency": "very_high",
            "feedback_message": "Z = (X-μ)/σ입니다. 분모는 표준편차(σ)!",
            "feedback_detail": "표준화: X ~ N(μ,σ²) → Z = (X-μ)/σ ~ N(0,1)",
            "wrong_examples": [
                {"problem": "X~N(50,25)에서 X=60의 Z값", "wrong_answer": "Z=10/25", "wrong_process": "분모에 분산 사용"},
            ],
            "detection_keywords": ["표준화", "정규분포", "Z"],
        },
    ],
    "여러 가지 미분법": [
        {
            "name": "합성함수 미분 체인룰 미적용",
            "error_type": "concept",
            "frequency": "very_high",
            "feedback_message": "{f(g(x))}' = f'(g(x)) × g'(x) - 안쪽 함수도 미분해야 합니다!",
            "wrong_examples": [
                {"problem": "(sin 2x)'", "wrong_answer": "cos 2x", "wrong_process": "안쪽 2x 미분 누락"},
            ],
            "correct_examples": [
                {"answer": "2cos 2x", "process": "cos 2x × (2x)' = 2cos 2x"},
            ],
            "detection_keywords": ["합성함수", "체인룰", "연쇄법칙"],
        },
        {
            "name": "삼각함수 미분 공식 혼동",
            "error_type": "concept",
            "frequency": "high",
            "feedback_message": "(sin x)' = cos x, (cos x)' = -sin x입니다. 부호에 주의!",
            "detection_keywords": ["삼각함수", "미분"],
        },
    ],
    "여러 가지 적분법": [
        {
            "name": "치환적분 dx 변환 누락",
            "error_type": "process",
            "frequency": "very_high",
            "feedback_message": "t=g(x)로 치환 시, dt = g'(x)dx도 변환해야 합니다.",
            "detection_keywords": ["치환적분", "치환"],
        },
        {
            "name": "부분적분 공식 오류",
            "error_type": "concept",
            "frequency": "high",
            "feedback_message": "∫f'g dx = fg - ∫fg' dx입니다.",
            "feedback_detail": "LIATE 규칙: 로그-역삼각-대수-삼각-지수 순으로 f 선택",
            "detection_keywords": ["부분적분"],
        },
    ],
}


# ============================================
# 4. 프롬프트 템플릿
# ============================================
PROMPT_TEMPLATES = [
    # ==========================================
    # 기본 분석 가이드
    # ==========================================
    {
        "name": "수학 문제 분석 기본 가이드",
        "template_type": "analysis_guide",
        "content": """## 수학 문제 분석 가이드라인

1. **문제 유형 판별**
   - 문제에 사용된 수학적 개념을 파악하세요
   - 방정식, 함수, 도형, 확률 등 대분류를 먼저 결정하세요

2. **난이도 판정 기준**
   - 상(high): 복합 개념 적용, 다단계 풀이, 증명 문제
   - 중(medium): 단일 개념의 응용, 2-3단계 풀이
   - 하(low): 기본 공식 적용, 계산 위주

3. **단원 분류**
   - 문제에서 핵심 키워드를 추출하세요
   - 교육과정에 맞는 단원명을 사용하세요

4. **배점 추정**
   - 객관식: 2-4점
   - 단답형: 3-4점
   - 서술형: 4-6점 (풀이 과정에 따라)""",
        "priority": 100,
        "conditions": {"exam_paper_type": "blank"},
    },
    {
        "name": "학생 답안 분석 가이드",
        "template_type": "analysis_guide",
        "content": """## 학생 답안 분석 가이드라인

1. **정오답 판정**
   - O, ✓, 동그라미: 정답
   - X, ✗, 빗금: 오답
   - △, 부분점수 표시: 부분정답

2. **오류 유형 분류**
   - calculation_error: 계산 실수 (부호, 연산 오류)
   - concept_error: 개념 이해 부족 (공식, 정의 오류)
   - careless_mistake: 단순 실수 (옮겨쓰기, 누락)
   - process_error: 풀이 과정 오류
   - incomplete: 미완성 풀이

3. **AI 코멘트 작성**
   - 구체적인 오류 지점을 지적하세요
   - 올바른 접근법을 간략히 제시하세요
   - 격려와 함께 개선점을 알려주세요""",
        "priority": 100,
        "conditions": {"exam_paper_type": "answered"},
    },
    {
        "name": "채점된 시험지 분석 가이드",
        "template_type": "analysis_guide",
        "content": """## 채점된 시험지 분석 가이드라인

1. **채점 결과 인식**
   - 문제별 점수 표시 확인
   - 총점 및 평균 계산
   - 정답률 산출

2. **오답 패턴 분석**
   - 반복되는 실수 유형 파악
   - 취약 단원 식별
   - 개념 이해도 평가

3. **학습 처방**
   - 우선 보완할 개념 제시
   - 유사 문제 유형 추천
   - 복습 전략 제안""",
        "priority": 100,
        "conditions": {"exam_paper_type": "graded"},
    },
    {
        "name": "중3 제곱근 문제 분류 가이드",
        "template_type": "analysis_guide",
        "content": """## 중3 제곱근 문제 분류 주의사항 (매우 중요!)

제곱근이 나오는 문제의 핵심 개념을 정확히 판단하세요:

### "중3 수학 > 실수와 그 계산"으로 분류해야 하는 경우:
- 제곱근의 대소 비교가 주요 목표 (예: √245 vs 14 비교)
- 근호를 포함한 식의 사칙연산 (예: √2 + √3, √12 ÷ √3)
- 제곱근의 성질 이용 (예: √a² = |a|, √a × √b = √(ab))
- 분모의 유리화
- 제곱근 값 구하기

### "중3 수학 > 삼각비"로 분류해야 하는 경우:
- 피타고라스 정리가 핵심 (직각삼각형의 변의 길이)
- 삼각비(sin, cos, tan) 사용
- 그림자 문제에서 삼각비 적용

### 도형 단원으로 분류하면 안 되는 경우:
- ❌ 단순히 정사각형 넓이에서 제곱근이 나온다고 "도형의 넓이"로 분류 금지
- ❌ 제곱근 계산이 주요 학습 목표인데 "기하(중)" 분류 금지

### 판단 기준:
이 문제를 풀 때 학생이 가장 중요하게 사용해야 하는 개념이 무엇인가?
- 제곱근 계산/비교 → 실수와 그 계산
- 피타고라스 정리/삼각비 → 삼각비
- 도형의 성질 → 도형""",
        "priority": 95,
    },

    # ==========================================
    # 난이도 판정 (4단계 시스템)
    # ==========================================
    {
        "name": "난이도 4단계 판정 기준",
        "template_type": "analysis_guide",
        "content": """## 난이도 4단계 시스템 (개념/유형/심화/최상)

🎯 **핵심 원칙:** 문제를 푸는데 필요한 **사고의 깊이**로 판단!

---

### 1️⃣ 개념 (concept) - 기본 개념 직접 적용
**정의:** 교과서 개념/정의/공식을 **그대로** 적용하는 문제

**특징:**
- 개념 이해만 있으면 바로 풀림
- 1-2단계 풀이로 즉시 해결
- 단순 계산, 공식 대입
- 정답률 85% 이상 예상

**예시:**
- ✅ "근의 공식으로 x 구하기" (2x² + 3x - 5 = 0)
- ✅ "삼각함수 값 구하기" (sin 30°는?)
- ✅ "부정적분 계산" (∫(3x² + 2) dx)
- ✅ 단순 대입/계산 문제 (2-3점 배점)

**서술형 개념 문제:**
- 공식을 대입만 하면 되는 풀이 과정 (예: "근의 공식으로 해를 구하시오")

---

### 2️⃣ 유형 (pattern) - 알려진 유형/패턴 적용
**정의:** **익숙한 문제 유형**을 인식하고 **학습한 풀이법**을 적용

**특징:**
- 기출/교과서 유제 수준 (변형 포함)
- 2-3개 개념 순차 적용
- 3-5단계 풀이 과정
- 정답률 60-85% 예상
- "이 유형은 이렇게 푼다" 패턴이 있음

**예시:**
- ✅ "이차함수 최댓값 구하기" (완전제곱식 → 꼭짓점)
- ✅ "연립방정식 풀이" (대입법/가감법 적용)
- ✅ "속력 거리 시간 문제" (공식 d=vt 활용)
- ✅ 일반적인 응용 문제 (4-7점 배점)

**서술형 유형 문제:**
- 절차적 풀이가 명확한 서술형 (예: "이차방정식을 세우고 해를 구하시오")
- 계산 과정만 길고 개념은 단순한 경우

**유형이 아닌 경우:**
- ❌ 단순 공식 대입 → 개념
- ❌ 2개 이상 유형을 결합하거나 새로운 접근 필요 → 심화

---

### 3️⃣ 심화 (reasoning) - 복합 개념 응용/사고력 필요
**정의:** 여러 개념을 **융합**하거나 **창의적 접근**이 필요한 문제

**특징:**
- 2-3개 대단원 개념 복합 적용
- 일반적인 유형으로 안 풀림 (새로운 접근 필요)
- 5-7단계 이상 복잡한 풀이
- 조건 분석/경우의 수 고려 필요
- 정답률 30-60% 예상

**예시:**
- ✅ "함수와 미분을 결합한 최적화 문제"
- ✅ "조건을 만족하는 n 구하기" (부등식 + 수열 조건 동시 만족)
- ✅ "그래프 해석 + 방정식 활용" 복합 문제
- ✅ 논리적 추론이 필요한 증명 문제 (8-12점 배점)

**서술형 심화 문제:**
- 풀이 전략을 스스로 세워야 하는 문제
- 논리적 설명/증명이 필요한 문제
- 여러 개념을 융합해야 하는 문제

**심화가 아닌 경우:**
- ❌ 계산만 복잡하고 접근은 단순 → 유형
- ❌ 단순 응용 문제 → 유형
- ❌ 교과서에 비슷한 예제가 있음 → 유형

---

### 4️⃣ 최상 (creative) - 킬러 문제 (극히 제한적!)
**정의:** 교과서 범위를 넘는 **창의적 통찰**이 필요한 최고난도

**반드시 다음 조건 모두 충족:**
- 3개 이상 대단원 개념 복합 활용
- 8단계 이상 매우 복잡한 논리적 풀이
- 교과서/기출에 없는 독창적 접근 필수
- 정답률 30% 이하 예상
- 수능/모의고사 최고난도 킬러 수준

**특징:**
- "이렇게 접근하면 된다"는 힌트가 전혀 없음
- 여러 시도 후에야 풀이 전략 발견
- 고도의 수학적 직관 필요
- 창의적 아이디어 없이는 시작조차 어려움

**예시:**
- ✅ 복잡한 조건의 정수 해 문제 (정수론 + 부등식 + 창의적 변형)
- ✅ 기하학적 통찰이 필요한 극한 문제
- ✅ 전국 모의고사 최고난도 30번 수준

**서술형 최상 문제:**
- 증명 전략을 독창적으로 구성해야 하는 문제
- 여러 개념을 비직관적으로 결합해야 하는 문제

**절대 최상이 아닌 경우 (강력 금지!):**
- ❌ 교과서 응용 수준 → 유형 또는 심화
- ❌ 기출 유형 (아무리 어려워도) → 심화
- ❌ 계산만 복잡한 문제 → 유형 또는 심화
- ❌ 배점이 높은 서술형 → 내용 보고 판단 (대부분 심화)
- ❌ 일반적인 고난도 문제 → 심화

**원칙:**
- 시험당 최상은 **최대 1문제** (20문항 이하는 0개 권장)
- 조금이라도 의심스러우면 **무조건 심화**로!
- 최상 판정 전 "이게 정말 전국 최고난도 킬러인가?" 자문 필수

---

## 🔍 난이도 판정 플로우차트

1. 공식만 대입하면 됨? → **개념**
2. 알고있는 유형/패턴이 있음? → **유형**
3. 2개 이상 개념 결합 or 새로운 접근 필요? → **심화**
4. 교과서 범위 밖 창의적 통찰 필수? → **최상** (극히 드물게!)

**애매하면 항상 한 단계 낮게!**

---

## 📊 서술형 문제 난이도 판정

❗ **중요:** 서술형이라고 무조건 난이도가 높은 게 아님!

- **개념 서술형**: 공식 대입 과정만 쓰면 됨 (예: "근의 공식으로 해를 구하시오")
- **유형 서술형**: 절차적 풀이 (예: "이차방정식을 세우고 풀이하시오")
- **심화 서술형**: 논리적 설명/증명 필요 (예: "다음을 증명하시오")
- **최상 서술형**: 증명 전략 자체를 창의적으로 구성 (극히 드묾)

**판정 기준:** 문제 내용과 요구 사항으로 판단 (배점/형식은 참고만)""",
        "priority": 90,
    },

    # ==========================================
    # 오류 감지
    # ==========================================
    {
        "name": "일반적인 오류 주의사항",
        "template_type": "error_detection",
        "content": """## 자주 발생하는 오류 패턴 (분석 시 주의)

1. **부호 관련 오류**
   - 이항 시 부호 미변경
   - 음수 제곱 처리 오류
   - 분수 나눗셈 시 부호

2. **공식 관련 오류**
   - 근의 공식 판별식 계산 오류
   - 삼각비 정의 혼동
   - 지수법칙/로그 성질 오적용

3. **풀이 과정 오류**
   - 적분상수 누락
   - 정의역 조건 무시
   - 검산 미실시""",
        "priority": 80,
    },

    # ==========================================
    # 단원별 분석 가이드
    # ==========================================
    {
        "name": "방정식 분석 가이드",
        "template_type": "topic_guide",
        "content": """## 방정식 문제 분석 가이드

### 유형 구분
- 일차방정식: ax + b = 0 형태
- 이차방정식: ax² + bx + c = 0 형태
- 연립방정식: 2개 이상 미지수
- 고차방정식: 삼차 이상

### 풀이 방법 체크
- 인수분해 가능 여부
- 근의 공식 필요 여부
- 치환 활용 여부

### 주요 오류 포인트
- 이항 시 부호 변경
- 근의 공식 대입 오류
- 중근 처리
- 허근 처리 (복소수 범위)""",
        "priority": 70,
        "conditions": {"topic": "방정식"},
    },
    {
        "name": "함수 분석 가이드",
        "template_type": "topic_guide",
        "content": """## 함수 문제 분석 가이드

### 유형 구분
- 일차함수: y = ax + b
- 이차함수: y = ax² + bx + c
- 유리함수: 분수 형태
- 무리함수: 루트 포함
- 지수/로그함수
- 삼각함수

### 분석 포인트
- 정의역/치역 확인
- 그래프 특성 (대칭축, 꼭짓점, 점근선)
- 함수의 증가/감소
- 역함수 존재 조건

### 주요 오류 포인트
- 정의역 조건 무시
- 그래프 이동 방향 혼동
- 합성함수 순서 오류""",
        "priority": 70,
        "conditions": {"topic": "함수"},
    },
    {
        "name": "도형 분석 가이드",
        "template_type": "topic_guide",
        "content": """## 도형 문제 분석 가이드

### 유형 구분
- 삼각형: 합동, 닮음, 넓이
- 사각형: 평행사변형, 마름모, 사다리꼴
- 원: 원의 성질, 원주각, 접선
- 좌표기하: 직선, 원의 방정식

### 분석 포인트
- 보조선 필요 여부
- 닮음비/넓이비 활용
- 원주각-중심각 관계
- 접선의 성질

### 주요 오류 포인트
- 합동/닮음 조건 혼동
- 원주각 정리 오적용
- 좌표 계산 실수""",
        "priority": 70,
        "conditions": {"topic": "기하"},
    },
    {
        "name": "확률통계 분석 가이드",
        "template_type": "topic_guide",
        "content": """## 확률과 통계 문제 분석 가이드

### 유형 구분
- 경우의 수: 합/곱의 법칙
- 순열/조합: nPr, nCr
- 확률: 고전적/조건부/독립
- 통계: 평균, 분산, 정규분포

### 분석 포인트
- 순서 고려 여부 (순열 vs 조합)
- 중복 허용 여부
- 독립/종속 사건 구분
- 이항분포/정규분포 적용

### 주요 오류 포인트
- 순열/조합 공식 혼동
- 여사건 활용 누락
- 조건부확률 공식 오류
- 표준화 계산 실수""",
        "priority": 70,
        "conditions": {"topic": "확률"},
    },
    {
        "name": "미적분 분석 가이드",
        "template_type": "topic_guide",
        "content": """## 미적분 문제 분석 가이드

### 유형 구분
- 극한: 수열의 극한, 함수의 극한
- 미분: 미분계수, 도함수, 접선
- 적분: 부정적분, 정적분, 넓이/부피

### 분석 포인트
- 극한의 부정형(0/0, ∞/∞) 처리
- 미분 공식 적용 (합성함수, 곱/몫)
- 적분 기법 (치환, 부분적분)
- 정적분의 기하학적 의미

### 주요 오류 포인트
- 극한값 계산 실수
- 합성함수 미분 체인룰 누락
- 적분상수 누락
- 정적분 구간 대입 순서""",
        "priority": 70,
        "conditions": {"topic": "미적분"},
    },

    # ==========================================
    # 피드백 템플릿
    # ==========================================
    {
        "name": "격려형 피드백",
        "template_type": "feedback",
        "content": """## 격려형 피드백 템플릿

### 정답일 때
- 정확하게 풀었습니다! {concept}에 대한 이해가 탄탄하네요.
- 풀이 과정이 깔끔합니다. 계속 이런 식으로 정리하면 좋겠어요.

### 부분 정답일 때
- 좋은 시도입니다! {correct_part}까지는 잘 했는데, {improvement} 부분을 보완하면 완벽해요.
- 거의 다 왔어요! {hint}만 주의하면 됩니다.

### 오답일 때
- {error_type} 실수가 있었지만, 접근 방향은 맞았어요. {solution_hint}를 다시 확인해보세요.
- 어려운 문제인데 도전한 것 자체가 훌륭해요! {key_concept}를 복습하면 다음엔 풀 수 있을 거예요.""",
        "priority": 60,
    },
    {
        "name": "학습 처방 피드백",
        "template_type": "feedback",
        "content": """## 학습 처방 피드백 템플릿

### 개념 부족 시
- 📚 {concept} 개념을 교과서에서 다시 정리해보세요.
- 📝 {concept} 기본 문제 5개를 먼저 풀어보는 것을 추천합니다.

### 계산 실수 시
- ✏️ 계산 과정을 한 줄씩 정리하며 풀어보세요.
- 🔍 답을 구한 후 검산하는 습관을 들이면 좋겠어요.

### 풀이 과정 오류 시
- 📋 풀이 순서를 미리 계획하고 시작해보세요.
- 💡 비슷한 유형의 예제 풀이를 먼저 참고해보세요.""",
        "priority": 60,
    },

    # ==========================================
    # 시험 유형별 가이드
    # ==========================================
    {
        "name": "수능/모의고사 분석 가이드",
        "template_type": "exam_type_guide",
        "content": """## 수능/모의고사 문제 분석 가이드

### 문항 구조
- 1~15번: 공통과목 (수학Ⅰ, 수학Ⅱ)
- 16~22번: 선택과목 (확률과 통계/미적분/기하)
- 22번: 고난도 문항 (킬러)

### 난이도 분포
- 쉬운 문항 (1~3점): 1~9번
- 중간 문항 (3점): 10~18번
- 어려운 문항 (4점): 19~22번

### 분석 포인트
- 출제 경향 파악
- 자주 출제되는 개념 확인
- 킬러 문항 유형 분석""",
        "priority": 75,
        "conditions": {"exam_type": "수능"},
    },
    {
        "name": "내신 시험 분석 가이드",
        "template_type": "exam_type_guide",
        "content": """## 내신 시험 분석 가이드

### 문항 구조
- 객관식: 보통 15~20문항
- 주관식: 5~10문항
- 서술형: 2~5문항

### 출제 범위
- 교과서 예제 및 유제 변형
- 익힘책 문제 유사 유형
- 학교별 기출문제 패턴

### 분석 포인트
- 교과서 내용과의 연관성
- 선생님 스타일 파악
- 배점 분포 확인""",
        "priority": 75,
        "conditions": {"exam_type": "내신"},
    },

    # ==========================================
    # 22개정 교육과정 가이드
    # ==========================================
    {
        "name": "22개정 공통수학 가이드",
        "template_type": "curriculum_guide",
        "content": """## 22개정 공통수학 분석 가이드

### 공통수학1 (고1)
- 다항식: 연산, 항등식, 나머지정리
- 방정식: 복소수, 이차방정식, 고차방정식
- 부등식: 일차/이차부등식
- 도형의 방정식: 평면좌표, 직선, 원

### 공통수학2 (고1)
- 집합과 명제
- 함수: 합성함수, 역함수, 유리/무리함수
- 경우의 수: 순열, 조합

### 변경 사항 (15개정 대비)
- 집합/명제가 공통수학2로 이동
- 경우의 수가 공통과목에 포함
- 지수/로그는 대수로 이동""",
        "priority": 85,
        "conditions": {"curriculum": "22개정"},
    },
    {
        "name": "22개정 선택과목 가이드",
        "template_type": "curriculum_guide",
        "content": """## 22개정 선택과목 분석 가이드

### 대수 (일반선택)
- 지수함수와 로그함수
- 삼각함수
- 수열

### 미적분Ⅰ (일반선택)
- 수열의 극한
- 미분
- 적분

### 확률과 통계 (일반선택)
- 순열과 조합 심화
- 확률
- 통계

### 기하 (일반선택)
- 이차곡선
- 평면벡터
- 공간벡터

### 미적분Ⅱ (진로선택)
- 여러 가지 미분법
- 여러 가지 적분법""",
        "priority": 85,
        "conditions": {"curriculum": "22개정"},
    },
]


# ============================================
# 5. 학습 패턴 (키워드-단원 매핑)
# ============================================
LEARNED_PATTERNS = [
    # 문자와 식
    {"pattern_type": "topic_keyword", "pattern_key": "일차방정식", "pattern_value": "문자와 식 > 일차방정식", "confidence": 0.95},
    {"pattern_type": "topic_keyword", "pattern_key": "이차방정식", "pattern_value": "문자와 식 > 이차방정식", "confidence": 0.95},
    {"pattern_type": "topic_keyword", "pattern_key": "연립방정식", "pattern_value": "문자와 식 > 연립방정식", "confidence": 0.95},
    {"pattern_type": "topic_keyword", "pattern_key": "부등식", "pattern_value": "문자와 식 > 부등식", "confidence": 0.90},
    {"pattern_type": "topic_keyword", "pattern_key": "인수분해", "pattern_value": "문자와 식 > 이차방정식", "confidence": 0.85},
    # 함수
    {"pattern_type": "topic_keyword", "pattern_key": "일차함수", "pattern_value": "함수 > 일차함수", "confidence": 0.95},
    {"pattern_type": "topic_keyword", "pattern_key": "이차함수", "pattern_value": "함수 > 이차함수", "confidence": 0.95},
    {"pattern_type": "topic_keyword", "pattern_key": "함수의 그래프", "pattern_value": "함수", "confidence": 0.85},
    {"pattern_type": "topic_keyword", "pattern_key": "꼭짓점", "pattern_value": "함수 > 이차함수", "confidence": 0.90},
    {"pattern_type": "topic_keyword", "pattern_key": "대칭축", "pattern_value": "함수 > 이차함수", "confidence": 0.90},
    # 기하
    {"pattern_type": "topic_keyword", "pattern_key": "삼각비", "pattern_value": "기하 > 삼각비", "confidence": 0.95},
    {"pattern_type": "topic_keyword", "pattern_key": "sin", "pattern_value": "기하 > 삼각비", "confidence": 0.90},
    {"pattern_type": "topic_keyword", "pattern_key": "cos", "pattern_value": "기하 > 삼각비", "confidence": 0.90},
    {"pattern_type": "topic_keyword", "pattern_key": "피타고라스", "pattern_value": "기하 > 피타고라스 정리", "confidence": 0.95},
    {"pattern_type": "topic_keyword", "pattern_key": "닮음", "pattern_value": "기하 > 도형의 닮음", "confidence": 0.90},
    {"pattern_type": "topic_keyword", "pattern_key": "합동", "pattern_value": "기하 > 삼각형의 성질", "confidence": 0.85},
    # 확률과 통계
    {"pattern_type": "topic_keyword", "pattern_key": "경우의 수", "pattern_value": "확률과 통계 > 경우의 수", "confidence": 0.95},
    {"pattern_type": "topic_keyword", "pattern_key": "확률", "pattern_value": "확률과 통계 > 확률", "confidence": 0.90},
    {"pattern_type": "topic_keyword", "pattern_key": "순열", "pattern_value": "확률과 통계 > 순열과 조합", "confidence": 0.95},
    {"pattern_type": "topic_keyword", "pattern_key": "조합", "pattern_value": "확률과 통계 > 순열과 조합", "confidence": 0.95},
    # 지수와 로그
    {"pattern_type": "topic_keyword", "pattern_key": "지수", "pattern_value": "지수와 로그 > 지수", "confidence": 0.85},
    {"pattern_type": "topic_keyword", "pattern_key": "로그", "pattern_value": "지수와 로그 > 로그", "confidence": 0.95},
    {"pattern_type": "topic_keyword", "pattern_key": "log", "pattern_value": "지수와 로그 > 로그", "confidence": 0.90},
    # 수열
    {"pattern_type": "topic_keyword", "pattern_key": "등차수열", "pattern_value": "수열 > 등차수열", "confidence": 0.95},
    {"pattern_type": "topic_keyword", "pattern_key": "등비수열", "pattern_value": "수열 > 등비수열", "confidence": 0.95},
    {"pattern_type": "topic_keyword", "pattern_key": "수열의 합", "pattern_value": "수열 > 수열의 합", "confidence": 0.90},
    {"pattern_type": "topic_keyword", "pattern_key": "시그마", "pattern_value": "수열 > 수열의 합", "confidence": 0.85},
    {"pattern_type": "topic_keyword", "pattern_key": "귀납법", "pattern_value": "수열 > 수학적 귀납법", "confidence": 0.95},
    # 미분
    {"pattern_type": "topic_keyword", "pattern_key": "극한", "pattern_value": "미분 > 함수의 극한", "confidence": 0.90},
    {"pattern_type": "topic_keyword", "pattern_key": "미분", "pattern_value": "미분", "confidence": 0.90},
    {"pattern_type": "topic_keyword", "pattern_key": "도함수", "pattern_value": "미분 > 미분계수와 도함수", "confidence": 0.95},
    {"pattern_type": "topic_keyword", "pattern_key": "접선", "pattern_value": "미분 > 도함수의 활용", "confidence": 0.85},
    # 적분
    {"pattern_type": "topic_keyword", "pattern_key": "적분", "pattern_value": "적분", "confidence": 0.90},
    {"pattern_type": "topic_keyword", "pattern_key": "정적분", "pattern_value": "적분 > 정적분", "confidence": 0.95},
    {"pattern_type": "topic_keyword", "pattern_key": "부정적분", "pattern_value": "적분 > 부정적분", "confidence": 0.95},
    # 난이도 규칙
    {"pattern_type": "difficulty_rule", "pattern_key": "증명", "pattern_value": "상", "confidence": 0.85},
    {"pattern_type": "difficulty_rule", "pattern_key": "논술형", "pattern_value": "상", "confidence": 0.80},
    {"pattern_type": "difficulty_rule", "pattern_key": "서술형", "pattern_value": "중~상", "confidence": 0.75},
]


async def seed_categories(db):
    """카테고리 시드"""
    print("\n[1/5] 문제 카테고리 생성 중...")
    category_map = {}

    for cat in CATEGORIES:
        # 중복 체크
        existing = await db.table("problem_categories").select("id").eq("name", cat["name"]).maybe_single().execute()
        if existing.data:
            print(f"  - {cat['name']}: 이미 존재 (건너뜀)")
            category_map[cat["name"]] = existing.data["id"]
            continue

        cat_data = {
            "id": uid(),
            "name": cat["name"],
            "description": cat["description"],
            "display_order": cat["display_order"],
            "is_active": True,
            "created_at": now(),
            "updated_at": now(),
        }
        result = await db.table("problem_categories").insert(cat_data).execute()
        if result.data:
            category_map[cat["name"]] = cat_data["id"]
            print(f"  + {cat['name']}: 생성됨")

    print(f"  총 {len(category_map)}개 카테고리")
    return category_map


async def seed_problem_types(db, category_map):
    """문제 유형 시드"""
    print("\n[2/5] 문제 유형 생성 중...")
    type_map = {}
    count = 0

    for cat_name, types in PROBLEM_TYPES.items():
        if cat_name not in category_map:
            print(f"  ! {cat_name} 카테고리를 찾을 수 없음")
            continue

        cat_id = category_map[cat_name]

        for i, t in enumerate(types):
            # 중복 체크
            existing = await db.table("problem_types").select("id").eq("name", t["name"]).maybe_single().execute()
            if existing.data:
                type_map[t["name"]] = existing.data["id"]
                continue

            type_data = {
                "id": uid(),
                "category_id": cat_id,
                "name": t["name"],
                "description": f"{t['name']} 관련 문제",
                "grade_levels": t.get("grade_levels", []),
                "keywords": t.get("keywords", []),
                "core_concepts": t.get("core_concepts", []),
                "prerequisite_types": [],  # 선수 학습 유형 (빈 배열)
                "display_order": i + 1,
                "is_active": True,
                "usage_count": 0,
                "accuracy_rate": 0.0,
                "created_at": now(),
                "updated_at": now(),
            }
            result = await db.table("problem_types").insert(type_data).execute()
            if result.error:
                print(f"    ERROR inserting {t['name']}: {result.error}")
            elif result.data:
                type_map[t["name"]] = type_data["id"]
                count += 1
            else:
                # result.data가 없어도 성공일 수 있음
                type_map[t["name"]] = type_data["id"]
                count += 1

    print(f"  + {count}개 문제 유형 생성됨 (총 {len(type_map)}개)")
    return type_map


async def seed_error_patterns(db, type_map):
    """오류 패턴 시드"""
    print("\n[3/5] 오류 패턴 생성 중...")
    count = 0

    for type_name, patterns in ERROR_PATTERNS.items():
        if type_name not in type_map:
            print(f"  ! {type_name} 유형을 찾을 수 없음")
            continue

        type_id = type_map[type_name]

        for p in patterns:
            # 중복 체크
            existing = await db.table("error_patterns").select("id").eq("name", p["name"]).maybe_single().execute()
            if existing.data:
                continue

            pattern_data = {
                "id": uid(),
                "problem_type_id": type_id,
                "name": p["name"],
                "description": p.get("feedback_detail", p["feedback_message"]),
                "error_type": p.get("error_type", "calculation"),
                "frequency": p.get("frequency", "medium"),
                "occurrence_count": 0,
                "wrong_examples": p.get("wrong_examples"),
                "correct_examples": p.get("correct_examples"),
                "feedback_message": p["feedback_message"],
                "feedback_detail": p.get("feedback_detail"),
                "detection_keywords": p.get("detection_keywords", []),
                "is_active": True,
                "created_at": now(),
                "updated_at": now(),
            }
            result = await db.table("error_patterns").insert(pattern_data).execute()
            if result.data:
                count += 1

    print(f"  + {count}개 오류 패턴 생성됨")


async def seed_prompt_templates(db):
    """프롬프트 템플릿 시드"""
    print("\n[4/5] 프롬프트 템플릿 생성 중...")
    count = 0

    for t in PROMPT_TEMPLATES:
        # 중복 체크
        existing = await db.table("prompt_templates").select("id").eq("name", t["name"]).maybe_single().execute()
        if existing.data:
            print(f"  - {t['name']}: 이미 존재")
            continue

        template_data = {
            "id": uid(),
            "name": t["name"],
            "template_type": t["template_type"],
            "content": t["content"],
            "conditions": t.get("conditions"),
            "priority": t.get("priority", 50),
            "usage_count": 0,
            "accuracy_score": 0.0,
            "is_active": True,
            "created_at": now(),
            "updated_at": now(),
        }
        result = await db.table("prompt_templates").insert(template_data).execute()
        if result.data:
            count += 1
            print(f"  + {t['name']}: 생성됨")

    print(f"  + {count}개 템플릿 생성됨")


async def seed_learned_patterns(db):
    """학습 패턴 시드"""
    print("\n[5/5] 학습 패턴 생성 중...")
    count = 0

    for p in LEARNED_PATTERNS:
        # 중복 체크
        existing = await db.table("learned_patterns").select("id").eq("pattern_key", p["pattern_key"]).eq("pattern_type", p["pattern_type"]).maybe_single().execute()
        if existing.data:
            continue

        pattern_data = {
            "id": uid(),
            "pattern_type": p["pattern_type"],
            "pattern_key": p["pattern_key"],
            "pattern_value": p["pattern_value"],
            "confidence": p.get("confidence", 0.8),
            "apply_count": 0,
            "is_active": True,
            "created_at": now(),
            "updated_at": now(),
        }
        result = await db.table("learned_patterns").insert(pattern_data).execute()
        if result.data:
            count += 1

    print(f"  + {count}개 학습 패턴 생성됨")


async def main():
    print("=" * 60)
    print("한국 수학 교육과정 기반 패턴 시스템 시드")
    print("=" * 60)

    db = get_supabase()

    # 1. 카테고리 생성
    category_map = await seed_categories(db)

    # 2. 문제 유형 생성
    type_map = await seed_problem_types(db, category_map)

    # 3. 오류 패턴 생성
    await seed_error_patterns(db, type_map)

    # 4. 프롬프트 템플릿 생성
    await seed_prompt_templates(db)

    # 5. 학습 패턴 생성
    await seed_learned_patterns(db)

    print("\n" + "=" * 60)
    print("시드 완료!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
