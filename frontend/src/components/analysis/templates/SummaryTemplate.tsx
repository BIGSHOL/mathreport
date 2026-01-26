/**
 * Summary Template - 요약 카드
 * 핵심 지표만 카드 형태로 표시
 */
import { useMemo } from 'react';
import type { TemplateProps } from './types';
import { DIFFICULTY_COLORS, QUESTION_TYPE_COLORS } from '../../../styles/tokens';

export function SummaryTemplate({ result, examType }: TemplateProps) {
  const { summary, questions, total_questions } = result;
  const isStudentExam = examType === 'student';

  // 통계 계산
  const stats = useMemo(() => {
    const totalPoints = Math.round(
      questions.reduce((sum, q) => sum + (q.points || 0), 0) * 10
    ) / 10;

    // 학생 답안지인 경우 정답률 계산
    let correctRate = 0;
    let earnedPoints = 0;
    if (isStudentExam) {
      const answeredQuestions = questions.filter((q) => q.is_correct != null);
      const correctCount = answeredQuestions.filter((q) => q.is_correct).length;
      correctRate = answeredQuestions.length > 0
        ? Math.round((correctCount / answeredQuestions.length) * 100)
        : 0;
      earnedPoints = Math.round(questions.reduce((sum, q) => sum + (q.earned_points || 0), 0) * 10) / 10;
    }

    // 취약 단원 추출
    const topicErrors: Record<string, number> = {};
    questions.forEach((q) => {
      if (q.is_correct === false && q.topic) {
        const mainTopic = q.topic.split('>')[0].trim();
        topicErrors[mainTopic] = (topicErrors[mainTopic] || 0) + 1;
      }
    });
    const weakTopics = Object.entries(topicErrors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic, count]) => ({ topic, count }));

    return { totalPoints, correctRate, earnedPoints, weakTopics };
  }, [questions, isStudentExam]);

  return (
    <div className="space-y-6">
      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="총 문항"
          value={total_questions}
          unit="문항"
          color="bg-blue-500"
        />
        <StatCard
          title="총 배점"
          value={stats.totalPoints}
          unit="점"
          color="bg-indigo-500"
        />
        {isStudentExam && (
          <>
            <StatCard
              title="정답률"
              value={stats.correctRate}
              unit="%"
              color={stats.correctRate >= 70 ? 'bg-green-500' : 'bg-orange-500'}
            />
            <StatCard
              title="획득 점수"
              value={stats.earnedPoints}
              unit="점"
              color="bg-purple-500"
            />
          </>
        )}
      </div>

      {/* 난이도 분포 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">난이도 분포</h3>
        <div className="flex gap-4">
          {Object.entries(summary.difficulty_distribution).map(([level, count]) => {
            const config = DIFFICULTY_COLORS[level as keyof typeof DIFFICULTY_COLORS];
            const percentage = Math.round((count / total_questions) * 100);
            return (
              <div key={level} className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${config?.text || 'text-gray-700'}`}>
                    {config?.label || level}
                  </span>
                  <span className="text-sm text-gray-500">{count}문항</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${config?.bg || 'bg-gray-400'} transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 유형 분포 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">문제 유형</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(summary.type_distribution)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => {
              const config = QUESTION_TYPE_COLORS[type as keyof typeof QUESTION_TYPE_COLORS];
              return (
                <div
                  key={type}
                  className="px-4 py-2 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: config?.color ? `${config.color}20` : '#f3f4f6',
                    color: config?.color || '#374151',
                  }}
                >
                  {config?.label || type} ({count})
                </div>
              );
            })}
        </div>
      </div>

      {/* 취약 단원 (학생 답안지인 경우) */}
      {isStudentExam && stats.weakTopics.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            취약 단원
          </h3>
          <div className="space-y-3">
            {stats.weakTopics.map(({ topic, count }) => (
              <div
                key={topic}
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
              >
                <span className="text-red-800 font-medium">{topic}</span>
                <span className="text-red-600 text-sm">{count}문항 오답</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 개선 방향 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow p-6 text-white">
        <h3 className="text-lg font-semibold mb-3">개선 방향</h3>
        <ul className="space-y-2 text-indigo-100">
          {summary.difficulty_distribution.high > total_questions * 0.3 && (
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>고난도 문항 비율이 높습니다. 기본 개념부터 탄탄히 다져주세요.</span>
            </li>
          )}
          {isStudentExam && stats.correctRate < 70 && (
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>정답률이 70% 미만입니다. 오답 문항을 중심으로 복습하세요.</span>
            </li>
          )}
          {stats.weakTopics.length > 0 && (
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>
                취약 단원({stats.weakTopics.map((t) => t.topic).join(', ')})을 집중 학습하세요.
              </span>
            </li>
          )}
          {!isStudentExam && summary.dominant_type && (
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>
                {QUESTION_TYPE_COLORS[summary.dominant_type as keyof typeof QUESTION_TYPE_COLORS]?.label || summary.dominant_type} 유형이 많이 출제되었습니다.
              </span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

// 통계 카드 컴포넌트
function StatCard({
  title,
  value,
  unit,
  color,
}: {
  title: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${color} to-opacity-80`}>
          {value}
        </span>
        <span className="text-gray-400 text-sm">{unit}</span>
      </div>
    </div>
  );
}
