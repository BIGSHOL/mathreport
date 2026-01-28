/**
 * Study Strategy Tab - 출제 현황 및 학습 대책 (규칙 기반 자동 생성)
 *
 * 분석 결과를 바탕으로 영역별 출제 현황과 학습 전략을 자동 생성합니다.
 * - 출제 영역별 상세 분석 (테이블)
 * - 영역별 학습 전략 (접이식 섹션) - 2022 개정 교육과정 기반
 * - 서술형 대비 전략
 */
import { memo, useMemo, useState } from 'react';
import {
  findGradeConnections,
  findKillerPatterns,
  recommendLevelByPerformance,
  ENCOURAGEMENT_MESSAGES,
  type GradeConnection,
  type KillerQuestionType,
  type LevelRecommendation,
} from '../../data/curriculumStrategies';
import { findMultipleTopicStrategies } from '../../data/topicLevelStrategies';

// 분리된 상수 및 타입
import type { StudyStrategyTabProps, TopicSummary, ChapterGroup } from './study-strategy/types';
import { DIFFICULTY_WEIGHT } from './study-strategy/constants';
import { CommonMistakesSection } from './study-strategy/CommonMistakesSection';
import { TopicAnalysisSection } from './study-strategy/TopicAnalysisSection';
import { getMajorUnitFromCurriculum } from '../../data/curriculum/utils';
import { EssayPreparationSection } from './study-strategy/EssayPreparationSection';
import { TimeAllocationSection } from './study-strategy/TimeAllocationSection';
import { LearningStrategiesSection } from './study-strategy/LearningStrategiesSection';
import { KillerPatternsSection } from './study-strategy/KillerPatternsSection';
import { LevelStrategiesSection } from './study-strategy/LevelStrategiesSection';
import { TimelineSection } from './study-strategy/TimelineSection';

// 섹션 ID 타입
type SectionId = 'topicAnalysis' | 'learningStrategies' | 'essay' | 'timeAllocation' | 'mistakes' | 'connections' | 'killer' | 'levelStrategies' | 'timeline';

export const StudyStrategyTab = memo(function StudyStrategyTab({
  questions,
  exportOptions,
}: StudyStrategyTabProps) {
  // exportOptions가 있으면 해당 설정 사용, 없으면 모두 표시
  const shouldShow = (sectionId: SectionId): boolean => {
    if (!exportOptions) return true;
    switch (sectionId) {
      case 'topicAnalysis': return exportOptions.showTopicAnalysis;
      case 'learningStrategies': return exportOptions.showLearningStrategies;
      case 'essay': return exportOptions.showEssay;
      case 'timeAllocation': return exportOptions.showTimeAllocation;
      case 'mistakes': return exportOptions.showMistakes;
      case 'connections': return exportOptions.showConnections;
      case 'killer': return exportOptions.showKiller;
      case 'levelStrategies': return exportOptions.showLevelStrategies;
      case 'timeline': return exportOptions.showTimeline;
      default: return true;
    }
  };
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set()); // 대단원 펼치기 state
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());
  const [expandedConnectionImportance, setExpandedConnectionImportance] = useState<Map<string, Set<string>>>(new Map());

  // 섹션 접기/펼치기 상태 (기본: 모두 펼침)
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(
    new Set(['topicAnalysis', 'learningStrategies', 'essay', 'timeAllocation', 'mistakes', 'connections', 'killer', 'levelStrategies', 'timeline'])
  );

  // 섹션 토글 함수
  const toggleSection = (sectionId: SectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // 모든 섹션 접기/펼치기
  const toggleAllSections = (expand: boolean) => {
    if (expand) {
      setExpandedSections(new Set(['topicAnalysis', 'learningStrategies', 'essay', 'timeAllocation', 'mistakes', 'connections', 'killer', 'levelStrategies', 'timeline']));
    } else {
      setExpandedSections(new Set());
    }
  };

  // 토픽별 분석 데이터 계산
  const { topicSummaries, chapterGroups, totalPoints, essayQuestions, is4Level } = useMemo(() => {
    const topicMap = new Map<string, TopicSummary>();
    const totalPts = questions.reduce((sum, q) => sum + (q.points || 0), 0);

    // 4단계 시스템 감지
    const is4Level = questions.some(q =>
      ['concept', 'pattern', 'reasoning', 'creative'].includes(q.difficulty)
    );

    // 복합 토픽 정규화 함수: "A, B" → "A", "A와 B" → "A"
    const normalizeShortTopic = (rawTopic: string): string => {
      let normalized = rawTopic;
      // 콤마로 구분된 경우 첫 번째만
      if (normalized.includes(',')) {
        normalized = normalized.split(',')[0].trim();
      }
      // "A와 B", "A과 B", "A 및 B" 패턴
      for (const sep of ['와 ', '과 ', ' 및 ']) {
        if (normalized.includes(sep)) {
          normalized = normalized.split(sep)[0].trim();
          break;
        }
      }
      return normalized;
    };

    questions.forEach((q) => {
      const rawTopic = q.topic || '기타';
      // 토픽 정규화: 소단원에서 복합 토픽 처리
      const parts = rawTopic.split(' > ');
      const lastPart = parts.pop() || rawTopic;
      const normalizedLast = normalizeShortTopic(lastPart);
      const topic = parts.length > 0 ? [...parts, normalizedLast].join(' > ') : normalizedLast;
      const shortTopic = normalizedLast;

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
          essayNumbers: [],
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
      // 서술형 여부 확인 (question_format 또는 question_number 문자열로 판단)
      const isEssay = q.question_format === 'essay' || q.question_format === 'short_answer' ||
        (typeof q.question_number === 'string' && /서술|서답|주관/.test(q.question_number));

      // 문항 번호 수집 (숫자 또는 "서술형 1" 형식 모두 지원)
      let qNum: number = NaN;
      if (q.question_number != null) {
        if (typeof q.question_number === 'number') {
          qNum = q.question_number;
        } else {
          // "서술형 1", "주관식2", "21" 등에서 숫자 추출
          const numMatch = q.question_number.match(/(\d+)/);
          qNum = numMatch ? parseInt(numMatch[1], 10) : NaN;
        }
      }

      if (!isNaN(qNum)) {
        if (isEssay) {
          // 서술형은 essayNumbers에만 추가 (questionNumbers와 분리)
          summary.essayCount++;
          summary.essayNumbers.push(qNum);
        } else {
          // 객관식/단답형은 questionNumbers에 추가
          summary.questionNumbers.push(qNum);
        }
      } else if (isEssay) {
        // 번호 파싱 실패한 서술형도 카운트
        summary.essayCount++;
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
          essayNumbers: [],
          avgDifficulty: 0,
          features: [],
        });
      }

      const chapter = chapterMap.get(chapterName)!;
      chapter.topics.push(summary);
      chapter.questionCount += summary.questionCount;
      chapter.totalPoints += summary.totalPoints;
      chapter.essayCount += summary.essayCount;
      chapter.essayNumbers.push(...summary.essayNumbers);
    });

    // 대단원별 통계 계산
    const chapterCount = chapterMap.size;
    chapterMap.forEach((chapter) => {
      chapter.percentage = totalPts > 0 ? (chapter.totalPoints / totalPts) * 100 : 0;
      const allDiffs = chapter.topics.flatMap(t => t.difficulties);
      if (allDiffs.length > 0) {
        const weights = allDiffs.map(d => DIFFICULTY_WEIGHT[d] || 2);
        chapter.avgDifficulty = weights.reduce((a, b) => a + b, 0) / weights.length;
      }
      if (chapter.essayCount > 0) chapter.features.push(`서술형 ${chapter.essayCount}문항`);
      if (chapter.avgDifficulty >= 3) chapter.features.push('고난도 집중');
      // 대단원이 2개 이상일 때만 '핵심 대단원' 표시 (1개면 의미 없음)
      if (chapterCount >= 2 && chapter.percentage >= 15) chapter.features.push('핵심 대단원');
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

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        분석할 문항이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 모든 섹션 접기/펼치기 버튼 (exportOptions가 없을 때만 표시) */}
      {!exportOptions && (
        <div className="flex justify-end mb-2">
          <button
            onClick={() => toggleAllSections(expandedSections.size === 0)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5 rounded hover:bg-indigo-50 transition-colors"
          >
            {expandedSections.size === 0 ? '모든 섹션 펼치기' : '모든 섹션 접기'}
          </button>
        </div>
      )}

      {/* 출제 영역별 상세 분석 - 대단원 그룹핑 아코디언 */}
      {shouldShow('topicAnalysis') && (
        <TopicAnalysisSection
          chapterGroups={chapterGroups}
          topicSummaries={topicSummaries}
          totalPoints={totalPoints}
          is4Level={is4Level}
          expandedChapters={expandedChapters}
          toggleChapter={toggleChapter}
          isSectionExpanded={expandedSections.has('topicAnalysis')}
          onToggleSection={exportOptions ? undefined : () => toggleSection('topicAnalysis')}
        />
      )}

      {/* 영역별 학습 전략 (접이식) */}
      {shouldShow('learningStrategies') && (
        <LearningStrategiesSection
          topicSummaries={topicSummaries}
          is4Level={is4Level}
          expandedTopics={expandedTopics}
          toggleTopic={toggleTopic}
          isSectionExpanded={expandedSections.has('learningStrategies')}
          onToggleSection={exportOptions ? undefined : () => toggleSection('learningStrategies')}
        />
      )}

      {/* 서술형 대비 전략 */}
      {shouldShow('essay') && (
        <EssayPreparationSection
          essayQuestions={essayQuestions}
          isSectionExpanded={expandedSections.has('essay')}
          onToggleSection={exportOptions ? undefined : () => toggleSection('essay')}
        />
      )}

      {/* 시험 시간 배분 전략 */}
      {shouldShow('timeAllocation') && (
        <TimeAllocationSection
          topicSummaries={topicSummaries}
          isSectionExpanded={expandedSections.has('timeAllocation')}
          onToggleSection={exportOptions ? undefined : () => toggleSection('timeAllocation')}
        />
      )}

      {/* 자주 하는 실수 유형 */}
      {shouldShow('mistakes') && (
        <CommonMistakesSection
          topicSummaries={topicSummaries}
          isSectionExpanded={expandedSections.has('mistakes')}
          onToggleSection={exportOptions ? undefined : () => toggleSection('mistakes')}
        />
      )}

      {/* 학년별 연계 경고 - 대단원별 그루핑 (중복 제거) */}
      {shouldShow('connections') && gradeConnections.size > 0 && (() => {
        // 대단원별로 그루핑 - 중복 연계 정보 제거
        const groupedByMajor = new Map<string, GradeConnection[]>();
        Array.from(gradeConnections.entries()).forEach(([topic, connections]) => {
          const majorUnit = getMajorUnitFromCurriculum(topic);
          if (!groupedByMajor.has(majorUnit)) {
            groupedByMajor.set(majorUnit, []);
          }
          // 대단원 내에서 warning 기준으로 중복 제거
          const existing = groupedByMajor.get(majorUnit)!;
          connections.forEach((conn) => {
            if (!existing.some(e => e.warning === conn.warning)) {
              existing.push(conn);
            }
          });
        });

        // 필수 연계 개수가 많은 순으로 정렬
        const sortedGroups = Array.from(groupedByMajor.entries()).sort((a, b) => {
          const aCritical = a[1].filter(c => c.importance === 'critical').length;
          const bCritical = b[1].filter(c => c.importance === 'critical').length;
          return bCritical - aCritical;
        });

        const totalCritical = Array.from(groupedByMajor.values()).flat().filter(c => c.importance === 'critical').length;

        const isSectionExpanded = expandedSections.has('connections');

        return (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* 헤더 - 클릭 시 섹션 접기/펼치기 */}
            <button
              onClick={exportOptions ? undefined : () => toggleSection('connections')}
              className="w-full px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50 hover:from-orange-100 hover:to-yellow-100 transition-colors"
              disabled={!!exportOptions}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div className="text-left">
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
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isSectionExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>

            {isSectionExpanded && (
            <div className="divide-y divide-gray-100">
              {sortedGroups.map(([majorUnit, connections]) => {
                const isExpanded = expandedConnections.has(majorUnit);
                const criticalCount = connections.filter(c => c.importance === 'critical').length;
                const totalCount = connections.length;

                return (
                  <div key={`major-${majorUnit}`}>
                    <button
                      onClick={() => toggleConnection(majorUnit)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-orange-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${criticalCount > 0 ? 'bg-red-500' : 'bg-orange-400'}`} />
                        <span className="font-medium text-gray-900">{majorUnit}</span>
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
                        {connections.slice(0, 5).map((conn, i) => (
                          <div key={i} className={`p-3 rounded-lg text-sm ${
                            conn.importance === 'critical' ? 'bg-red-50 border-l-4 border-red-400' :
                            conn.importance === 'high' ? 'bg-orange-50 border-l-4 border-orange-400' :
                            'bg-yellow-50 border-l-4 border-yellow-400'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                                conn.importance === 'critical' ? 'bg-red-500' :
                                conn.importance === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                              }`}>
                                {conn.importance === 'critical' ? '필수' : conn.importance === 'high' ? '중요' : '권장'}
                              </span>
                              <span className="text-xs text-gray-600">{conn.fromGrade} → {conn.toGrade}</span>
                              {conn.fromTopic && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{conn.fromTopic}</span>
                              )}
                            </div>
                            <p className="text-gray-700">{conn.warning}</p>
                          </div>
                        ))}
                        {connections.length > 5 && (
                          <button
                            onClick={() => toggleConnectionImportance(majorUnit, 'showAll')}
                            className="w-full text-center text-xs text-orange-600 hover:text-orange-800 py-2"
                          >
                            +{connections.length - 5}개 더 보기
                          </button>
                        )}
                        {expandedConnectionImportance.get(majorUnit)?.has('showAll') && connections.slice(5).map((conn, i) => (
                          <div key={`extra-${i}`} className={`p-3 rounded-lg text-sm ${
                            conn.importance === 'critical' ? 'bg-red-50 border-l-4 border-red-400' :
                            conn.importance === 'high' ? 'bg-orange-50 border-l-4 border-orange-400' :
                            'bg-yellow-50 border-l-4 border-yellow-400'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                                conn.importance === 'critical' ? 'bg-red-500' :
                                conn.importance === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                              }`}>
                                {conn.importance === 'critical' ? '필수' : conn.importance === 'high' ? '중요' : '권장'}
                              </span>
                              <span className="text-xs text-gray-600">{conn.fromGrade} → {conn.toGrade}</span>
                              {conn.fromTopic && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{conn.fromTopic}</span>
                              )}
                            </div>
                            <p className="text-gray-700">{conn.warning}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        );
      })()}

      {/* 킬러 문항 유형 경고 */}
      {shouldShow('killer') && (
        <KillerPatternsSection
          killerPatterns={killerPatterns}
          isSectionExpanded={expandedSections.has('killer')}
          onToggleSection={exportOptions ? undefined : () => toggleSection('killer')}
        />
      )}

      {/* 수준별 학습 전략 */}
      {shouldShow('levelStrategies') && (
        <LevelStrategiesSection
          topicLevelStrategies={topicLevelStrategies}
          levelEncouragements={levelEncouragements}
          autoLevelRecommendation={autoLevelRecommendation}
          isSectionExpanded={expandedSections.has('levelStrategies')}
          onToggleSection={exportOptions ? undefined : () => toggleSection('levelStrategies')}
        />
      )}

      {/* 4주 전 학습 타임라인 */}
      {shouldShow('timeline') && (
        <TimelineSection
          isSectionExpanded={expandedSections.has('timeline')}
          onToggleSection={exportOptions ? undefined : () => toggleSection('timeline')}
        />
      )}
    </div>
  );
});
