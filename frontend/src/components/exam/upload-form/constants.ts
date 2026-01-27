/**
 * Upload form constants
 */
import type { ChapterGroup } from './types';

// 이미지 압축 설정
export const COMPRESS_CONFIG = {
  maxWidth: 1600,      // 최대 너비
  maxHeight: 2400,     // 최대 높이
  quality: 0.85,       // JPEG 품질 (0-1)
  maxSizeKB: 500,      // 목표 최대 크기 (KB)
};

// 단계별 예상 시간 (ms)
export const STAGE_DURATIONS = {
  uploading: 2000,
  classifying: 5000,
};

// 학년별 세부과목 매핑 (22개정 교육과정)
export const GRADE_TO_CATEGORIES: Record<string, string[]> = {
  '중1': ['중1-1', '중1-2'],
  '중2': ['중2-1', '중2-2'],
  '중3': ['중3-1', '중3-2'],
  '고1': ['공통수학1', '공통수학2'],
  '고2': ['대수', '미적분I', '미적분II', '확률과 통계', '기하'],
  '고3': ['대수', '미적분I', '미적분II', '확률과 통계', '기하'],
};

// 과목별 카테고리 정의 (하위 호환용)
export const SUBJECT_CATEGORIES: Record<string, { label: string; categories: string[] }> = {
  '수학': {
    label: '수학',
    categories: [
      '중1-1', '중1-2', '중2-1', '중2-2', '중3-1', '중3-2',
      '공통수학1', '공통수학2', '대수', '미적분I', '미적분II', '확률과 통계', '기하',
    ],
  },
  // TODO: 영어 과목 추후 활성화 예정
  // '영어': {
  //   label: '영어',
  //   categories: ['영어Ⅰ', '영어Ⅱ', '영어독해와작문', '영어회화'],
  // },
};

// 학년 옵션
export const GRADE_OPTIONS = ['중1', '중2', '중3', '고1', '고2', '고3'];

// 과목 약어 → 카테고리 매핑 (파일명 파싱용, 22개정)
export const SUBJECT_ABBR_MAP: Record<string, { subject: string; category: string }> = {
  // 수학 약어 (22개정) - 학기별
  '중1-1': { subject: '수학', category: '중1-1' },
  '중1-2': { subject: '수학', category: '중1-2' },
  '중2-1': { subject: '수학', category: '중2-1' },
  '중2-2': { subject: '수학', category: '중2-2' },
  '중3-1': { subject: '수학', category: '중3-1' },
  '중3-2': { subject: '수학', category: '중3-2' },
  // 하위 호환 (학년 전체)
  '중1': { subject: '수학', category: '중1-1' },
  '중2': { subject: '수학', category: '중2-1' },
  '중3': { subject: '수학', category: '중3-1' },
  '공수1': { subject: '수학', category: '공통수학1' },
  '공수2': { subject: '수학', category: '공통수학2' },
  '대수': { subject: '수학', category: '대수' },
  '미적1': { subject: '수학', category: '미적분I' },
  '미적2': { subject: '수학', category: '미적분II' },
  '확통': { subject: '수학', category: '확률과 통계' },
  '기하': { subject: '수학', category: '기하' },
  // 영어 약어
  '영1': { subject: '영어', category: '영어Ⅰ' },
  '영2': { subject: '영어', category: '영어Ⅱ' },
  '영어': { subject: '영어', category: '영어Ⅰ' },
  '독작': { subject: '영어', category: '영어독해와작문' },
  '회화': { subject: '영어', category: '영어회화' },
};

// 카테고리별 교육과정 계층 구조 (22개정)
export const CURRICULUM_HIERARCHY: Record<string, ChapterGroup[]> = {
  // ============================================
  // 중학교 1학년 1학기
  // ============================================
  '중1-1': [
    {
      chapter: '수와 연산',
      sections: [
        { section: '소인수분해', topics: ['소인수분해', '최대공약수와 최소공배수'] },
        { section: '정수와 유리수', topics: ['정수와 유리수', '정수와 유리수의 덧셈과 뺄셈', '정수와 유리수의 곱셈과 나눗셈'] },
      ],
    },
    {
      chapter: '문자와 식',
      sections: [
        { section: '문자의 사용과 식', topics: ['문자의 사용과 식의 계산', '일차식의 덧셈과 뺄셈'] },
        { section: '일차방정식', topics: ['일차방정식의 풀이', '일차방정식의 활용'] },
      ],
    },
    {
      chapter: '좌표평면과 그래프',
      sections: [
        { section: '좌표와 그래프', topics: ['순서쌍과 좌표', '그래프'] },
        { section: '정비례와 반비례', topics: ['정비례', '반비례'] },
      ],
    },
  ],

  // ============================================
  // 중학교 1학년 2학기
  // ============================================
  '중1-2': [
    {
      chapter: '기하',
      sections: [
        { section: '기본 도형', topics: ['점, 선, 면, 각', '위치 관계', '평행선의 성질'] },
        { section: '작도와 합동', topics: ['삼각형의 작도', '삼각형의 합동'] },
        { section: '평면도형', topics: ['다각형', '원과 부채꼴'] },
        { section: '입체도형', topics: ['다면체', '회전체', '입체도형의 겉넓이와 부피'] },
      ],
    },
    {
      chapter: '통계',
      sections: [
        { section: '자료의 정리와 해석', topics: ['줄기와 잎 그림, 도수분포표', '히스토그램과 도수분포다각형', '상대도수'] },
      ],
    },
  ],

  // ============================================
  // 중학교 2학년 1학기
  // ============================================
  '중2-1': [
    {
      chapter: '수와 연산',
      sections: [
        { section: '유리수와 순환소수', topics: ['유리수와 순환소수'] },
      ],
    },
    {
      chapter: '문자와 식',
      sections: [
        { section: '식의 계산', topics: ['단항식의 계산', '다항식의 계산'] },
      ],
    },
    {
      chapter: '부등식과 방정식',
      sections: [
        { section: '일차부등식', topics: ['부등식의 성질', '일차부등식의 풀이와 활용'] },
        { section: '연립일차방정식', topics: ['연립일차방정식의 풀이', '연립일차방정식의 활용'] },
      ],
    },
    {
      chapter: '함수',
      sections: [
        { section: '일차함수', topics: ['일차함수와 그 그래프', '일차함수와 일차방정식의 관계'] },
      ],
    },
  ],

  // ============================================
  // 중학교 2학년 2학기
  // ============================================
  '중2-2': [
    {
      chapter: '기하',
      sections: [
        { section: '삼각형의 성질', topics: ['이등변삼각형의 성질', '직각삼각형의 합동', '삼각형의 외심과 내심'] },
        { section: '사각형의 성질', topics: ['평행사변형', '여러 가지 사각형'] },
        { section: '도형의 닮음', topics: ['도형의 닮음', '평행선 사이의 선분의 길이의 비', '삼각형의 무게중심'] },
        { section: '피타고라스 정리', topics: ['피타고라스 정리'] },
      ],
    },
    {
      chapter: '확률',
      sections: [
        { section: '확률', topics: ['경우의 수', '확률의 뜻과 성질', '확률의 계산'] },
      ],
    },
  ],

  // ============================================
  // 중학교 3학년 1학기
  // ============================================
  '중3-1': [
    {
      chapter: '수와 연산',
      sections: [
        { section: '실수와 그 연산', topics: ['제곱근과 실수', '근호를 포함한 식의 계산'] },
      ],
    },
    {
      chapter: '문자와 식',
      sections: [
        { section: '다항식의 곱셈과 인수분해', topics: ['다항식의 곱셈', '다항식의 인수분해'] },
        { section: '이차방정식', topics: ['이차방정식의 풀이', '이차방정식의 활용'] },
      ],
    },
    {
      chapter: '함수',
      sections: [
        { section: '이차함수', topics: ['이차함수와 그 그래프'] },
      ],
    },
  ],

  // ============================================
  // 중학교 3학년 2학기
  // ============================================
  '중3-2': [
    {
      chapter: '기하',
      sections: [
        { section: '삼각비', topics: ['삼각비', '삼각비의 활용'] },
        { section: '원의 성질', topics: ['원과 현', '원과 접선', '원주각'] },
      ],
    },
    {
      chapter: '통계',
      sections: [
        { section: '통계', topics: ['대푯값과 산포도', '상관관계'] },
      ],
    },
  ],

  // ============================================
  // 공통수학1
  // ============================================
  '공통수학1': [
    {
      chapter: '다항식',
      sections: [
        { section: '다항식의 연산', topics: ['다항식의 덧셈과 뺄셈', '다항식의 곱셈과 나눗셈'] },
        { section: '나머지정리', topics: ['항등식', '나머지정리와 인수정리', '조립제법'] },
        { section: '인수분해', topics: ['인수분해'] },
      ],
    },
    {
      chapter: '방정식과 부등식',
      sections: [
        { section: '복소수', topics: ['복소수', '복소수의 연산'] },
        { section: '이차방정식', topics: ['이차방정식의 판별식', '이차방정식의 근과 계수의 관계'] },
        { section: '이차방정식과 이차함수', topics: ['이차방정식과 이차함수의 관계', '이차함수의 최대, 최소'] },
        { section: '여러 가지 방정식과 부등식', topics: ['삼차방정식과 사차방정식', '연립이차방정식', '연립일차부등식', '이차부등식'] },
      ],
    },
    {
      chapter: '경우의 수',
      sections: [
        { section: '경우의 수', topics: ['합의 법칙과 곱의 법칙'] },
        { section: '순열과 조합', topics: ['순열', '조합'] },
      ],
    },
    {
      chapter: '행렬',
      sections: [
        { section: '행렬', topics: ['행렬과 그 연산'] },
      ],
    },
  ],

  // ============================================
  // 공통수학2
  // ============================================
  '공통수학2': [
    {
      chapter: '도형의 방정식',
      sections: [
        { section: '평면좌표', topics: ['두 점 사이의 거리', '선분의 내분점'] },
        { section: '직선의 방정식', topics: ['직선의 방정식', '두 직선의 위치 관계', '점과 직선 사이의 거리'] },
        { section: '원의 방정식', topics: ['원의 방정식', '원과 직선의 위치 관계'] },
        { section: '도형의 이동', topics: ['평행이동', '대칭이동'] },
      ],
    },
    {
      chapter: '집합과 명제',
      sections: [
        { section: '집합', topics: ['집합의 뜻과 표현', '집합의 연산'] },
        { section: '명제', topics: ['명제와 조건', '명제 사이의 관계', '충분조건과 필요조건', '절대부등식'] },
      ],
    },
    {
      chapter: '함수와 그래프',
      sections: [
        { section: '함수', topics: ['함수', '합성함수와 역함수'] },
        { section: '유리함수와 무리함수', topics: ['유리함수', '무리함수'] },
      ],
    },
  ],

  // ============================================
  // 대수
  // ============================================
  '대수': [
    {
      chapter: '지수함수와 로그함수',
      sections: [
        { section: '지수와 로그', topics: ['지수', '로그'] },
        { section: '지수함수와 로그함수', topics: ['지수함수', '로그함수', '지수함수와 로그함수의 활용'] },
      ],
    },
    {
      chapter: '삼각함수',
      sections: [
        { section: '삼각함수', topics: ['삼각함수', '삼각함수의 그래프', '삼각함수의 활용'] },
      ],
    },
    {
      chapter: '수열',
      sections: [
        { section: '등차수열과 등비수열', topics: ['등차수열', '등비수열'] },
        { section: '수열의 합', topics: ['합의 기호 시그마', '여러 가지 수열의 합'] },
        { section: '수학적 귀납법', topics: ['수학적 귀납법'] },
      ],
    },
  ],

  // ============================================
  // 미적분I
  // ============================================
  '미적분I': [
    {
      chapter: '함수의 극한과 연속',
      sections: [
        { section: '함수의 극한', topics: ['함수의 극한', '함수의 극한에 대한 성질'] },
        { section: '함수의 연속', topics: ['함수의 연속'] },
      ],
    },
    {
      chapter: '미분',
      sections: [
        { section: '미분계수와 도함수', topics: ['미분계수', '도함수'] },
        { section: '도함수의 활용', topics: ['접선의 방정식', '함수의 증가와 감소, 극대와 극소', '함수의 그래프', '방정식과 부등식에의 활용', '속도와 가속도'] },
      ],
    },
    {
      chapter: '적분',
      sections: [
        { section: '부정적분', topics: ['부정적분'] },
        { section: '정적분', topics: ['정적분'] },
        { section: '정적분의 활용', topics: ['넓이', '속도와 거리'] },
      ],
    },
  ],

  // ============================================
  // 미적분II
  // ============================================
  '미적분II': [
    {
      chapter: '수열의 극한',
      sections: [
        { section: '수열의 극한', topics: ['수열의 극한', '급수'] },
      ],
    },
    {
      chapter: '미분법',
      sections: [
        { section: '여러 가지 함수의 미분', topics: ['지수함수와 로그함수의 미분', '삼각함수의 미분'] },
        { section: '여러 가지 미분법', topics: ['여러 가지 미분법', '도함수의 활용'] },
      ],
    },
    {
      chapter: '적분법',
      sections: [
        { section: '여러 가지 적분법', topics: ['여러 가지 적분법'] },
        { section: '정적분의 활용', topics: ['정적분과 급수', '넓이와 부피'] },
      ],
    },
  ],

  // ============================================
  // 확률과 통계
  // ============================================
  '확률과 통계': [
    {
      chapter: '경우의 수',
      sections: [
        { section: '경우의 수', topics: ['중복순열', '중복조합'] },
        { section: '이항정리', topics: ['이항정리'] },
      ],
    },
    {
      chapter: '확률',
      sections: [
        { section: '확률의 뜻과 활용', topics: ['확률의 뜻', '확률의 덧셈정리'] },
        { section: '조건부확률', topics: ['조건부확률', '사건의 독립과 종속'] },
      ],
    },
    {
      chapter: '통계',
      sections: [
        { section: '확률분포', topics: ['확률변수와 확률분포', '이항분포', '정규분포'] },
        { section: '통계적 추정', topics: ['모집단과 표본', '모평균의 추정', '모비율의 추정'] },
      ],
    },
  ],

  // ============================================
  // 기하
  // ============================================
  '기하': [
    {
      chapter: '이차곡선',
      sections: [
        { section: '이차곡선', topics: ['포물선', '타원', '쌍곡선'] },
        { section: '이차곡선과 직선', topics: ['이차곡선과 직선의 위치 관계', '접선의 방정식'] },
      ],
    },
    {
      chapter: '평면벡터',
      sections: [
        { section: '벡터의 연산', topics: ['벡터의 뜻과 연산'] },
        { section: '평면벡터의 성분과 내적', topics: ['위치벡터', '평면벡터의 성분', '평면벡터의 내적'] },
      ],
    },
    {
      chapter: '공간도형과 공간좌표',
      sections: [
        { section: '공간도형', topics: ['직선과 평면의 위치 관계', '정사영'] },
        { section: '공간좌표', topics: ['점의 좌표', '두 점 사이의 거리'] },
      ],
    },
  ],
};

// 계층 구조에서 모든 토픽(소단원) 추출 (하위 호환용)
export function getAllTopics(category: string): string[] {
  const chapters = CURRICULUM_HIERARCHY[category];
  if (!chapters) return [];
  return chapters.flatMap(ch => ch.sections.flatMap(sec => sec.topics));
}
