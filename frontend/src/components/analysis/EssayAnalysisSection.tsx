/**
 * Essay Analysis Section
 * 서술형 문항 집중 분석 섹션
 */
import { useMemo, memo } from 'react';
import type { QuestionAnalysis } from '../../services/analysis';
import { DIFFICULTY_COLORS } from '../../styles/tokens';

interface EssayAnalysisSectionProps {
  questions: QuestionAnalysis[];
}

export const EssayAnalysisSection = memo(function EssayAnalysisSection({
  questions,
}: EssayAnalysisSectionProps) {
  // 서술형 문항 필터링
  const essayQuestions = useMemo(
    () => questions.filter((q) => q.question_format === 'essay'),
    [questions]
  );

  // 서술형 문항이 없으면 렌더링하지 않음
  if (essayQuestions.length === 0) {
    return null;
  }

  // 총 문항 수 및 배점
  const totalQuestions = questions.length;
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
  const essayPoints = essayQuestions.reduce((sum, q) => sum + (q.points || 0), 0);

  // 서술형 비율
  const essayPercentage = (essayQuestions.length / totalQuestions) * 100;
  const essayPointsPercentage = totalPoints > 0 ? (essayPoints / totalPoints) * 100 : 0;

  // 난이도 분포 계산
  const difficultyDist = useMemo(() => {
    const dist = {
      concept: 0,
      pattern: 0,
      reasoning: 0,
      creative: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    essayQuestions.forEach((q) => {
      const difficulty = q.difficulty as keyof typeof dist;
      if (difficulty in dist) {
        dist[difficulty]++;
      }
    });

    return dist;
  }, [essayQuestions]);

  // 4단계 시스템인지 3단계 시스템인지 감지
  const is4Level =
    difficultyDist.concept > 0 ||
    difficultyDist.pattern > 0 ||
    difficultyDist.reasoning > 0 ||
    difficultyDist.creative > 0;

  // 평균 난이도 계산 (가중치 기반)
  const avgDifficulty = useMemo(() => {
    if (essayQuestions.length === 0) return null;

    if (is4Level) {
      // 4단계: concept=0.5, pattern=2, reasoning=5, creative=8
      const weighted =
        (difficultyDist.concept * 0.5 +
          difficultyDist.pattern * 2 +
          difficultyDist.reasoning * 5 +
          difficultyDist.creative * 8) /
        essayQuestions.length;

      if (weighted <= 1.5) return { label: '개념', color: DIFFICULTY_COLORS.concept };
      if (weighted <= 3.5) return { label: '유형', color: DIFFICULTY_COLORS.pattern };
      if (weighted <= 6.5) return { label: '심화', color: DIFFICULTY_COLORS.reasoning };
      return { label: '최상위', color: DIFFICULTY_COLORS.creative };
    } else {
      // 3단계: low=0.5, medium=2, high=5
      const weighted =
        (difficultyDist.low * 0.5 + difficultyDist.medium * 2 + difficultyDist.high * 5) /
        essayQuestions.length;

      if (weighted <= 1.5) return { label: '하', color: DIFFICULTY_COLORS.low };
      if (weighted <= 3.5) return { label: '중', color: DIFFICULTY_COLORS.medium };
      return { label: '상', color: DIFFICULTY_COLORS.high };
    }
  }, [essayQuestions.length, is4Level, difficultyDist]);

  // 단원별 분포
  const topicDist = useMemo(() => {
    const topics: Record<string, number> = {};
    essayQuestions.forEach((q) => {
      if (q.topic) {
        const mainTopic = q.topic.split(' > ').pop() || q.topic;
        topics[mainTopic] = (topics[mainTopic] || 0) + 1;
      }
    });
    return Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // 상위 5개만
  }, [essayQuestions]);

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-6 mb-4 border-2 border-amber-200">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-amber-500 rounded-full" />
        <h3 className="text-lg font-bold text-gray-900">서술형 문항 집중 분석</h3>
        <span className="ml-auto px-3 py-1 bg-amber-500 text-white text-sm font-bold rounded-full">
          배점 가중치 {essayPointsPercentage.toFixed(0)}%
        </span>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* 문항 수 */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-100">
          <div className="text-xs text-gray-500 mb-1">문항 수</div>
          <div className="text-2xl font-bold text-gray-900">
            {essayQuestions.length}
            <span className="text-sm font-normal text-gray-500 ml-1">문항</span>
          </div>
          <div className="text-xs text-amber-600 mt-1">
            전체의 {essayPercentage.toFixed(1)}%
          </div>
        </div>

        {/* 총 배점 */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-100">
          <div className="text-xs text-gray-500 mb-1">총 배점</div>
          <div className="text-2xl font-bold text-gray-900">
            {essayPoints}
            <span className="text-sm font-normal text-gray-500 ml-1">점</span>
          </div>
          <div className="text-xs text-amber-600 mt-1">
            전체의 {essayPointsPercentage.toFixed(1)}%
          </div>
        </div>

        {/* 평균 난이도 */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-100">
          <div className="text-xs text-gray-500 mb-1">평균 난이도</div>
          <div className="text-2xl font-bold" style={{ color: avgDifficulty?.color.bg }}>
            {avgDifficulty?.label || '-'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {is4Level ? '4단계 기준' : '3단계 기준'}
          </div>
        </div>

        {/* 문항당 평균 배점 */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-100">
          <div className="text-xs text-gray-500 mb-1">문항당 배점</div>
          <div className="text-2xl font-bold text-gray-900">
            {(essayPoints / essayQuestions.length).toFixed(1)}
            <span className="text-sm font-normal text-gray-500 ml-1">점</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">평균</div>
        </div>
      </div>

      {/* 난이도 분포 및 단원별 분포 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 난이도 분포 */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-100">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">난이도 분포</h4>
          <div className="space-y-2">
            {is4Level ? (
              <>
                {difficultyDist.concept > 0 && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: DIFFICULTY_COLORS.concept.bg }}
                    />
                    <span className="text-sm text-gray-700 flex-shrink-0 w-14">개념</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(difficultyDist.concept / essayQuestions.length) * 100}%`,
                          backgroundColor: DIFFICULTY_COLORS.concept.bg,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 flex-shrink-0 w-8 text-right">
                      {difficultyDist.concept}
                    </span>
                  </div>
                )}
                {difficultyDist.pattern > 0 && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: DIFFICULTY_COLORS.pattern.bg }}
                    />
                    <span className="text-sm text-gray-700 flex-shrink-0 w-14">유형</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(difficultyDist.pattern / essayQuestions.length) * 100}%`,
                          backgroundColor: DIFFICULTY_COLORS.pattern.bg,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 flex-shrink-0 w-8 text-right">
                      {difficultyDist.pattern}
                    </span>
                  </div>
                )}
                {difficultyDist.reasoning > 0 && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: DIFFICULTY_COLORS.reasoning.bg }}
                    />
                    <span className="text-sm text-gray-700 flex-shrink-0 w-14">심화</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(difficultyDist.reasoning / essayQuestions.length) * 100}%`,
                          backgroundColor: DIFFICULTY_COLORS.reasoning.bg,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 flex-shrink-0 w-8 text-right">
                      {difficultyDist.reasoning}
                    </span>
                  </div>
                )}
                {difficultyDist.creative > 0 && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: DIFFICULTY_COLORS.creative.bg }}
                    />
                    <span className="text-sm text-gray-700 flex-shrink-0 w-14">최상위</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(difficultyDist.creative / essayQuestions.length) * 100}%`,
                          backgroundColor: DIFFICULTY_COLORS.creative.bg,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 flex-shrink-0 w-8 text-right">
                      {difficultyDist.creative}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                {difficultyDist.low > 0 && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: DIFFICULTY_COLORS.low.bg }}
                    />
                    <span className="text-sm text-gray-700 flex-shrink-0 w-14">하</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(difficultyDist.low / essayQuestions.length) * 100}%`,
                          backgroundColor: DIFFICULTY_COLORS.low.bg,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 flex-shrink-0 w-8 text-right">
                      {difficultyDist.low}
                    </span>
                  </div>
                )}
                {difficultyDist.medium > 0 && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: DIFFICULTY_COLORS.medium.bg }}
                    />
                    <span className="text-sm text-gray-700 flex-shrink-0 w-14">중</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(difficultyDist.medium / essayQuestions.length) * 100}%`,
                          backgroundColor: DIFFICULTY_COLORS.medium.bg,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 flex-shrink-0 w-8 text-right">
                      {difficultyDist.medium}
                    </span>
                  </div>
                )}
                {difficultyDist.high > 0 && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: DIFFICULTY_COLORS.high.bg }}
                    />
                    <span className="text-sm text-gray-700 flex-shrink-0 w-14">상</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(difficultyDist.high / essayQuestions.length) * 100}%`,
                          backgroundColor: DIFFICULTY_COLORS.high.bg,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 flex-shrink-0 w-8 text-right">
                      {difficultyDist.high}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 단원별 출제 현황 */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-100">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">단원별 출제 현황</h4>
          {topicDist.length > 0 ? (
            <div className="space-y-2">
              {topicDist.map(([topic, count], idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-amber-600 flex-shrink-0 w-4">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-gray-700 flex-1 truncate" title={topic}>
                    {topic}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                    {count}문항
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 text-center py-4">
              단원 정보 없음
            </div>
          )}
        </div>
      </div>

      {/* 인사이트 메시지 */}
      <div className="mt-4 p-3 bg-amber-100 rounded-lg border border-amber-200">
        <p className="text-sm text-amber-900">
          💡 <strong>서술형 문항</strong>은 배점이 높고 변별력이 큰 문항입니다.
          {essayPointsPercentage >= 40 && (
            <> 이 시험에서는 전체 배점의 <strong>{essayPointsPercentage.toFixed(0)}%</strong>를 차지하므로
            서술형 대비가 매우 중요합니다.</>
          )}
          {essayPointsPercentage < 40 && essayPointsPercentage >= 25 && (
            <> 전체 배점의 <strong>{essayPointsPercentage.toFixed(0)}%</strong>로
            적절한 비중을 차지하고 있습니다.</>
          )}
          {essayPointsPercentage < 25 && (
            <> 이 시험에서는 전체 배점의 <strong>{essayPointsPercentage.toFixed(0)}%</strong>로
            상대적으로 낮은 비중입니다.</>
          )}
        </p>
      </div>
    </div>
  );
});
