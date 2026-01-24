/**
 * Analysis Result Page.
 *
 * Implements Vercel React Best Practices:
 * - client-swr-dedup: SWR for automatic request deduplication (immutable data)
 * - rerender-memo: Memoized QuestionCard, DistributionChart components
 * - rendering-hoist-jsx: Hoisted static elements
 * - rendering-conditional-render: Explicit ternary operators
 * - js-early-exit: Early return for loading/error states
 */
import { useParams, Link } from 'react-router-dom';
import { useAnalysisResult } from '../hooks/useAnalysis';
import { DistributionChart } from '../components/analysis/DistributionChart';
import { QuestionCard } from '../components/analysis/QuestionCard';

// Hoisted static elements (rendering-hoist-jsx)
const loadingState = <div className="p-8">로딩 중...</div>;
const notFoundState = <div className="p-8">결과를 찾을 수 없습니다</div>;

export function AnalysisResultPage() {
  const { id } = useParams<{ id: string }>();
  const { result, isLoading, error } = useAnalysisResult(id);

  // Early return for loading/error states (js-early-exit)
  if (isLoading) return loadingState;
  if (error || !result) return notFoundState;

  const { summary, questions, total_questions } = result;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          to="/exams"
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
        >
          &larr; 목록으로 돌아가기
        </Link>
        <h2 className="text-3xl font-bold text-gray-900">분석 결과</h2>
        <p className="text-gray-500 mt-2">총 {total_questions}문항 분석 완료</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <DistributionChart
          title="난이도 분포"
          distribution={summary.difficulty_distribution}
          total={total_questions}
          color="indigo"
          showZero
        />
        <DistributionChart
          title="유형 분포"
          distribution={summary.type_distribution}
          total={total_questions}
          color="green"
        />
      </div>

      {/* Question List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            문항별 상세 분석
          </h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </ul>
      </div>
    </div>
  );
}
