/**
 * Discrimination Analysis - 변별력 분석
 *
 * 문항의 변별력을 평가하고 시험의 질을 분석합니다.
 * 실제 학생 데이터가 없으므로 이론적 변별력 지수를 계산합니다.
 */
import { memo, useMemo } from 'react';
import type { QuestionAnalysis } from '../../services/analysis';

interface DiscriminationAnalysisProps {
  questions: QuestionAnalysis[];
}

// 문항별 변별력 지수 계산
interface QuestionDiscrimination {
  questionNumber: number | string;
  difficulty: string;
  points: number;
  discriminationIndex: number; // 0~1, 높을수록 좋음
  label: '우수' | '양호' | '보통' | '개선필요';
  color: string;
  reason: string;
}

/**
 * 이론적 변별력 지수 계산
 *
 * 원리:
 * - 중난이도 문항(유형, 심화)이 가장 변별력이 높음
 * - 너무 쉽거나(개념) 너무 어려운(최상위) 문항은 변별력이 낮음
 * - 배점이 클수록 변별력 기여도가 높음
 * - 전체 시험 내에서의 상대적 난이도 위치도 고려
 */
function calculateDiscriminationIndex(
  difficulty: string,
  points: number,
  avgPoints: number
): { index: number; reason: string } {
  // 난이도별 기본 변별력 점수 (0~1)
  const difficultyScore: Record<string, number> = {
    concept: 0.3,    // 쉬움 - 대부분 맞춤 (변별력 낮음)
    pattern: 0.8,    // 기본 - 중난이도, 변별력 최고
    reasoning: 0.7,  // 심화 - 중상 난이도, 변별력 높음
    creative: 0.4,   // 최고 - 너무 어려움 (변별력 낮음)
    low: 0.3,        // 3단계: 하
    medium: 0.8,     // 3단계: 중
    high: 0.5,       // 3단계: 상
  };

  const baseScore = difficultyScore[difficulty] || 0.5;

  // 배점 가중치 (평균 배점 대비)
  // 배점이 높을수록 변별력 기여도가 큼
  const pointsRatio = Math.min(points / avgPoints, 2); // 최대 2배까지
  const pointsWeight = 0.8 + (pointsRatio - 1) * 0.3; // 0.5 ~ 1.1

  // 최종 변별력 지수
  const finalIndex = Math.min(baseScore * pointsWeight, 1);

  // 이유 생성
  let reason = '';
  if (difficulty === 'concept' || difficulty === 'low') {
    reason = '난이도가 낮아 대부분 정답 예상';
  } else if (difficulty === 'creative' || (difficulty === 'high' && baseScore < 0.6)) {
    reason = '난이도가 높아 정답률이 낮을 것으로 예상';
  } else if (points < avgPoints * 0.7) {
    reason = '배점이 낮아 변별 기여도가 제한적';
  } else if (points > avgPoints * 1.3) {
    reason = '적절한 난이도와 높은 배점으로 변별력 우수';
  } else {
    reason = '적절한 난이도로 학생 실력 구분에 효과적';
  }

  return { index: finalIndex, reason };
}

export const DiscriminationAnalysis = memo(function DiscriminationAnalysis({
  questions,
}: DiscriminationAnalysisProps) {
  // 변별력 분석 데이터 계산
  const discriminationData = useMemo(() => {
    const questionsWithPoints = questions.filter((q) => q.points && q.points > 0);
    if (questionsWithPoints.length === 0) return null;

    const avgPoints =
      questionsWithPoints.reduce((sum, q) => sum + (q.points || 0), 0) /
      questionsWithPoints.length;

    const analyzed: QuestionDiscrimination[] = questionsWithPoints.map((q) => {
      const { index, reason } = calculateDiscriminationIndex(
        q.difficulty,
        q.points || 0,
        avgPoints
      );

      let label: '우수' | '양호' | '보통' | '개선필요';
      let color: string;

      if (index >= 0.75) {
        label = '우수';
        color = '#22c55e'; // green
      } else if (index >= 0.60) {
        label = '양호';
        color = '#3b82f6'; // blue
      } else if (index >= 0.45) {
        label = '보통';
        color = '#f59e0b'; // amber
      } else {
        label = '개선필요';
        color = '#ef4444'; // red
      }

      return {
        questionNumber: q.question_number,
        difficulty: q.difficulty,
        points: q.points || 0,
        discriminationIndex: index,
        label,
        color,
        reason,
      };
    });

    // 변별력 분포 계산
    const distribution = {
      excellent: analyzed.filter((a) => a.label === '우수').length,
      good: analyzed.filter((a) => a.label === '양호').length,
      average: analyzed.filter((a) => a.label === '보통').length,
      needsImprovement: analyzed.filter((a) => a.label === '개선필요').length,
    };

    // 평균 변별력 지수
    const avgDiscrimination =
      analyzed.reduce((sum, a) => sum + a.discriminationIndex, 0) / analyzed.length;

    // 종합 평가
    let overallRating: '매우 우수' | '우수' | '양호' | '보통' | '개선 필요';
    let overallColor: string;
    let overallComment: string;

    if (avgDiscrimination >= 0.70) {
      overallRating = '매우 우수';
      overallColor = '#22c55e';
      overallComment =
        '문항들이 학생 실력을 효과적으로 구분할 수 있는 적절한 난이도와 배점을 가지고 있습니다.';
    } else if (avgDiscrimination >= 0.60) {
      overallRating = '우수';
      overallColor = '#3b82f6';
      overallComment =
        '대부분의 문항이 적절한 변별력을 가지고 있어 학생 평가에 효과적입니다.';
    } else if (avgDiscrimination >= 0.50) {
      overallRating = '양호';
      overallColor = '#f59e0b';
      overallComment =
        '전반적으로 양호하나, 일부 문항은 변별력이 다소 낮습니다.';
    } else if (avgDiscrimination >= 0.40) {
      overallRating = '보통';
      overallColor = '#f97316';
      overallComment =
        '변별력이 낮은 문항이 다소 있습니다. 너무 쉽거나 어려운 문항의 비중이 높습니다.';
    } else {
      overallRating = '개선 필요';
      overallColor = '#ef4444';
      overallComment =
        '변별력이 부족합니다. 중난이도 문항의 비중이 낮고 극단적 난이도 문항이 많습니다.';
    }

    return {
      questions: analyzed,
      distribution,
      avgDiscrimination,
      overallRating,
      overallColor,
      overallComment,
    };
  }, [questions]);

  if (!discriminationData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">변별력 분석</h3>
        <p className="text-sm text-gray-500">배점 정보가 없어 변별력을 계산할 수 없습니다.</p>
      </div>
    );
  }

  const { questions: analyzed, distribution, avgDiscrimination, overallRating, overallColor, overallComment } = discriminationData;

  // 상위 5개 우수 문항
  const topQuestions = [...analyzed]
    .sort((a, b) => b.discriminationIndex - a.discriminationIndex)
    .slice(0, 5);

  // 하위 5개 개선 필요 문항
  const bottomQuestions = [...analyzed]
    .sort((a, b) => a.discriminationIndex - b.discriminationIndex)
    .slice(0, 5);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">변별력 분석</h3>
        <p className="text-sm text-gray-600">
          문항이 학생들의 실력을 얼마나 효과적으로 구분하는지 평가합니다
        </p>
      </div>

      {/* 종합 평가 */}
      <div className="mb-6 p-4 rounded-lg border-2" style={{ borderColor: overallColor, backgroundColor: `${overallColor}10` }}>
        <div className="flex items-center gap-3 mb-2">
          <div
            className="px-3 py-1 rounded-lg text-white font-bold text-sm"
            style={{ backgroundColor: overallColor }}
          >
            {overallRating}
          </div>
          <div className="text-lg font-semibold flex items-center gap-1.5" style={{ color: overallColor }}>
            평균 변별력 지수: {(avgDiscrimination * 100).toFixed(0)}점
            {/* 툴팁 아이콘 (인쇄 시 숨김) */}
            <div className="relative group print:hidden">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-300 text-gray-600 text-[10px] font-bold cursor-help hover:bg-gray-400 transition-colors">
                ?
              </span>
              {/* 툴팁 내용 */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="font-semibold mb-1">변별력이란?</div>
                <div className="text-gray-300 leading-relaxed">
                  중난이도 문항(유형, 심화)이 가장 변별력이 높으며, 배점이 높을수록 영향이 큽니다.
                </div>
                {/* 말풍선 화살표 */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-700">{overallComment}</p>
      </div>

      {/* 변별력 분포 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-xs text-green-700 mb-1">우수</div>
          <div className="text-2xl font-bold text-green-600">{distribution.excellent}</div>
          <div className="text-xs text-green-600 mt-1">
            {analyzed.length > 0 ? ((distribution.excellent / analyzed.length) * 100).toFixed(0) : 0}%
          </div>
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-xs text-blue-700 mb-1">양호</div>
          <div className="text-2xl font-bold text-blue-600">{distribution.good}</div>
          <div className="text-xs text-blue-600 mt-1">
            {analyzed.length > 0 ? ((distribution.good / analyzed.length) * 100).toFixed(0) : 0}%
          </div>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="text-xs text-amber-700 mb-1">보통</div>
          <div className="text-2xl font-bold text-amber-600">{distribution.average}</div>
          <div className="text-xs text-amber-600 mt-1">
            {analyzed.length > 0 ? ((distribution.average / analyzed.length) * 100).toFixed(0) : 0}%
          </div>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-xs text-red-700 mb-1">개선필요</div>
          <div className="text-2xl font-bold text-red-600">{distribution.needsImprovement}</div>
          <div className="text-xs text-red-600 mt-1">
            {analyzed.length > 0 ? ((distribution.needsImprovement / analyzed.length) * 100).toFixed(0) : 0}%
          </div>
        </div>
      </div>

      {/* 우수 문항 & 개선 필요 문항 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 변별력 우수 문항 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-green-500 rounded"></span>
            변별력 우수 문항 (상위 5개)
          </h4>
          <div className="space-y-2">
            {topQuestions.map((q) => (
              <div
                key={q.questionNumber}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-900">{q.questionNumber}번</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{q.points}점</span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: q.color }}
                    >
                      {q.label}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600">{q.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 개선 필요 문항 */}
        {distribution.needsImprovement > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-red-500 rounded"></span>
              개선 권장 문항 (하위 5개)
            </h4>
            <div className="space-y-2">
              {bottomQuestions.map((q) => (
                <div
                  key={q.questionNumber}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900">{q.questionNumber}번</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">{q.points}점</span>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold text-white"
                        style={{ backgroundColor: q.color }}
                      >
                        {q.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{q.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
});
