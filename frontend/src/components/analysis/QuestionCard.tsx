/**
 * Question analysis card component.
 * Implements: rerender-memo (memoized component)
 */
import { memo } from 'react';
import type { QuestionAnalysis } from '../../services/analysis';

interface QuestionCardProps {
  question: QuestionAnalysis;
}

export const QuestionCard = memo(function QuestionCard({
  question: q,
}: QuestionCardProps) {
  return (
    <li className="p-4">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center font-bold text-gray-700">
          {q.question_number}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
              {q.difficulty}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
              {q.question_type}
            </span>
            {/* Explicit conditional rendering (rendering-conditional-render) */}
            {q.points != null ? (
              <span className="text-sm text-gray-500">{q.points}점</span>
            ) : null}
          </div>
          {q.topic ? (
            <p className="text-sm text-gray-900 font-medium">{q.topic}</p>
          ) : null}
          {q.ai_comment ? (
            <p className="text-sm text-gray-500 mt-1">{q.ai_comment}</p>
          ) : null}
        </div>
      </div>
    </li>
  );
});
