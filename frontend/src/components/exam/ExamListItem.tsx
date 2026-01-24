/**
 * Exam list item component.
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

export const ExamListItem = memo(function ExamListItem({
  exam,
  onViewResult,
  onRequestAnalysis,
  onDelete,
}: ExamListItemProps) {
  const formattedDate = new Date(exam.created_at).toLocaleDateString();

  return (
    <li className="p-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-indigo-600 truncate">
            {exam.title}
          </p>
          <p className="flex items-center text-sm text-gray-500 mt-1">
            <span className="truncate">{exam.subject}</span>
            <span className="mx-2">•</span>
            <span className="capitalize">{exam.status}</span>
            <span className="mx-2">•</span>
            <span>{formattedDate}</span>
          </p>
        </div>
        <div className="ml-4 flex-shrink-0 flex space-x-4">
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
