/**
 * Exam list item component - 분석 요약 포함
 * Implements: rerender-memo (memoized component)
 */
import { memo } from 'react';
import type { Exam } from '../../services/exam';

interface ExamListItemProps {
  exam: Exam;
  onViewResult: (examId: string) => void;
  onRequestAnalysis: (examId: string) => void;
  onDelete: (examId: string) => void;
}

const STATUS_MAP: Record<string, string> = {
  pending: '대기중',
  analyzing: '분석중',
  completed: '완료',
  failed: '실패',
};

export const ExamListItem = memo(function ExamListItem({
  exam,
  onViewResult,
  onRequestAnalysis,
  onDelete,
}: ExamListItemProps) {
  const formattedDate = new Date(exam.created_at).toLocaleDateString();
  const brief = exam.analysis_brief;

  // 신뢰도 레벨 계산
  const getConfidenceStyle = (conf: number | null | undefined) => {
    if (conf == null) return { bg: 'bg-gray-100', text: 'text-gray-600' };
    if (conf >= 0.9) return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
    if (conf >= 0.7) return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
    return { bg: 'bg-red-100', text: 'text-red-700' };
  };

  const confStyle = getConfidenceStyle(brief?.avg_confidence);

  return (
    <li className="p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* 제목 행 */}
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-indigo-600 truncate">
              {exam.title}
            </p>
            {/* 시험지 유형 배지 */}
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                exam.exam_type === 'student'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {exam.exam_type === 'student' ? '답안지' : '시험지'}
            </span>
            {brief && brief.avg_confidence != null && (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${confStyle.bg} ${confStyle.text}`}
                title="AI 분석 신뢰도"
              >
                {Math.round(brief.avg_confidence * 100)}%
              </span>
            )}
          </div>

          {/* 메타 정보 */}
          <p className="flex items-center flex-wrap text-sm text-gray-500 mt-1 gap-x-1">
            <span className="truncate">{exam.subject}</span>
            <span>•</span>
            <span>{STATUS_MAP[exam.status] || exam.status}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </p>

          {/* 분석 요약 (completed 상태이고 brief가 있을 때만) */}
          {exam.status === 'completed' && brief && (
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
              <span className="font-medium">
                {brief.total_questions}문항 · {brief.total_points}점
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                하{brief.difficulty_low}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                중{brief.difficulty_medium}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                상{brief.difficulty_high}
              </span>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex-shrink-0 flex space-x-4">
          {exam.status === 'completed' ? (
            <button
              onClick={() => onViewResult(exam.id)}
              className="text-indigo-600 hover:text-indigo-900 font-medium"
            >
              결과 보기
            </button>
          ) : exam.status === 'analyzing' ? (
            <span className="text-gray-400">분석 중...</span>
          ) : (
            <button
              onClick={() => onRequestAnalysis(exam.id)}
              className="text-green-600 hover:text-green-900 font-medium"
            >
              분석 요청
            </button>
          )}

          <button
            onClick={() => onDelete(exam.id)}
            className="text-red-600 hover:text-red-900 font-medium"
          >
            삭제
          </button>
        </div>
      </div>
    </li>
  );
});
