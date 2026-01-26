/**
 * Analysis Result Page.
 *
 * Implements Vercel React Best Practices:
 * - client-swr-dedup: SWR for automatic request deduplication (immutable data)
 * - rerender-memo: Memoized QuestionCard, DistributionChart components
 * - rendering-hoist-jsx: Hoisted static elements
 * - rendering-conditional-render: Explicit ternary operators
 * - js-early-exit: Early return for loading/error states
 * - ui-components: TabGroup 재사용 컴포넌트 활용
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useAnalysisResult,
  useExtendedAnalysis,
  useGenerateExtendedAnalysis,
} from '../hooks/useAnalysis';
import { QuestionCard } from '../components/analysis/QuestionCard';
import { ExtendedReport } from '../components/analysis/ExtendedReport';
import { AnswerAnalysis } from '../components/analysis/AnswerAnalysis';
// Direct imports avoid barrel file overhead (bundle-barrel-imports)
import { DifficultyPieChart, TypePieChart, TopicDistributionChart, PointsDistributionChart, FormatDistributionChart } from '../components/analysis/charts/DifficultyPieChart';
import { TopicAnalysisChart } from '../components/analysis/charts/TopicAnalysisChart';
import { ExamScopeView } from '../components/analysis/charts/ExamScopeView';
import { ConfidenceExplanation } from '../components/analysis/ConfidenceBadge';
import { TabGroup, type Tab } from '../components/ui/TabGroup';
import { getConfidenceLevel, CONFIDENCE_COLORS } from '../styles/tokens';
import examService, { type ExamType } from '../services/exam';

// Hoisted static elements (rendering-hoist-jsx)
const loadingState = <div className="p-8">로딩 중...</div>;
const notFoundState = <div className="p-8">결과를 찾을 수 없습니다</div>;

type ViewMode = 'basic' | 'scope' | 'answers' | 'extended';

export function AnalysisResultPage() {
  const { id } = useParams<{ id: string }>();
  const { result, isLoading, error } = useAnalysisResult(id);
  const { extension, mutate: mutateExtension } = useExtendedAnalysis(id);
  const { generateExtended, isGenerating } = useGenerateExtendedAnalysis();

  const [viewMode, setViewMode] = useState<ViewMode>('basic');
  const [examType, setExamType] = useState<ExamType>('blank');

  // exam_type 조회
  useEffect(() => {
    if (result?.exam_id) {
      examService.getDetail(result.exam_id).then(exam => {
        setExamType(exam.exam_type);
      }).catch(() => {
        // 실패 시 기본값 유지
      });
    }
  }, [result?.exam_id]);

  // 학생 답안지 여부
  const isStudentExam = examType === 'student';

  // 탭 구성 (useMemo로 메모이제이션)
  const tabs: Tab[] = useMemo(() => {
    const baseTabs: Tab[] = [
      { id: 'basic', label: '기본 분석' },
      { id: 'scope', label: '출제현황' },
    ];
    if (isStudentExam) {
      baseTabs.push(
        { id: 'answers', label: '정오답 분석' },
        { id: 'extended', label: '확장 분석' }
      );
    }
    return baseTabs;
  }, [isStudentExam]);

  // 탭 변경 핸들러
  const handleTabChange = useCallback((tabId: string) => {
    setViewMode(tabId as ViewMode);
  }, []);

  const handleGenerateExtended = useCallback(async () => {
    if (!id) return;
    const ext = await generateExtended({ analysisId: id });
    if (ext) {
      mutateExtension(ext);
      setViewMode('extended');
    }
  }, [id, generateExtended, mutateExtension]);

  // Early return for loading/error states (js-early-exit)
  if (isLoading) return loadingState;
  if (error || !result) return notFoundState;

  const { summary, questions, total_questions } = result;

  // 총 배점 계산 (부동소수점 오류 방지를 위해 반올림)
  const totalPoints = Math.round(questions.reduce((sum, q) => sum + (q.points || 0), 0) * 10) / 10;

  // 평균 신뢰도 계산
  const questionsWithConfidence = questions.filter((q) => q.confidence != null);
  const avgConfidence =
    questionsWithConfidence.length > 0
      ? questionsWithConfidence.reduce((sum, q) => sum + (q.confidence || 0), 0) /
      questionsWithConfidence.length
      : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          to="/exams"
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
        >
          &larr; 목록으로 돌아가기
        </Link>
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">분석 결과</h2>
            <p className="text-gray-500 mt-2">
              총 {total_questions}문항 · {totalPoints}점 만점
              {avgConfidence != null && (() => {
                const level = getConfidenceLevel(avgConfidence);
                const config = CONFIDENCE_COLORS[level];
                return (
                  <span
                    className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
                    title="AI 분석 신뢰도"
                  >
                    신뢰도 {Math.round(avgConfidence * 100)}%
                  </span>
                );
              })()}
            </p>
          </div>
          {/* View Mode Toggle - TabGroup 컴포넌트 활용 */}
          <TabGroup
            tabs={tabs}
            activeTab={viewMode}
            onTabChange={handleTabChange}
            variant="bordered"
          />
        </div>
      </div>

      {viewMode === 'basic' && (
        <>
          {/* 신뢰도 설명 패널 */}
          {avgConfidence != null && (
            <ConfidenceExplanation avgConfidence={avgConfidence} />
          )}

          {/* 분포 차트 - 1행: 난이도, 유형 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <DifficultyPieChart distribution={summary.difficulty_distribution} />
            <TypePieChart distribution={summary.type_distribution} />
          </div>

          {/* 분포 차트 - 2행: 문항 형식, 단원 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <FormatDistributionChart formats={questions.map((q) => q.question_format)} />
            <TopicDistributionChart topics={questions.map((q) => q.topic || '')} />
          </div>

          {/* 분포 차트 - 3행: 배점 (전체 너비) */}
          <div className="mb-4">
            <PointsDistributionChart questions={questions} />
          </div>

          {/* Question List - 테이블 형식 */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                문항별 상세 분석
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs text-gray-500 whitespace-nowrap">
                  <tr>
                    <th className="px-3 py-2 text-center w-20">번호</th>
                    <th className="px-3 py-2 text-center w-16">난이도</th>
                    <th className="px-3 py-2 text-left w-20">유형</th>
                    <th className="px-3 py-2 text-left">단원</th>
                    <th className="px-3 py-2 text-right w-14">배점</th>
                    <th className="px-3 py-2 text-center w-16">신뢰도</th>
                    <th className="px-3 py-2 text-center w-16">피드백</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {questions.map((q) => (
                    <QuestionCard key={q.id} question={q} analysisId={result.id} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {viewMode === 'scope' && (
        <>
          {/* 시험범위 분석 */}
          <ExamScopeView questions={questions} />

          {/* 단원별/과목별 출제현황 */}
          <div className="mt-8">
            <TopicAnalysisChart questions={questions} />
          </div>
        </>
      )}

      {viewMode === 'answers' && isStudentExam && (
        <AnswerAnalysis questions={questions} analysisId={id} />
      )}

      {viewMode === 'extended' && (
        <ExtendedReport
          extension={extension ?? null}
          onGenerate={handleGenerateExtended}
          isGenerating={isGenerating}
        />
      )}
    </div>
  );
}
