/**
 * StudyStrategyTab 관련 상수 정의
 */

// 난이도별 가중치 (학습 우선순위 계산용)
export const DIFFICULTY_WEIGHT: Record<string, number> = {
  concept: 1,
  pattern: 2,
  reasoning: 3,
  creative: 4,
  low: 1,
  medium: 2,
  high: 3,
};

// 난이도 라벨
export const DIFFICULTY_LABELS: Record<string, string> = {
  concept: '개념',
  pattern: '유형',
  reasoning: '심화',
  creative: '최상위',
  low: '하',
  medium: '중',
  high: '상',
};

// 유형별 학습 전략 템플릿
export const TYPE_STRATEGIES: Record<string, string[]> = {
  calculation: [
    '기본 연산 속도와 정확성을 높이기 위해 매일 10분 연산 연습',
    '실수를 줄이기 위해 검산 습관 들이기',
    '복잡한 계산은 단계별로 정리하며 풀기',
  ],
  concept: [
    '핵심 개념 정의와 공식을 카드로 만들어 암기',
    '개념의 유도 과정을 직접 해보기',
    '다양한 예제로 개념 적용 연습',
  ],
  application: [
    '문제 상황을 수식으로 변환하는 연습',
    '유사 문제 유형별로 분류하여 풀이 패턴 익히기',
    '실생활 예시와 연결하여 이해하기',
  ],
  proof: [
    '기본 증명 방법(귀납법, 귀류법 등) 숙지',
    '정의와 정리를 정확히 사용하는 연습',
    '논리적 흐름을 단계별로 작성하는 습관',
  ],
  graph: [
    '그래프의 특성(기울기, 절편, 대칭 등) 파악 훈련',
    '그래프와 식의 상호 변환 연습',
    '다양한 그래프 유형 그려보기',
  ],
  geometry: [
    '도형의 성질과 정리 암기 및 적용',
    '보조선 긋기 전략 연습',
    '다양한 도형 문제로 공간감각 훈련',
  ],
  statistics: [
    '평균, 분산, 표준편차 공식 숙지',
    '확률 계산 문제 유형별 정리',
    '통계 자료 해석 연습',
  ],
};

// 난이도별 학습 조언
export const DIFFICULTY_ADVICE: Record<string, string> = {
  concept: '기초 개념 이해에 집중하세요. 교과서 예제부터 차근차근!',
  pattern: '유형별 풀이 방법을 익히세요. 반복 연습이 핵심입니다.',
  reasoning: '왜 그렇게 풀어야 하는지 논리적 사고력을 기르세요.',
  creative: '다양한 접근법을 시도하고 창의적 문제해결력을 키우세요.',
  low: '기본 문제를 완벽히 익히세요. 실수를 줄이는 것이 중요합니다.',
  medium: '표준 문제를 빠르고 정확하게 풀 수 있도록 연습하세요.',
  high: '고난도 문제는 충분한 시간을 들여 깊이 있게 분석하세요.',
};
