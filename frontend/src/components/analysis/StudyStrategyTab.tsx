/**
 * Study Strategy Tab - 출제 현황 및 학습 대책 (규칙 기반 자동 생성)
 *
 * 분석 결과를 바탕으로 영역별 출제 현황과 학습 전략을 자동 생성합니다.
 * - 출제 영역별 상세 분석 (테이블)
 * - 영역별 학습 전략 (접이식 섹션) - 2022 개정 교육과정 기반
 * - 서술형 대비 전략
 */
import { memo, useMemo, useState } from 'react';
import type { QuestionAnalysis } from '../../services/analysis';
import { DIFFICULTY_COLORS, QUESTION_TYPE_COLORS } from '../../styles/tokens';
import {
  findMatchingStrategies,
  findCommonMistakes,
  findGradeConnections,
  findKillerPatterns,
  getBooksByLevel,
  getSmartBookRecommendations,
  recommendLevelByPerformance,
  getPersonalizedBookRecommendations,
  findTimeAllocationStrategy,
  LEVEL_STRATEGIES,
  ESSAY_CHECKLIST,
  ESSAY_ADVANCED_GUIDE,
  FOUR_WEEK_TIMELINE,
  BOOK_SELECTION_GUIDE,
  BOOK_CAUTIONS,
  ENCOURAGEMENT_MESSAGES,
  type GradeConnection,
  type KillerQuestionType,
  type LevelRecommendation,
} from '../../data/curriculumStrategies';
import {
  findMultipleTopicStrategies,
} from '../../data/topicLevelStrategies';

interface StudyStrategyTabProps {
  questions: QuestionAnalysis[];
}

interface TopicSummary {
  topic: string;
  shortTopic: string;
  questionCount: number;
  totalPoints: number;
  percentage: number;
  difficulties: string[];
  types: string[];
  essayCount: number;
  avgDifficulty: number;
  features: string[];
  questionNumbers: number[]; // 해당 단원의 문항 번호들
}

// 대단원 그룹핑 인터페이스
interface ChapterGroup {
  chapterName: string;
  topics: TopicSummary[];
  questionCount: number;
  totalPoints: number;
  percentage: number;
  essayCount: number;
  avgDifficulty: number;
  features: string[];
}

// 난이도별 가중치 (학습 우선순위 계산용)
const DIFFICULTY_WEIGHT: Record<string, number> = {
  concept: 1,
  pattern: 2,
  reasoning: 3,
  creative: 4,
  low: 1,
  medium: 2,
  high: 3,
};

// 난이도 라벨
const DIFFICULTY_LABELS: Record<string, string> = {
  concept: '개념',
  pattern: '유형',
  reasoning: '심화',
  creative: '최상위',
  low: '하',
  medium: '중',
  high: '상',
};

// 유형별 학습 전략 템플릿
const TYPE_STRATEGIES: Record<string, string[]> = {
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
const DIFFICULTY_ADVICE: Record<string, string> = {
  concept: '기초 개념 이해에 집중하세요. 교과서 예제부터 차근차근!',
  pattern: '유형별 풀이 방법을 익히세요. 반복 연습이 핵심입니다.',
  reasoning: '왜 그렇게 풀어야 하는지 논리적 사고력을 기르세요.',
  creative: '다양한 접근법을 시도하고 창의적 문제해결력을 키우세요.',
  low: '기본 문제를 완벽히 익히세요. 실수를 줄이는 것이 중요합니다.',
  medium: '표준 문제를 빠르고 정확하게 풀 수 있도록 연습하세요.',
  high: '고난도 문제는 충분한 시간을 들여 깊이 있게 분석하세요.',
};

export const StudyStrategyTab = memo(function StudyStrategyTab({
  questions,
}: StudyStrategyTabProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set()); // 대단원 펼치기 state
  const [expandedMistakes, setExpandedMistakes] = useState<Set<string>>(new Set());
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());
  const [expandedKillers, setExpandedKillers] = useState<Set<string>>(new Set());
  const [expandedConnectionImportance, setExpandedConnectionImportance] = useState<Map<string, Set<string>>>(new Map());
  const [showLevelStrategy, setShowLevelStrategy] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showEssayAdvanced, setShowEssayAdvanced] = useState(false);
  const [selectedEssayGuide, setSelectedEssayGuide] = useState<string | null>(null);
  const [selectedBookLevel, setSelectedBookLevel] = useState<'하위권' | '중위권' | '상위권' | null>(null);
  const [showBookDetails, setShowBookDetails] = useState(false);

  // 토픽별 분석 데이터 계산
  const { topicSummaries, chapterGroups, totalPoints, essayQuestions, is4Level } = useMemo(() => {
    const topicMap = new Map<string, TopicSummary>();
    const totalPts = questions.reduce((sum, q) => sum + (q.points || 0), 0);

    // 4단계 시스템 감지
    const is4Level = questions.some(q =>
      ['concept', 'pattern', 'reasoning', 'creative'].includes(q.difficulty)
    );

    questions.forEach((q) => {
      const topic = q.topic || '기타';
      const shortTopic = topic.split(' > ').pop() || topic;

      if (!topicMap.has(topic)) {
        topicMap.set(topic, {
          topic,
          shortTopic,
          questionCount: 0,
          totalPoints: 0,
          percentage: 0,
          difficulties: [],
          types: [],
          essayCount: 0,
          avgDifficulty: 0,
          features: [],
          questionNumbers: [],
        });
      }

      const summary = topicMap.get(topic)!;
      summary.questionCount++;
      summary.totalPoints += q.points || 0;
      if (q.difficulty) summary.difficulties.push(q.difficulty);
      if (q.question_type) summary.types.push(q.question_type);
      if (q.question_format === 'essay' || q.question_format === 'short_answer') {
        summary.essayCount++;
      }
      // 문항 번호 수집
      if (q.question_number != null) {
        const num = typeof q.question_number === 'string'
          ? parseInt(q.question_number, 10)
          : q.question_number;
        if (!isNaN(num)) {
          summary.questionNumbers.push(num);
        }
      }
    });

    // 비율 및 특징 계산
    topicMap.forEach((summary) => {
      summary.percentage = totalPts > 0 ? (summary.totalPoints / totalPts) * 100 : 0;

      // 평균 난이도 계산
      if (summary.difficulties.length > 0) {
        const weights = summary.difficulties.map(d => DIFFICULTY_WEIGHT[d] || 2);
        summary.avgDifficulty = weights.reduce((a, b) => a + b, 0) / weights.length;
      }

      // 특징 생성
      if (summary.essayCount > 0) {
        summary.features.push(`서술형 ${summary.essayCount}문항`);
      }
      if (summary.avgDifficulty >= 3) {
        summary.features.push('고난도 집중');
      }
      if (summary.questionCount >= 3) {
        summary.features.push('출제 빈도 높음');
      }
      if (summary.percentage >= 20) {
        summary.features.push('핵심 단원');
      }
    });

    // 배점 높은 순으로 정렬
    const sortedSummaries = Array.from(topicMap.values())
      .sort((a, b) => b.totalPoints - a.totalPoints);

    // 대단원(중단원) 기준 그룹핑
    const chapterMap = new Map<string, ChapterGroup>();
    sortedSummaries.forEach((summary) => {
      const parts = summary.topic.split(' > ');
      const chapterName = parts.length >= 2 ? parts[1] : parts[0];

      if (!chapterMap.has(chapterName)) {
        chapterMap.set(chapterName, {
          chapterName,
          topics: [],
          questionCount: 0,
          totalPoints: 0,
          percentage: 0,
          essayCount: 0,
          avgDifficulty: 0,
          features: [],
        });
      }

      const chapter = chapterMap.get(chapterName)!;
      chapter.topics.push(summary);
      chapter.questionCount += summary.questionCount;
      chapter.totalPoints += summary.totalPoints;
      chapter.essayCount += summary.essayCount;
    });

    // 대단원별 통계 계산
    chapterMap.forEach((chapter) => {
      chapter.percentage = totalPts > 0 ? (chapter.totalPoints / totalPts) * 100 : 0;
      const allDiffs = chapter.topics.flatMap(t => t.difficulties);
      if (allDiffs.length > 0) {
        const weights = allDiffs.map(d => DIFFICULTY_WEIGHT[d] || 2);
        chapter.avgDifficulty = weights.reduce((a, b) => a + b, 0) / weights.length;
      }
      if (chapter.essayCount > 0) chapter.features.push(`서술형 ${chapter.essayCount}문항`);
      if (chapter.avgDifficulty >= 3) chapter.features.push('고난도 집중');
      if (chapter.percentage >= 15) chapter.features.push('핵심 대단원');
      chapter.topics.sort((a, b) => b.totalPoints - a.totalPoints);
    });

    const sortedChapters = Array.from(chapterMap.values())
      .sort((a, b) => b.totalPoints - a.totalPoints);

    // 서술형 문항
    const essayQs = questions.filter(
      q => q.question_format === 'essay' || q.question_format === 'short_answer'
    );

    return {
      topicSummaries: sortedSummaries,
      chapterGroups: sortedChapters,
      totalPoints: totalPts,
      essayQuestions: essayQs,
      is4Level,
    };
  }, [questions]);

  // 취약 단원의 단원별 수준별 학습 전략 찾기
  const topicLevelStrategies = useMemo(() => {
    // shortTopic 목록 추출 (배점 높은 순 상위 토픽들)
    const topicNames = topicSummaries
      .slice(0, 5) // 상위 5개 단원
      .map(summary => summary.shortTopic);

    return findMultipleTopicStrategies(topicNames);
  }, [topicSummaries]);

  const toggleTopic = (topic: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  const toggleChapter = (chapterName: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterName)) {
        next.delete(chapterName);
      } else {
        next.add(chapterName);
      }
      return next;
    });
  };

  const toggleMistake = (topic: string) => {
    setExpandedMistakes((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  const toggleConnection = (topic: string) => {
    setExpandedConnections((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  const toggleKiller = (unit: string) => {
    setExpandedKillers((prev) => {
      const next = new Set(prev);
      if (next.has(unit)) {
        next.delete(unit);
      } else {
        next.add(unit);
      }
      return next;
    });
  };

  const toggleConnectionImportance = (topic: string, importance: string) => {
    setExpandedConnectionImportance((prev) => {
      const next = new Map(prev);
      const topicSet = next.get(topic) || new Set<string>();
      const newTopicSet = new Set(topicSet);

      if (newTopicSet.has(importance)) {
        newTopicSet.delete(importance);
      } else {
        newTopicSet.add(importance);
      }

      next.set(topic, newTopicSet);
      return next;
    });
  };

  // 학년별 연계 데이터 수집
  const gradeConnections = useMemo(() => {
    const connectionsMap = new Map<string, GradeConnection[]>();
    topicSummaries.forEach((summary) => {
      const connections = findGradeConnections(summary.topic);
      if (connections.length > 0) {
        connectionsMap.set(summary.topic, connections);
      }
    });
    return connectionsMap;
  }, [topicSummaries]);

  // 킬러 문항 유형 수집
  const killerPatterns = useMemo(() => {
    const killersMap = new Map<string, KillerQuestionType>();
    topicSummaries.forEach((summary) => {
      const killer = findKillerPatterns(summary.topic);
      if (killer && !killersMap.has(killer.unit)) {
        killersMap.set(killer.unit, killer);
      }
    });
    return killersMap;
  }, [topicSummaries]);


  // 수준별 격려 메시지 (분석 결과 기반으로 결정론적 선택)
  const levelEncouragements = useMemo(() => {
    // questions 배열을 기반으로 고유한 시드 생성
    const seed = questions.reduce((acc, q, idx) => {
      const qNum = typeof q.question_number === 'string'
        ? parseInt(q.question_number, 10) || idx
        : (q.question_number || idx);
      return acc + qNum * (idx + 1);
    }, questions.length);

    // 시드를 기반으로 각 수준별 메시지 인덱스 결정
    const getMessageForLevel = (level: '하위권' | '중위권' | '상위권', offset: number) => {
      // 해당 수준의 메시지 직접 가져오기 (랜덤 X)
      const levelData = ENCOURAGEMENT_MESSAGES.find(e => e.level === level);
      const commonData = ENCOURAGEMENT_MESSAGES.find(e => e.level === '공통');
      const allMessages = [
        ...(levelData?.messages || []),
        ...(commonData?.messages || []),
      ];

      if (allMessages.length === 0) return '꾸준히 노력하면 반드시 성장합니다!';

      const index = (seed + offset) % allMessages.length;
      return allMessages[index];
    };

    return {
      '하위권': getMessageForLevel('하위권', 0),
      '중위권': getMessageForLevel('중위권', 1),
      '상위권': getMessageForLevel('상위권', 2),
    };
  }, [questions]); // questions가 변경되면 재계산 (같은 시험지면 같은 메시지)

  // 자동 수준 추천 (답안지 분석 기반)
  const autoLevelRecommendation = useMemo<LevelRecommendation | null>(() => {
    const recommendation = recommendLevelByPerformance(questions);
    // confidence가 0이면 답안 데이터가 없는 것
    return recommendation.confidence > 0 ? recommendation : null;
  }, [questions]);

  // 학습 전략 생성 (교육과정 기반 + 규칙 기반)
  const generateStrategy = (summary: TopicSummary): string[] => {
    const strategies: string[] = [];

    // 1. 교육과정 기반 전략 우선 적용
    const curriculumMatch = findMatchingStrategies(summary.topic);
    if (curriculumMatch) {
      strategies.push(...curriculumMatch.strategies.slice(0, 3));
    }

    // 2. 교육과정 매칭이 없으면 유형별 전략 추가
    if (strategies.length === 0) {
      const uniqueTypes = [...new Set(summary.types)];
      uniqueTypes.forEach((type) => {
        const typeStrategies = TYPE_STRATEGIES[type];
        if (typeStrategies) {
          strategies.push(...typeStrategies.slice(0, 1));
        }
      });
    }

    // 3. 난이도별 조언 추가 (전략이 부족할 때)
    if (strategies.length < 3) {
      const avgDiff = Math.round(summary.avgDifficulty);
      const diffKeys = Object.keys(DIFFICULTY_ADVICE);
      const diffKey = diffKeys[Math.min(avgDiff, diffKeys.length - 1)];
      if (diffKey && DIFFICULTY_ADVICE[diffKey]) {
        strategies.push(DIFFICULTY_ADVICE[diffKey]);
      }
    }

    // 4. 서술형 관련 조언
    if (summary.essayCount > 0 && strategies.length < 4) {
      strategies.push('서술형 문제는 풀이 과정을 논리적으로 작성하는 연습이 필요합니다.');
    }

    // 5. 고배점 관련 조언
    if (summary.totalPoints >= 15 && strategies.length < 4) {
      strategies.push('배점이 높은 단원이므로 확실히 마스터하세요.');
    }

    return strategies.slice(0, 4); // 최대 4개
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        분석할 문항이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 출제 영역별 상세 분석 - 대단원 그룹핑 아코디언 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">출제 영역별 상세 분석</h3>
                <p className="text-xs text-gray-600">
                  {chapterGroups.length}개 대단원, {topicSummaries.length}개 소단원, 총 {Math.round(totalPoints)}점
                </p>
              </div>
            </div>
            {/* 모두 펼치기/접기 버튼 */}
            <button
              onClick={() => {
                const allExpanded = chapterGroups.every(c => expandedChapters.has(c.chapterName));
                if (allExpanded) {
                  setExpandedChapters(new Set());
                } else {
                  setExpandedChapters(new Set(chapterGroups.map(c => c.chapterName)));
                }
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50"
            >
              {chapterGroups.every(c => expandedChapters.has(c.chapterName)) ? '모두 접기' : '모두 펼치기'}
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {chapterGroups.map((chapter) => {
            const isExpanded = expandedChapters.has(chapter.chapterName);
            const avgDiffIndex = Math.round(chapter.avgDifficulty) - 1;
            const diffKeys = is4Level
              ? ['concept', 'pattern', 'reasoning', 'creative']
              : ['low', 'medium', 'high'];
            const diffKey = diffKeys[Math.min(Math.max(avgDiffIndex, 0), diffKeys.length - 1)] as keyof typeof DIFFICULTY_COLORS;
            const diffColor = DIFFICULTY_COLORS[diffKey] || DIFFICULTY_COLORS.pattern;

            return (
              <div key={chapter.chapterName}>
                {/* 대단원 행 (클릭 가능) */}
                <button
                  onClick={() => toggleChapter(chapter.chapterName)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* 펼치기 아이콘 */}
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: diffColor.bg }}
                    />
                    <span className="font-semibold text-gray-900 truncate">{chapter.chapterName}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      ({chapter.topics.length}개 소단원)
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-sm text-gray-600">{chapter.questionCount}문항</span>
                    <span className="text-sm font-medium text-gray-900 w-16 text-right">{chapter.totalPoints}점</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium w-12 text-center ${chapter.percentage >= 20
                        ? 'bg-red-100 text-red-700'
                        : chapter.percentage >= 10
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                      {chapter.percentage.toFixed(0)}%
                    </span>
                    <div className="flex gap-1 flex-nowrap min-w-[140px]">
                      {chapter.features.slice(0, 2).map((feature, i) => (
                        <span
                          key={i}
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${feature.includes('서술형')
                            ? 'bg-purple-100 text-purple-700'
                            : feature.includes('고난도')
                              ? 'bg-red-100 text-red-700'
                              : feature.includes('핵심')
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>

                {/* 소단원 목록 (펼쳐질 때) */}
                {isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-100">
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {chapter.topics.map((summary) => {
                          const topicDiffIndex = Math.round(summary.avgDifficulty) - 1;
                          const topicDiffKey = diffKeys[Math.min(Math.max(topicDiffIndex, 0), diffKeys.length - 1)] as keyof typeof DIFFICULTY_COLORS;
                          const topicDiffColor = DIFFICULTY_COLORS[topicDiffKey] || DIFFICULTY_COLORS.pattern;

                          return (
                            <tr
                              key={summary.topic}
                              className="hover:bg-blue-50 transition-colors"
                            >
                              <td className="pl-12 pr-4 py-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: topicDiffColor.bg }}
                                    title={DIFFICULTY_LABELS[topicDiffKey]}
                                  />
                                  <span className="text-gray-700" title={summary.topic}>
                                    {summary.shortTopic}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-center text-gray-600">
                                <div className="flex flex-col items-center">
                                  <span>{summary.questionCount}문항</span>
                                  {summary.questionNumbers.length > 0 && (
                                    <span className="text-xs text-indigo-500 font-medium">
                                      ({summary.questionNumbers.sort((a, b) => a - b).join(', ')}번)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-center font-medium text-gray-800 w-20">
                                {summary.totalPoints}점
                              </td>
                              <td className="px-4 py-2 text-center w-16">
                                <span className="text-xs text-gray-500">
                                  {summary.percentage.toFixed(0)}%
                                </span>
                              </td>
                              <td className="px-4 py-2 w-40">
                                <div className="flex flex-wrap gap-1">
                                  {summary.features.map((feature, i) => (
                                    <span
                                      key={i}
                                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${feature.includes('서술형')
                                        ? 'bg-purple-100 text-purple-700'
                                        : feature.includes('고난도')
                                          ? 'bg-red-100 text-red-700'
                                          : feature.includes('핵심')
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                      {feature}
                                    </span>
                                  ))}
                                  {summary.features.length === 0 && (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 영역별 학습 전략 (접이식) */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">영역별 학습 전략</h3>
              <p className="text-xs text-gray-600">각 단원을 클릭하여 맞춤 전략을 확인하세요</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {topicSummaries.slice(0, 6).map((summary) => {
            const isExpanded = expandedTopics.has(summary.topic);
            const strategies = generateStrategy(summary);
            const avgDiffIndex = Math.round(summary.avgDifficulty) - 1;
            const diffKeys = is4Level
              ? ['concept', 'pattern', 'reasoning', 'creative']
              : ['low', 'medium', 'high'];
            const diffKey = diffKeys[Math.min(avgDiffIndex, diffKeys.length - 1)] as keyof typeof DIFFICULTY_COLORS;
            const diffColor = DIFFICULTY_COLORS[diffKey] || DIFFICULTY_COLORS.pattern;

            return (
              <div key={summary.topic}>
                <button
                  onClick={() => toggleTopic(summary.topic)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: diffColor.bg }}
                    />
                    <span className="font-medium text-gray-900">{summary.shortTopic}</span>
                    <span className="text-xs text-gray-500">
                      ({summary.questionCount}문항 · {summary.totalPoints}점)
                    </span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 bg-gray-50">
                    <div className="pl-6 border-l-2 border-purple-200 space-y-2">
                      {strategies.map((strategy, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-purple-500 mt-0.5">▸</span>
                          <span className="text-gray-700">{strategy}</span>
                        </div>
                      ))}
                    </div>

                    {/* 출제 유형 태그 */}
                    <div className="mt-3 pl-6 flex flex-wrap gap-1.5">
                      {[...new Set(summary.types)].map((type) => {
                        const typeConfig = QUESTION_TYPE_COLORS[type] || { color: '#9ca3af', label: type };
                        return (
                          <span
                            key={type}
                            className="inline-block px-2 py-0.5 rounded text-[10px] font-medium"
                            style={{
                              backgroundColor: `${typeConfig.color}20`,
                              color: typeConfig.color,
                            }}
                          >
                            {typeConfig.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 서술형 대비 전략 */}
      {essayQuestions.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">서술형 대비 전략</h3>
                <p className="text-xs text-gray-600">
                  {essayQuestions.length}문항, 총{' '}
                  {essayQuestions.reduce((sum, q) => sum + (q.points || 0), 0)}점
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* 서술형 문항 요약 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {essayQuestions.slice(0, 4).map((q) => {
                const diffColor = DIFFICULTY_COLORS[q.difficulty as keyof typeof DIFFICULTY_COLORS] || DIFFICULTY_COLORS.pattern;
                return (
                  <div
                    key={q.id || q.question_number}
                    className="p-3 bg-amber-50 rounded-lg border border-amber-100"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">
                        {q.question_number}번
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{ backgroundColor: `${diffColor.bg}20`, color: diffColor.bg }}
                        >
                          {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
                        </span>
                        <span className="text-sm font-medium text-amber-700">
                          {q.points}점
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 truncate" title={q.topic || ''}>
                      {q.topic?.split(' > ').pop() || '기타'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 서술형 감점 방지 체크리스트 */}
            <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-amber-900 mb-3">서술형 감점 방지 체크리스트</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ESSAY_CHECKLIST.map((item) => (
                  <div key={item.category} className="bg-white bg-opacity-60 rounded-lg p-3">
                    <h5 className="text-xs font-semibold text-amber-800 mb-2">{item.category}</h5>
                    <ul className="space-y-1">
                      {item.checkPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                          <span className="text-amber-500 mt-0.5">☐</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* 주요 감점 사례 */}
            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
              <h4 className="text-sm font-semibold text-red-800 mb-2">주요 감점 사례</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="bg-white rounded p-2">
                  <span className="text-red-600 font-medium">논리적 비약</span>
                  <p className="text-gray-600 mt-0.5">중간 단계 생략</p>
                </div>
                <div className="bg-white rounded p-2">
                  <span className="text-red-600 font-medium">형식 오류</span>
                  <p className="text-gray-600 mt-0.5">등호 연속 사용</p>
                </div>
                <div className="bg-white rounded p-2">
                  <span className="text-red-600 font-medium">단위 누락</span>
                  <p className="text-gray-600 mt-0.5">최종답 단위 미표기</p>
                </div>
                <div className="bg-white rounded p-2">
                  <span className="text-red-600 font-medium">부호 실수</span>
                  <p className="text-gray-600 mt-0.5">음수 계산 오류</p>
                </div>
              </div>
            </div>

            {/* 서술형 심화 가이드 토글 */}
            <button
              onClick={() => setShowEssayAdvanced(!showEssayAdvanced)}
              className="w-full p-3 bg-gradient-to-r from-purple-100 to-violet-100 rounded-lg border border-purple-200 flex items-center justify-between hover:from-purple-200 hover:to-violet-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-purple-800">서술형 심화 가이드 보기</span>
              </div>
              <svg
                className={`w-5 h-5 text-purple-600 transition-transform ${showEssayAdvanced ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showEssayAdvanced && (
              <div className="space-y-4">
                {/* 카테고리 탭 */}
                <div className="flex flex-wrap gap-2">
                  {ESSAY_ADVANCED_GUIDE.map((guide) => (
                    <button
                      key={guide.category}
                      onClick={() => setSelectedEssayGuide(
                        selectedEssayGuide === guide.category ? null : guide.category
                      )}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedEssayGuide === guide.category
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}
                    >
                      {guide.title}
                    </button>
                  ))}
                </div>

                {/* 선택된 가이드 내용 */}
                {selectedEssayGuide && (
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    {ESSAY_ADVANCED_GUIDE.filter(g => g.category === selectedEssayGuide).map((guide) => (
                      <div key={guide.category}>
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-sm font-semibold text-purple-900">{guide.title}</h4>
                        </div>
                        <p className="text-xs text-purple-700 mb-3">{guide.description}</p>

                        {/* 템플릿 목록 */}
                        <div className="space-y-2 mb-3">
                          {guide.templates.map((template, i) => (
                            <div key={i} className="bg-white rounded p-3 border border-purple-100">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] px-1.5 py-0.5 bg-purple-200 text-purple-800 rounded font-medium">
                                  {template.situation}
                                </span>
                              </div>
                              <div className="text-sm font-medium text-gray-800 mb-1">
                                {template.template}
                              </div>
                              <div className="text-xs text-gray-600 italic">
                                예: {template.example}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 채점 팁 */}
                        <div className="bg-green-50 rounded p-3 border border-green-100">
                          <h5 className="text-xs font-semibold text-green-800 mb-1.5">채점 포인트</h5>
                          <ul className="space-y-1">
                            {guide.scoringTips.map((tip, i) => (
                              <li key={i} className="text-[10px] text-green-700 flex items-start gap-1">
                                <span className="text-green-500">★</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 시험 시간 배분 전략 (통합 컴팩트 버전) */}
      {topicSummaries.length > 0 && (() => {
        // 전체 시험 시간 결정 (중학교 45분, 고등학교 50분)
        const totalPoints = topicSummaries.reduce((sum, t) => sum + t.totalPoints, 0);
        const examDuration = totalPoints <= 60 ? 45 : 50;
        const reviewTime = 5; // 검토 시간
        const solvingTime = examDuration - reviewTime; // 풀이 시간

        // 단원별 권장 시간 계산
        const topicsWithTime = topicSummaries.map(summary => {
          const timeAllocation = findTimeAllocationStrategy(summary.topic);
          const recommendedMinutes = Math.round(solvingTime * (summary.percentage / 100));
          return {
            ...summary,
            recommendedMinutes,
            timeAllocation,
          };
        }).sort((a, b) => b.recommendedMinutes - a.recommendedMinutes);

        // 모든 단원의 팁 통합 (중복 제거)
        const allQuickTypes = new Set<string>();
        const allTimeConsumingTypes = new Set<string>();
        const allTimeSavingTips = new Set<string>();

        topicsWithTime.forEach(topic => {
          if (topic.timeAllocation) {
            topic.timeAllocation.quickTypes.forEach(t => allQuickTypes.add(t));
            topic.timeAllocation.timeConsumingTypes.forEach(t => allTimeConsumingTypes.add(t));
            topic.timeAllocation.timeSavingTips.forEach(t => allTimeSavingTips.add(t));
          }
        });

        // 막대 그래프용 최대값 계산
        const maxMinutes = Math.max(...topicsWithTime.map(t => t.recommendedMinutes));

        return (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">시험 시간 배분 전략</h3>
                  <p className="text-xs text-gray-600">
                    {examDuration === 45 ? '중학교 45분' : '고등학교 50분'} 시험 기준 · 풀이 {solvingTime}분 + 검토 {reviewTime}분
                  </p>
                </div>
              </div>
            </div>

            {/* 시간 배분 막대 그래프 */}
            <div className="p-4 space-y-2">
              {topicsWithTime.map((topic, idx) => (
                <div key={topic.topic} className="flex items-center gap-3">
                  {/* 단원명 */}
                  <div className="w-50 flex-shrink-0 text-xs text-gray-700 truncate" title={topic.shortTopic}>
                    {topic.shortTopic}
                  </div>
                  {/* 막대 그래프 */}
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(topic.recommendedMinutes / maxMinutes) * 100}%`,
                        background: idx === 0 ? 'linear-gradient(90deg, #0891b2, #06b6d4)' :
                          idx === 1 ? 'linear-gradient(90deg, #0ea5e9, #38bdf8)' :
                            idx === 2 ? 'linear-gradient(90deg, #3b82f6, #60a5fa)' :
                              'linear-gradient(90deg, #6366f1, #818cf8)',
                      }}
                    />
                    <div className="absolute inset-0 flex items-center px-2">
                      <span className="text-[10px] font-medium text-white drop-shadow-sm">
                        {topic.recommendedMinutes}분
                      </span>
                    </div>
                  </div>
                  {/* 문항/배점 정보 */}
                  <div className="w-24 flex-shrink-0 text-right">
                    <span className="text-xs text-gray-500">{topic.questionCount}문항</span>
                    <span className="text-xs text-gray-400 mx-1">·</span>
                    <span className="text-xs font-medium text-cyan-600">{Math.round(topic.percentage)}%</span>
                  </div>
                </div>
              ))}

              {/* 검토 시간 */}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <div className="w-50 flex-shrink-0 text-xs text-green-700 font-medium">
                  검토 시간
                </div>
                <div className="flex-1 h-6 bg-green-50 rounded-full overflow-hidden relative border border-green-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-400"
                    style={{ width: `${(reviewTime / maxMinutes) * 100}%` }}
                  />
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-[10px] font-medium text-green-800">
                      {reviewTime}분
                    </span>
                  </div>
                </div>
                <div className="w-24 flex-shrink-0 text-right">
                  <span className="text-xs text-green-600">필수 확보</span>
                </div>
              </div>
            </div>

            {/* 통합 전략 팁 (데이터가 있을 때만) */}
            {(allQuickTypes.size > 0 || allTimeConsumingTypes.size > 0 || allTimeSavingTips.size > 0) && (
              <div className="px-4 pb-4">
                <div className="grid md:grid-cols-3 gap-3">
                  {/* 빠르게 풀기 */}
                  {allQuickTypes.size > 0 && (
                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                      <h5 className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                          </svg>
                        </span>
                        빠르게 풀기
                      </h5>
                      <ul className="space-y-1">
                        {Array.from(allQuickTypes).slice(0, 4).map((type, i) => (
                          <li key={i} className="text-[10px] text-green-700 flex items-start gap-1">
                            <span className="text-green-500 mt-0.5">•</span>
                            <span>{type}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 시간 주의 */}
                  {allTimeConsumingTypes.size > 0 && (
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                      <h5 className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </span>
                        시간 주의
                      </h5>
                      <ul className="space-y-1">
                        {Array.from(allTimeConsumingTypes).slice(0, 4).map((type, i) => (
                          <li key={i} className="text-[10px] text-amber-700 flex items-start gap-1">
                            <span className="text-amber-500 mt-0.5">•</span>
                            <span>{type}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 절약 팁 */}
                  {allTimeSavingTips.size > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <h5 className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </span>
                        절약 팁
                      </h5>
                      <ul className="space-y-1">
                        {Array.from(allTimeSavingTips).slice(0, 4).map((tip, i) => (
                          <li key={i} className="text-[10px] text-blue-700 flex items-start gap-1">
                            <span className="text-blue-500 mt-0.5">✓</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 공통 전략 메시지 */}
                <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200 text-[10px] text-gray-600">
                  <span className="font-medium text-gray-700">전략:</span> 1분 내 풀이 방향이 안 보이면 별표(★) 후 넘기기 → 쉬운 문제 먼저 확보 → 남은 시간에 고난도 도전
                </div>
              </div>
            )}

            {/* 팁 데이터가 없을 때 기본 전략만 표시 */}
            {allQuickTypes.size === 0 && allTimeConsumingTypes.size === 0 && allTimeSavingTips.size === 0 && (
              <div className="px-4 pb-4">
                <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200 text-xs text-cyan-800">
                  <div className="font-medium mb-1">기본 전략</div>
                  <ul className="space-y-1 text-[10px]">
                    <li>• 쉬운 문제부터 빠르게 풀어 점수 확보</li>
                    <li>• 1분 내 풀이 방향이 안 보이면 별표 후 넘기기</li>
                    <li>• 검토 시간에 실수 점검 (부호, 단위, 계산)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 자주 하는 실수 유형 */}
      {topicSummaries.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-red-50 to-pink-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">자주 하는 실수 유형</h3>
                <p className="text-xs text-gray-600">해당 단원에서 학생들이 반복적으로 틀리는 유형</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {topicSummaries.slice(0, 5).map((summary) => {
              const mistake = findCommonMistakes(summary.topic);
              if (!mistake) return null;

              const isExpanded = expandedMistakes.has(summary.topic);

              return (
                <div key={`mistake-${summary.topic}`}>
                  <button
                    onClick={() => toggleMistake(summary.topic)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-red-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-red-400" />
                      <span className="font-medium text-gray-900">{summary.shortTopic}</span>
                      <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                        실수 {mistake.mistakes.length}개
                      </span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 bg-red-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 흔한 실수 */}
                        <div className="pl-4 border-l-2 border-red-300">
                          <h5 className="text-xs font-semibold text-red-700 mb-2">흔한 실수</h5>
                          {mistake.mistakes.map((m, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm mb-1.5">
                              <span className="text-red-500 mt-0.5">✗</span>
                              <span className="text-gray-700">{m}</span>
                            </div>
                          ))}
                        </div>
                        {/* 예방법 */}
                        <div className="pl-4 border-l-2 border-green-300">
                          <h5 className="text-xs font-semibold text-green-700 mb-2">예방법</h5>
                          {mistake.prevention.map((p, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm mb-1.5">
                              <span className="text-green-500 mt-0.5">✓</span>
                              <span className="text-gray-700">{p}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }).filter(Boolean)}
          </div>
        </div>
      )}

      {/* 학년별 연계 경고 - 대단원별 그루핑 */}
      {gradeConnections.size > 0 && (() => {
        // 대단원 분류 함수
        const getMajorUnit = (topic: string): string => {
          const t = topic.toLowerCase();
          if (t.includes('지수') || t.includes('로그')) return '지수와 로그';
          if (t.includes('삼각함수') || t.includes('삼각비') || t.includes('호도법') || t.includes('부채꼴') || t.includes('사인') || t.includes('코사인')) return '삼각함수';
          if (t.includes('수열') || t.includes('급수') || t.includes('점화식') || t.includes('등차') || t.includes('등비')) return '수열';
          if (t.includes('함수') || t.includes('합성') || t.includes('역함수')) return '함수';
          if (t.includes('극한') || t.includes('연속')) return '극한과 연속';
          if (t.includes('미분') || t.includes('도함수')) return '미분';
          if (t.includes('적분')) return '적분';
          if (t.includes('확률') || t.includes('순열') || t.includes('조합')) return '확률과 통계';
          if (t.includes('벡터') || t.includes('평면')) return '벡터';
          if (t.includes('행렬')) return '행렬';
          if (t.includes('방정식') || t.includes('부등식')) return '방정식과 부등식';
          if (t.includes('집합') || t.includes('명제')) return '집합과 명제';
          return '기타';
        };

        // 대단원별로 그루핑
        type ConnectionsType = typeof gradeConnections extends Map<string, infer V> ? V : never;
        const groupedByMajor = new Map<string, Array<{ topic: string; connections: ConnectionsType }>>();
        Array.from(gradeConnections.entries()).forEach(([topic, connections]) => {
          const majorUnit = getMajorUnit(topic);
          if (!groupedByMajor.has(majorUnit)) {
            groupedByMajor.set(majorUnit, []);
          }
          groupedByMajor.get(majorUnit)!.push({ topic, connections });
        });

        // 필수 연계 개수가 많은 순으로 정렬
        const sortedGroups = Array.from(groupedByMajor.entries()).sort((a, b) => {
          const aCritical = a[1].reduce((sum, item) => sum + item.connections.filter(c => c.importance === 'critical').length, 0);
          const bCritical = b[1].reduce((sum, item) => sum + item.connections.filter(c => c.importance === 'critical').length, 0);
          return bCritical - aCritical;
        });

        const totalCritical = Array.from(gradeConnections.values()).flat().filter(c => c.importance === 'critical').length;

        return (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">학년별 연계 경고</h3>
                    <p className="text-xs text-gray-600">선수학습이 중요한 단원 (대단원별)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{sortedGroups.length}개 단원</span>
                  {totalCritical > 0 && (
                    <span className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded">
                      필수 {totalCritical}개
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {sortedGroups.map(([majorUnit, items]) => {
                const isExpanded = expandedConnections.has(majorUnit);
                const criticalCount = items.reduce((sum, item) => sum + item.connections.filter((c: GradeConnection) => c.importance === 'critical').length, 0);
                const totalCount = items.reduce((sum, item) => sum + item.connections.length, 0);

                return (
                  <div key={`major-${majorUnit}`}>
                    <button
                      onClick={() => toggleConnection(majorUnit)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-orange-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${criticalCount > 0 ? 'bg-red-500' : 'bg-orange-400'}`} />
                        <span className="font-medium text-gray-900">{majorUnit}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {items.length}개 소단원
                        </span>
                        {criticalCount > 0 && (
                          <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                            필수 {criticalCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-orange-600">연계 {totalCount}개</span>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 bg-orange-50 space-y-2">
                        {items.map(({ topic, connections }) => {
                          const shortTopic = topic.split(' > ').pop() || topic;
                          const topicCritical = connections.filter((c: GradeConnection) => c.importance === 'critical').length;
                          const topicImportanceSet = expandedConnectionImportance.get(topic) || new Set<string>();
                          const isTopicExpanded = topicImportanceSet.has('detail');

                          return (
                            <div key={`topic-${topic}`} className="bg-white rounded-lg border border-orange-200 overflow-hidden">
                              <button
                                onClick={() => toggleConnectionImportance(topic, 'detail')}
                                className="w-full px-3 py-2 flex items-center justify-between hover:bg-orange-50 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${topicCritical > 0 ? 'bg-red-400' : 'bg-orange-300'}`} />
                                  <span className="text-sm font-medium text-gray-800">{shortTopic}</span>
                                  {topicCritical > 0 && (
                                    <span className="text-[10px] text-red-600 bg-red-50 px-1 py-0.5 rounded">필수</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">{connections.length}개</span>
                                  <svg
                                    className={`w-4 h-4 text-gray-400 transition-transform ${isTopicExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </button>

                              {isTopicExpanded && (
                                <div className="px-3 pb-3 space-y-2 border-t border-orange-100">
                                  {connections.slice(0, 3).map((conn: GradeConnection, i: number) => (
                                    <div key={i} className={`p-2 rounded text-xs ${
                                      conn.importance === 'critical' ? 'bg-red-50 border-l-2 border-red-400' :
                                      conn.importance === 'high' ? 'bg-orange-50 border-l-2 border-orange-400' :
                                      'bg-yellow-50 border-l-2 border-yellow-400'
                                    }`}>
                                      <div className="flex items-center gap-1 mb-1">
                                        <span className={`px-1 py-0.5 rounded text-[9px] font-bold text-white ${
                                          conn.importance === 'critical' ? 'bg-red-500' :
                                          conn.importance === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                                        }`}>
                                          {conn.importance === 'critical' ? '필수' : conn.importance === 'high' ? '중요' : '권장'}
                                        </span>
                                        <span className="text-gray-600">{conn.fromGrade} → {conn.toGrade}</span>
                                      </div>
                                      <p className="text-gray-700 line-clamp-2">{conn.warning}</p>
                                    </div>
                                  ))}
                                  {connections.length > 3 && (
                                    <p className="text-[10px] text-gray-500 text-center">+{connections.length - 3}개 더...</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 킬러 문항 유형 경고 */}
      {killerPatterns.size > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-rose-50 to-red-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">킬러 문항 유형 경고</h3>
                <p className="text-xs text-gray-600">고난도 함정 문제 유형과 대응 전략</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {Array.from(killerPatterns.entries()).slice(0, 5).map(([unit, killer]) => {
              const isExpanded = expandedKillers.has(unit);
              const topDiffCount = killer.killerPatterns.filter(p => p.difficulty === '최상').length;

              return (
                <div key={`killer-${unit}`}>
                  <button
                    onClick={() => toggleKiller(unit)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-rose-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${topDiffCount > 0 ? 'bg-rose-600' : 'bg-rose-400'
                        }`} />
                      <span className="font-medium text-gray-900">{unit}</span>
                      <span className="text-xs text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                        함정 {killer.killerPatterns.length}개
                      </span>
                      {topDiffCount > 0 && (
                        <span className="text-xs text-white bg-rose-600 px-1.5 py-0.5 rounded">
                          최상 {topDiffCount}
                        </span>
                      )}
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 bg-rose-50">
                      <div className="space-y-3">
                        {killer.killerPatterns.map((pattern, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-lg border ${pattern.difficulty === '최상'
                              ? 'bg-rose-100 border-rose-300'
                              : 'bg-pink-50 border-pink-200'
                              }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pattern.difficulty === '최상'
                                ? 'bg-rose-600 text-white'
                                : 'bg-pink-500 text-white'
                                }`}>
                                {pattern.difficulty}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${pattern.frequency === '자주출제'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                                }`}>
                                {pattern.frequency}
                              </span>
                              <span className="text-sm font-medium text-gray-800">{pattern.pattern}</span>
                            </div>

                            <p className="text-xs text-gray-700 mb-2">
                              <span className="text-rose-600 font-medium">함정: </span>
                              {pattern.trapDescription}
                            </p>

                            <div className="bg-white bg-opacity-70 rounded p-2 mb-2">
                              <h5 className="text-[10px] font-semibold text-green-700 mb-1">해결 핵심</h5>
                              <ul className="space-y-0.5">
                                {pattern.solutionKey.map((key, j) => (
                                  <li key={j} className="text-[10px] text-gray-700 flex items-start gap-1">
                                    <span className="text-green-500">✓</span>
                                    <span>{key}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="text-[10px] text-gray-500 italic">
                              예시: {pattern.exampleSetup}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* 수준별 학습 전략 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <button
          onClick={() => setShowLevelStrategy(!showLevelStrategy)}
          className="w-full px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-green-50 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-gray-900">수준별 학습 전략</h3>
              <p className="text-xs text-gray-600">현재 수준에 맞는 효과적인 학습법</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${showLevelStrategy ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showLevelStrategy && (
          <div className="p-4 space-y-4">
            {/* 자동 수준 추천 배너 */}
            {autoLevelRecommendation && (
              <div className={`rounded-lg p-4 border-2 ${autoLevelRecommendation.level === '하위권' ? 'bg-blue-50 border-blue-300' :
                autoLevelRecommendation.level === '중위권' ? 'bg-yellow-50 border-yellow-300' :
                  'bg-red-50 border-red-300'
                }`}>
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${autoLevelRecommendation.level === '하위권' ? 'bg-blue-500' :
                    autoLevelRecommendation.level === '중위권' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}>
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`text-sm font-bold ${autoLevelRecommendation.level === '하위권' ? 'text-blue-900' :
                        autoLevelRecommendation.level === '중위권' ? 'text-yellow-900' :
                          'text-red-900'
                        }`}>
                        분석 결과 기반 추천: {autoLevelRecommendation.level} 교재
                      </h4>
                      <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                        신뢰도 {autoLevelRecommendation.confidence}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 mb-2">
                      {autoLevelRecommendation.reason}
                    </p>
                    {autoLevelRecommendation.weakPoints.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {autoLevelRecommendation.weakPoints.map((point: string, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-white rounded-full text-gray-600 border border-gray-200">
                            {point}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedBookLevel(autoLevelRecommendation.level)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded ${autoLevelRecommendation.level === '하위권' ? 'bg-blue-500 hover:bg-blue-600' :
                        autoLevelRecommendation.level === '중위권' ? 'bg-yellow-500 hover:bg-yellow-600' :
                          'bg-red-500 hover:bg-red-600'
                        } text-white transition-colors`}
                    >
                      추천 교재 보기
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 수준별 카드 - 단원별 맞춤 전략 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {LEVEL_STRATEGIES.map((level) => {
                const levelKey = level.level as '하위권' | '중위권' | '상위권';
                const isSelected = selectedBookLevel === levelKey;
                const encouragement = levelEncouragements[levelKey];

                // 해당 수준의 단원별 전략 가져오기
                const topicGuides = topicLevelStrategies.map(ts => {
                  const guide = levelKey === '하위권' ? ts.lower :
                    levelKey === '중위권' ? ts.middle :
                      ts.upper;
                  return { topic: ts.topic, grade: ts.grade, guide };
                });

                // 전략 통합 (최대 3개)
                const combinedStrategies = topicGuides.length > 0
                  ? topicGuides.flatMap(tg => tg.guide.strategies.slice(0, 2)).slice(0, 3)
                  : level.coreStrategies.slice(0, 3);

                // 학습량 평균
                const studyAmount = topicGuides.length > 0
                  ? topicGuides[0].guide.studyAmount
                  : level.studyHours;

                // 교재 통합
                const books = topicGuides.length > 0
                  ? topicGuides[0].guide.books
                  : level.recommendedBooks.slice(0, 2).join(', ');

                return (
                  <div
                    key={level.level}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${level.level === '하위권'
                      ? isSelected ? 'border-blue-400 bg-blue-100 ring-2 ring-blue-300' : 'border-blue-200 bg-blue-50 hover:border-blue-300'
                      : level.level === '중위권'
                        ? isSelected ? 'border-yellow-400 bg-yellow-100 ring-2 ring-yellow-300' : 'border-yellow-200 bg-yellow-50 hover:border-yellow-300'
                        : isSelected ? 'border-red-400 bg-red-100 ring-2 ring-red-300' : 'border-red-200 bg-red-50 hover:border-red-300'
                      }`}
                    onClick={() => setSelectedBookLevel(isSelected ? null : levelKey)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold whitespace-nowrap ${level.level === '하위권'
                          ? 'text-blue-700'
                          : level.level === '중위권'
                            ? 'text-yellow-700'
                            : 'text-red-700'
                          }`}>
                          {level.level}
                        </span>
                        <span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-gray-600">
                          {level.targetGrade}
                        </span>
                        {topicGuides.length > 0 && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                            시험 맞춤
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {isSelected ? '접기' : '상세보기'}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-gray-700 mb-3">
                      {level.description}
                    </p>

                    {/* 단원별 맞춤 전략 표시 */}
                    {topicGuides.length > 0 ? (
                      <>
                        <div className="mb-2 text-[11px] font-semibold text-gray-600">
                          📚 {topicGuides.length}개 취약 단원 맞춤 전략:
                        </div>
                        <div className="space-y-3 mb-3">
                          {topicGuides.slice(0, 2).map((tg, idx) => (
                            <div key={idx} className="bg-white bg-opacity-60 rounded p-2">
                              <div className="text-[11px] font-bold text-gray-800 mb-1">
                                {tg.topic}
                              </div>
                              <div className="text-[11px] font-medium text-emerald-700 mb-1">
                                {tg.guide.title}
                              </div>
                              <div className="space-y-0.5">
                                {tg.guide.strategies.slice(0, 2).map((strategy, i) => (
                                  <div key={i} className="flex items-start gap-1.5 text-[10px] text-gray-600">
                                    <span className="text-emerald-500 mt-0.5">▸</span>
                                    <span>{strategy}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          {topicGuides.length > 2 && (
                            <div className="text-[10px] text-gray-500 text-center">
                              외 {topicGuides.length - 2}개 단원 전략 (아래 상세 참조)
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1.5 mb-3">
                        {combinedStrategies.map((strategy, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                            <span className="text-emerald-500 mt-0.5">▸</span>
                            <span>{strategy}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-[10px] text-gray-500 mb-1">
                        <span className="font-medium">학습량:</span> {studyAmount}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        <span className="font-medium">추천 교재:</span> {books}
                      </p>
                    </div>

                    {/* 격려 멘트 */}
                    <div className={`mt-2 p-2 rounded text-[10px] italic ${level.level === '하위권' ? 'bg-blue-100 text-blue-700' :
                      level.level === '중위권' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                      "{topicGuides.length > 0 ? topicGuides[0].guide.encouragement : encouragement}"
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 선택된 수준의 추천 문제집 상세 */}
            {selectedBookLevel && (
              <div className={`rounded-lg border-2 p-4 ${selectedBookLevel === '하위권' ? 'border-blue-300 bg-blue-50' :
                selectedBookLevel === '중위권' ? 'border-yellow-300 bg-yellow-50' :
                  'border-red-300 bg-red-50'
                }`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-sm font-semibold ${selectedBookLevel === '하위권' ? 'text-blue-800' :
                    selectedBookLevel === '중위권' ? 'text-yellow-800' :
                      'text-red-800'
                    }`}>
                    {selectedBookLevel} 추천 문제집
                  </h4>
                  <button
                    onClick={() => setShowBookDetails(!showBookDetails)}
                    className={`text-xs px-2 py-1 rounded ${selectedBookLevel === '하위권' ? 'bg-blue-200 text-blue-700 hover:bg-blue-300' :
                      selectedBookLevel === '중위권' ? 'bg-yellow-200 text-yellow-700 hover:bg-yellow-300' :
                        'bg-red-200 text-red-700 hover:bg-red-300'
                      }`}
                  >
                    {showBookDetails ? '간략히' : '전체 보기'}
                  </button>
                </div>

                {/* 교재 선택 가이드 */}
                <div className="bg-white bg-opacity-70 rounded p-3 mb-3">
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold">구성: </span>
                    {BOOK_SELECTION_GUIDE[selectedBookLevel].structure}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    <span className="font-semibold">원칙: </span>
                    {BOOK_SELECTION_GUIDE[selectedBookLevel].principle}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    <span className="font-semibold">추천 예시: </span>
                    {BOOK_SELECTION_GUIDE[selectedBookLevel].example}
                  </p>
                </div>

                {/* 스마트 추천 문제집 (3권) */}
                {(() => {
                  // 자동 분석 결과가 있고 같은 레벨이면 취약점 기반 추천 사용
                  const usePersonalized = autoLevelRecommendation && autoLevelRecommendation.level === selectedBookLevel;
                  const smartBooks = usePersonalized
                    ? getPersonalizedBookRecommendations(selectedBookLevel, autoLevelRecommendation.recommendedBookTypes, 3)
                    : getSmartBookRecommendations(selectedBookLevel, 3);

                  if (smartBooks.length === 0) return null;
                  return (
                    <div className="mb-3">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">
                        맞춤 추천 문제집
                        <span className="ml-1 text-[10px] font-normal text-gray-500">
                          {usePersonalized ? '(취약점 맞춤)' : '(개념 → 유형 순)'}
                        </span>
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {smartBooks.map((book, i) => (
                          <div key={i} className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-shadow">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-gray-800">{book.name}</span>
                              <span className="text-yellow-500 text-[10px]">
                                {'★'.repeat(book.difficulty)}{'☆'.repeat(5 - book.difficulty)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] text-gray-500">{book.publisher}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${book.type.includes('개념') ? 'bg-blue-100 text-blue-700' :
                                book.type.includes('유형') ? 'bg-green-100 text-green-700' :
                                  'bg-purple-100 text-purple-700'
                                }`}>
                                {book.type}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-600">{book.features}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 상세 문제집 목록 */}
                {showBookDetails && (() => {
                  const levelBooks = getBooksByLevel(selectedBookLevel);
                  if (!levelBooks) return null;
                  return (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-gray-700">전체 문제집 목록 ({levelBooks.books.length}권)</h5>
                      <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-[10px]">
                          <thead className="bg-white bg-opacity-80 sticky top-0">
                            <tr>
                              <th className="text-left p-1.5 font-medium text-gray-600">교재명</th>
                              <th className="text-left p-1.5 font-medium text-gray-600">출판사</th>
                              <th className="text-center p-1.5 font-medium text-gray-600">난이도</th>
                              <th className="text-left p-1.5 font-medium text-gray-600">특징</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {levelBooks.books.slice(0, 15).map((book, i) => (
                              <tr key={i} className="bg-white bg-opacity-50 hover:bg-opacity-80">
                                <td className="p-1.5 font-medium text-gray-800">{book.name}</td>
                                <td className="p-1.5 text-gray-600">{book.publisher}</td>
                                <td className="p-1.5 text-center">
                                  <span className="text-yellow-500">{'★'.repeat(book.difficulty)}{'☆'.repeat(5 - book.difficulty)}</span>
                                </td>
                                <td className="p-1.5 text-gray-600">{book.features}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* 주의사항 */}
                <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                  <h5 className="text-[10px] font-semibold text-amber-800 mb-1">교재 선택 주의사항</h5>
                  <ul className="space-y-0.5">
                    {BOOK_CAUTIONS.map((caution, i) => (
                      <li key={i} className="text-[10px] text-amber-700 flex items-start gap-1">
                        <span>⚠</span>
                        <span>{caution}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4주 전 학습 타임라인 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className="w-full px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-violet-50 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-gray-900">4주 전 학습 타임라인</h3>
              <p className="text-xs text-gray-600">시험 4주 전부터 체계적인 준비 계획</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${showTimeline ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showTimeline && (
          <div className="p-4">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-indigo-200" />

              <div className="space-y-4">
                {FOUR_WEEK_TIMELINE.map((week, index) => (
                  <div key={week.week} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${index === 0
                      ? 'bg-indigo-400'
                      : index === 1
                        ? 'bg-indigo-500'
                        : index === 2
                          ? 'bg-indigo-600'
                          : 'bg-indigo-700'
                      }`}>
                      {4 - index}
                    </div>

                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-indigo-700">{week.week}</span>
                        <span className="text-xs text-gray-600">- {week.title}</span>
                      </div>
                      <ul className="space-y-1">
                        {week.tasks.map((task, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                            <span className="text-indigo-400">•</span>
                            <span>{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
