/**
 * Answer Analysis Component - 정오답 분석 (학생 답안지 전용)
 */
import { memo } from 'react';
import type { QuestionAnalysis } from '../../services/analysis';

interface AnswerAnalysisProps {
  questions: QuestionAnalysis[];
}

const ERROR_TYPE_LABELS: Record<string, string> = {
  calculation_error: '계산 실수',
  concept_error: '개념 오해',
  careless_mistake: '단순 실수',
  process_error: '풀이 오류',
  incomplete: '미완성',
};

const ERROR_TYPE_COLORS: Record<string, string> = {
  calculation_error: 'bg-orange-100 text-orange-800',
  concept_error: 'bg-red-100 text-red-800',
  careless_mistake: 'bg-yellow-100 text-yellow-800',
  process_error: 'bg-purple-100 text-purple-800',
  incomplete: 'bg-gray-100 text-gray-800',
};

export const AnswerAnalysis = memo(function AnswerAnalysis({
  questions,
}: AnswerAnalysisProps) {
  // 정오답 데이터가 있는 문항만 필터링
  const questionsWithAnswers = questions.filter(q => q.is_correct !== undefined && q.is_correct !== null);

  if (questionsWithAnswers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        <p>정오답 분석 데이터가 없습니다.</p>
        <p className="text-sm mt-2">학생이 푼 시험지에서만 정오답 분석이 제공됩니다.</p>
      </div>
    );
  }

  const correctQuestions = questionsWithAnswers.filter(q => q.is_correct === true);
  const wrongQuestions = questionsWithAnswers.filter(q => q.is_correct === false);

  const totalPoints = questionsWithAnswers.reduce((sum, q) => sum + (q.points || 0), 0);
  const earnedPoints = questionsWithAnswers.reduce((sum, q) => sum + (q.earned_points || 0), 0);
  const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  // 오류 유형별 집계
  const errorTypeCount: Record<string, number> = {};
  wrongQuestions.forEach(q => {
    if (q.error_type) {
      errorTypeCount[q.error_type] = (errorTypeCount[q.error_type] || 0) + 1;
    }
  });

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3">정오답 요약</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{correctQuestions.length}</div>
            <div className="text-xs text-gray-600">정답</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{wrongQuestions.length}</div>
            <div className="text-xs text-gray-600">오답</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{earnedPoints}/{totalPoints}</div>
            <div className="text-xs text-gray-600">점수</div>
          </div>
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">{scorePercent}%</div>
            <div className="text-xs text-gray-600">정답률</div>
          </div>
        </div>
      </div>

      {/* 오류 유형 분석 */}
      {Object.keys(errorTypeCount).length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">오류 유형 분석</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(errorTypeCount)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <span
                  key={type}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    ERROR_TYPE_COLORS[type] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {ERROR_TYPE_LABELS[type] || type}: {count}문항
                </span>
              ))}
          </div>
        </div>
      )}

      {/* 오답 문항 상세 */}
      {wrongQuestions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            오답 문항 상세 ({wrongQuestions.length}문항)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-center w-16">번호</th>
                  <th className="px-3 py-2 text-left">단원</th>
                  <th className="px-3 py-2 text-center w-16">난이도</th>
                  <th className="px-3 py-2 text-center w-20">배점</th>
                  <th className="px-3 py-2 text-center w-24">오류 유형</th>
                  <th className="px-3 py-2 text-left">AI 코멘트</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {wrongQuestions.map(q => (
                  <tr key={q.id} className="hover:bg-red-50/50">
                    <td className="px-3 py-2 text-center font-medium text-red-600">
                      {q.question_number}
                    </td>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-xs">
                      {q.topic || '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        q.difficulty === 'high' ? 'bg-red-100 text-red-700' :
                        q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {q.difficulty === 'high' ? '상' : q.difficulty === 'medium' ? '중' : '하'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">
                      {q.earned_points ?? 0}/{q.points ?? 0}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {q.error_type && (
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          ERROR_TYPE_COLORS[q.error_type] || 'bg-gray-100 text-gray-700'
                        }`}>
                          {ERROR_TYPE_LABELS[q.error_type] || q.error_type}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs">
                      {q.ai_comment || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 정답 문항 목록 (접힘 가능) */}
      {correctQuestions.length > 0 && (
        <details className="bg-white rounded-lg shadow">
          <summary className="px-4 py-3 cursor-pointer text-base font-semibold text-gray-900 hover:bg-gray-50">
            정답 문항 ({correctQuestions.length}문항)
          </summary>
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {correctQuestions.map(q => (
                <span
                  key={q.id}
                  className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm"
                >
                  {q.question_number}번 ({q.points}점)
                </span>
              ))}
            </div>
          </div>
        </details>
      )}
    </div>
  );
});
