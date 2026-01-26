/**
 * Parent Template - 부모용 리포트
 * 쉬운 언어로 개선 방향 중심 표시
 */
import { useMemo } from 'react';
import type { TemplateProps } from './types';
import { QUESTION_TYPE_COLORS } from '../../../styles/tokens';

// 유형 라벨 변환 헬퍼
const getTypeLabel = (type: string): string => {
  return QUESTION_TYPE_COLORS[type]?.label || type;
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
    }

    const correctRate = isStudentExam && (correctCount + wrongCount) > 0
      ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
      : 0;

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

    // 추천 학습 방법
    const recommendations: string[] = [];

    if (correctRate < 50) {
      recommendations.push('기본 개념 복습부터 시작해 주세요');
      recommendations.push('교과서 예제 문제를 다시 풀어보세요');
    } else if (correctRate < 70) {
      recommendations.push('틀린 문제 유형을 중심으로 연습하세요');
      recommendations.push('비슷한 유형의 문제를 추가로 풀어보세요');
    } else {
      recommendations.push('고난도 문제에 도전해 보세요');
      recommendations.push('실전 모의고사로 시간 관리 연습을 하세요');
    }

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
      recommendations,
    };
  }, [questions, isStudentExam]);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* 전체 결과 요약 */}
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">{analysis.emoji}</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isStudentExam ? '학습 결과' : '시험 분석'}
        </h2>
        {isStudentExam ? (
          <>
            <p className="text-4xl font-bold text-indigo-600 mb-2">
              {analysis.earnedPoints} / {analysis.totalPoints}점
            </p>
            <p className="text-lg text-gray-600">
              {total_questions}문항 중 {analysis.correctCount}문항 정답
            </p>
            <div className={`inline-block mt-4 px-6 py-2 rounded-full text-lg font-medium ${
              analysis.level === 'excellent' ? 'bg-green-100 text-green-800' :
              analysis.level === 'good' ? 'bg-blue-100 text-blue-800' :
              analysis.level === 'average' ? 'bg-yellow-100 text-yellow-800' :
              'bg-orange-100 text-orange-800'
            }`}>
              {analysis.levelText}
            </div>
          </>
        ) : (
          <>
            <p className="text-4xl font-bold text-indigo-600 mb-2">
              {total_questions}문항
            </p>
            <p className="text-lg text-gray-600">
              총 {analysis.totalPoints}점 배점
            </p>
          </>
        )}
      </div>

      {/* 한눈에 보기 */}
      {isStudentExam && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            📊 한눈에 보기
          </h3>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="p-4 bg-green-50 rounded-xl">
              <div className="text-3xl font-bold text-green-600">{analysis.correctCount}</div>
              <div className="text-green-700 mt-1">맞은 문제</div>
            </div>
            <div className="p-4 bg-red-50 rounded-xl">
              <div className="text-3xl font-bold text-red-600">{analysis.wrongCount}</div>
              <div className="text-red-700 mt-1">틀린 문제</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="text-3xl font-bold text-blue-600">{analysis.correctRate}%</div>
              <div className="text-blue-700 mt-1">정답률</div>
            </div>
          </div>
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

      {/* 학습 추천 */}
      <div className="bg-indigo-50 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-indigo-800 mb-4 flex items-center gap-2">
          📚 이렇게 공부해 보세요
        </h3>
        <ul className="space-y-3">
          {analysis.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-3 text-indigo-700">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center text-sm font-medium">
                {i + 1}
              </span>
              {rec}
            </li>
          ))}
        </ul>
      </div>

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
