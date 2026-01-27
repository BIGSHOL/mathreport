/**
 * Parent Template - 부모용 리포트 (2025 개선판)
 * 학부모가 진짜 궁금한 것에 답하는 버전
 */
import { useMemo } from 'react';
import type { TemplateProps } from './types';
import { QUESTION_TYPE_COLORS, ERROR_TYPE_COLORS } from '../../../styles/tokens';
import type { ErrorType } from '../../../services/analysis';

// 유형 라벨 변환 헬퍼
const getTypeLabel = (type: string): string => {
  return QUESTION_TYPE_COLORS[type]?.label || type;
};

// 오류 유형 라벨 변환
const getErrorTypeLabel = (errorType: ErrorType): string => {
  return ERROR_TYPE_COLORS[errorType]?.label || errorType;
};

export function ParentTemplate({ result, examType }: TemplateProps) {
  const { summary, questions, total_questions } = result;
  const isStudentExam = examType === 'student';

  // 분석 결과 계산
  const analysis = useMemo(() => {
    const totalPoints = Math.round(
      questions.reduce((sum, q) => sum + (q.points || 0), 0) * 10
    ) / 10;

    // 학생 답안지 통계
    let correctCount = 0;
    let wrongCount = 0;
    let earnedPoints = 0;

    if (isStudentExam) {
      questions.forEach((q) => {
        if (q.is_correct === true) correctCount++;
        else if (q.is_correct === false) wrongCount++;
        earnedPoints += q.earned_points || 0;
      });
      // 부동소수점 오류 방지를 위해 반올림
      earnedPoints = Math.round(earnedPoints * 10) / 10;
    }

    const correctRate = isStudentExam && (correctCount + wrongCount) > 0
      ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
      : 0;

    // 시험 난이도 평가
    const examDifficultyLevel = summary.difficulty_distribution.high > total_questions * 0.15
      ? 'hard'
      : summary.difficulty_distribution.high < total_questions * 0.05 && summary.difficulty_distribution.low > total_questions * 0.5
        ? 'easy'
        : 'normal';

    const examDifficultyText = examDifficultyLevel === 'hard'
      ? '어려운 편'
      : examDifficultyLevel === 'easy'
        ? '쉬운 편'
        : '평범한 수준';

    // 오답 원인 분류 (학생 답안지 전용)
    const errorStats: Record<string, number> = {};
    let mistakeCount = 0; // 실수 (careless_mistake)
    let conceptErrorCount = 0; // 개념 오류
    let potentialPoints = 0; // 실수만 줄여도 얻을 수 있는 점수

    if (isStudentExam) {
      questions.forEach((q) => {
        if (q.is_correct === false && q.error_type) {
          errorStats[q.error_type] = (errorStats[q.error_type] || 0) + 1;

          if (q.error_type === 'careless_mistake' || q.error_type === 'calculation_error') {
            mistakeCount++;
            potentialPoints += q.points || 0;
          } else if (q.error_type === 'concept_error') {
            conceptErrorCount++;
          }
        }
      });
    }

    // 성적 수준 평가
    let level: 'excellent' | 'good' | 'average' | 'needsWork';
    let levelText: string;
    let emoji: string;

    if (correctRate >= 90) {
      level = 'excellent';
      levelText = '매우 우수';
      emoji = '🌟';
    } else if (correctRate >= 70) {
      level = 'good';
      levelText = '우수';
      emoji = '👍';
    } else if (correctRate >= 50) {
      level = 'average';
      levelText = '보통';
      emoji = '📚';
    } else {
      level = 'needsWork';
      levelText = '노력 필요';
      emoji = '💪';
    }

    // 강점 분석
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // 난이도별 분석
    const difficultyStats = {
      high: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      low: { correct: 0, total: 0 },
    };

    questions.forEach((q) => {
      const diff = q.difficulty as 'high' | 'medium' | 'low';
      if (difficultyStats[diff]) {
        difficultyStats[diff].total++;
        if (q.is_correct) difficultyStats[diff].correct++;
      }
    });

    if (difficultyStats.high.total > 0 && difficultyStats.high.correct / difficultyStats.high.total >= 0.7) {
      strengths.push('어려운 문제도 잘 해결합니다');
    }
    if (difficultyStats.low.total > 0 && difficultyStats.low.correct / difficultyStats.low.total < 0.8) {
      weaknesses.push('기본 문제에서 실수가 있습니다');
    }

    // 단원별 취약점
    const topicStats: Record<string, { correct: number; total: number }> = {};
    questions.forEach((q) => {
      if (q.topic) {
        const mainTopic = q.topic.split('>')[0].trim();
        if (!topicStats[mainTopic]) {
          topicStats[mainTopic] = { correct: 0, total: 0 };
        }
        topicStats[mainTopic].total++;
        if (q.is_correct) topicStats[mainTopic].correct++;
      }
    });

    const weakTopics = Object.entries(topicStats)
      .filter(([, stats]) => stats.total >= 2 && stats.correct / stats.total < 0.5)
      .map(([topic]) => topic);

    if (weakTopics.length > 0) {
      weaknesses.push(`${weakTopics.join(', ')} 단원 보충 학습이 필요합니다`);
    }

    // 구체적인 액션 아이템 (To-Do List)
    const actionItems: Array<{ period: string; task: string; emoji: string }> = [];

    if (isStudentExam && wrongCount > 0) {
      // 1. 오늘/내일 할 일
      actionItems.push({
        period: '오늘',
        task: `틀린 문제 ${wrongCount}개 다시 풀어보기 (${Math.ceil(wrongCount * 5)}분 소요 예상)`,
        emoji: '📝',
      });

      // 2. 이번 주 할 일
      if (weakTopics.length > 0) {
        const mainTopic = weakTopics[0];
        actionItems.push({
          period: '이번 주',
          task: `'${mainTopic}' 단원 복습하기 (교과서 기본 개념 + 예제 문제)`,
          emoji: '📚',
        });
      } else if (mistakeCount > 0) {
        actionItems.push({
          period: '이번 주',
          task: '비슷한 유형 문제 10개 더 풀기 (실수 줄이기 연습)',
          emoji: '✍️',
        });
      }

      // 3. 다음 주 할 일
      if (weakTopics.length > 1) {
        actionItems.push({
          period: '다음 주',
          task: `'${weakTopics[1]}' 단원 보충 학습`,
          emoji: '🎯',
        });
      } else if (correctRate >= 70) {
        actionItems.push({
          period: '다음 주',
          task: '고난도 문제 도전하기 (심화 문제집)',
          emoji: '🚀',
        });
      }
    }

    // 학습 도움 필요 여부 판단
    let helpNeeded: 'self' | 'tutor' | 'academy' = 'self';
    let helpMessage = '';

    if (isStudentExam) {
      if (correctRate < 40 || conceptErrorCount >= 3) {
        helpNeeded = 'academy';
        helpMessage = '기초 개념부터 다시 배울 필요가 있습니다. 학원이나 과외를 통해 체계적인 학습을 추천합니다.';
      } else if (correctRate < 60 || (conceptErrorCount >= 2 && weakTopics.length >= 2)) {
        helpNeeded = 'tutor';
        helpMessage = '취약한 단원을 집중적으로 보충할 필요가 있습니다. 단기 특강이나 과외를 고려해보세요.';
      } else {
        helpNeeded = 'self';
        helpMessage = mistakeCount > conceptErrorCount
          ? '실수만 줄이면 충분히 점수를 올릴 수 있습니다. 혼자 복습해도 괜찮습니다.'
          : '꾸준히 복습하면 더 좋아질 수 있습니다. 혼자서도 충분히 가능합니다.';
      }
    }

    // 성적 향상 전망
    const improvementForecast = isStudentExam && wrongCount > 0
      ? Math.min(totalPoints, Math.round(earnedPoints + potentialPoints + (conceptErrorCount > 0 ? conceptErrorCount * 2 : 0)))
      : earnedPoints;

    return {
      totalPoints,
      earnedPoints,
      correctCount,
      wrongCount,
      correctRate,
      level,
      levelText,
      emoji,
      strengths,
      weaknesses,
      examDifficultyLevel,
      examDifficultyText,
      errorStats,
      mistakeCount,
      conceptErrorCount,
      potentialPoints,
      actionItems,
      helpNeeded,
      helpMessage,
      improvementForecast,
    };
  }, [questions, isStudentExam, summary, total_questions]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 🎯 종합 평가 (학부모가 가장 궁금한 것) */}
      {isStudentExam && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2">
                {analysis.emoji} {analysis.earnedPoints} / {analysis.totalPoints}점
              </h2>
              <p className="text-xl opacity-90">
                정답률 {analysis.correctRate}% ({analysis.correctCount}/{total_questions}문항)
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-80 mb-1">이번 시험은</div>
              <div className="text-2xl font-bold">{analysis.examDifficultyText}</div>
            </div>
          </div>

          {/* 핵심 메시지 */}
          <div className="bg-white/20 backdrop-blur rounded-xl p-4 mt-4">
            <p className="text-lg leading-relaxed">
              {analysis.mistakeCount > 0 && analysis.potentialPoints > 0 ? (
                <>
                  <strong>실수만 줄이면 {Math.round(analysis.potentialPoints)}점 더 올릴 수 있습니다!</strong>
                  {' '}틀린 {analysis.wrongCount}문항 중 {analysis.mistakeCount}개는 단순 실수입니다.
                  {analysis.conceptErrorCount > 0 && ` 나머지 ${analysis.conceptErrorCount}개는 개념 보강이 필요합니다.`}
                </>
              ) : analysis.wrongCount > 0 ? (
                <>
                  틀린 {analysis.wrongCount}문항은 개념 복습이 필요합니다.
                  꾸준히 학습하면 다음 시험에서 {analysis.improvementForecast}점까지 가능합니다.
                </>
              ) : (
                <>
                  완벽합니다! 이 수준을 유지하면서 더 어려운 문제에 도전해보세요.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* 빈 시험지 요약 */}
      {!isStudentExam && (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">시험 구성 분석</h2>
          <p className="text-4xl font-bold text-indigo-600 mb-2">
            {total_questions}문항
          </p>
          <p className="text-lg text-gray-600">
            총 {analysis.totalPoints}점 배점 · 난이도 {analysis.examDifficultyText}
          </p>
        </div>
      )}

      {/* 📋 오답 분석 (왜 틀렸나요?) */}
      {isStudentExam && analysis.wrongCount > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            🔍 오답 원인 분석
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
              <div className="text-sm text-orange-600 mb-1">단순 실수</div>
              <div className="text-3xl font-bold text-orange-700">{analysis.mistakeCount}개</div>
              {analysis.potentialPoints > 0 && (
                <div className="text-sm text-orange-600 mt-2">
                  → 실수만 줄이면 +{Math.round(analysis.potentialPoints)}점 가능!
                </div>
              )}
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <div className="text-sm text-red-600 mb-1">개념 부족</div>
              <div className="text-3xl font-bold text-red-700">{analysis.conceptErrorCount}개</div>
              {analysis.conceptErrorCount > 0 && (
                <div className="text-sm text-red-600 mt-2">
                  → 복습이 필요합니다
                </div>
              )}
            </div>
          </div>

          {/* 오답 유형 상세 */}
          {Object.keys(analysis.errorStats).length > 0 && (
            <div className="border-t pt-4">
              <div className="text-sm text-gray-600 mb-2">오답 유형 상세</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(analysis.errorStats).map(([type, count]) => (
                  <span
                    key={type}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                  >
                    {getErrorTypeLabel(type as ErrorType)}: {count}개
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 강점과 약점 */}
      {isStudentExam && (analysis.strengths.length > 0 || analysis.weaknesses.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {analysis.strengths.length > 0 && (
            <div className="bg-green-50 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                💪 강점
              </h3>
              <ul className="space-y-3">
                {analysis.strengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-2 text-green-700">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.weaknesses.length > 0 && (
            <div className="bg-orange-50 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                📌 보완이 필요한 부분
              </h3>
              <ul className="space-y-3">
                {analysis.weaknesses.map((weakness, i) => (
                  <li key={i} className="flex items-start gap-2 text-orange-700">
                    <span className="text-orange-500 mt-0.5">!</span>
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ✅ 액션 아이템 (뭘 공부시켜야 하나요?) */}
      {isStudentExam && analysis.actionItems.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            ✅ 이렇게 해보세요
          </h3>
          <div className="space-y-4">
            {analysis.actionItems.map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0 text-3xl">{item.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-indigo-600 mb-1">{item.period}</div>
                  <div className="text-base text-gray-900">{item.task}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🎓 학습 도움 필요 여부 (학원/과외 보내야 하나요?) */}
      {isStudentExam && (
        <div className={`rounded-2xl shadow-lg p-6 ${
          analysis.helpNeeded === 'academy' ? 'bg-red-50 border-2 border-red-200' :
          analysis.helpNeeded === 'tutor' ? 'bg-yellow-50 border-2 border-yellow-200' :
          'bg-green-50 border-2 border-green-200'
        }`}>
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            🎓 학습 도움
          </h3>
          <div className={`text-lg font-medium mb-2 ${
            analysis.helpNeeded === 'academy' ? 'text-red-700' :
            analysis.helpNeeded === 'tutor' ? 'text-yellow-700' :
            'text-green-700'
          }`}>
            {analysis.helpNeeded === 'academy' && '📍 학원/과외 추천'}
            {analysis.helpNeeded === 'tutor' && '📍 단기 특강 추천'}
            {analysis.helpNeeded === 'self' && '✅ 혼자 복습 가능'}
          </div>
          <p className={`text-base ${
            analysis.helpNeeded === 'academy' ? 'text-red-600' :
            analysis.helpNeeded === 'tutor' ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {analysis.helpMessage}
          </p>
        </div>
      )}

      {/* 📈 성적 향상 전망 */}
      {isStudentExam && analysis.wrongCount > 0 && analysis.improvementForecast > analysis.earnedPoints && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
            📈 성적 향상 가능성
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-80 mb-1">현재</div>
              <div className="text-3xl font-bold">{analysis.earnedPoints}점</div>
            </div>
            <div className="text-4xl opacity-50">→</div>
            <div>
              <div className="text-sm opacity-80 mb-1">목표</div>
              <div className="text-3xl font-bold">{analysis.improvementForecast}점</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl px-6 py-3">
              <div className="text-sm opacity-80 mb-1">향상 폭</div>
              <div className="text-3xl font-bold">+{analysis.improvementForecast - analysis.earnedPoints}점</div>
            </div>
          </div>
          <p className="mt-4 text-base opacity-90">
            위 학습 계획을 따라하면 다음 시험에서 이 점수를 목표할 수 있습니다!
          </p>
        </div>
      )}

      {/* 응원 메시지 */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 text-white text-center">
        <p className="text-xl font-medium">
          {analysis.level === 'excellent' && '정말 잘했어요! 계속 이렇게 열심히 해주세요! 🎉'}
          {analysis.level === 'good' && '잘하고 있어요! 조금만 더 노력하면 최고가 될 수 있어요! ⭐'}
          {analysis.level === 'average' && '괜찮아요! 꾸준히 하다 보면 분명 나아질 거예요! 📈'}
          {analysis.level === 'needsWork' && '포기하지 마세요! 기초부터 차근차근 하면 됩니다! 💪'}
        </p>
      </div>

      {/* 시험지 기본 정보 (시험지 분석일 경우) */}
      {!isStudentExam && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">시험 구성</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">주요 유형</span>
              <span className="font-medium text-gray-900">{getTypeLabel(summary.dominant_type)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">평균 난이도</span>
              <span className="font-medium text-gray-900">
                {summary.average_difficulty === 'high' ? '어려움' :
                 summary.average_difficulty === 'medium' ? '보통' : '쉬움'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600">고난도 문항 비율</span>
              <span className="font-medium text-gray-900">
                {Math.round((summary.difficulty_distribution.high / total_questions) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
