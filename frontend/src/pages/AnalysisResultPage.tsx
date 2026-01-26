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
 *
 * Note: 베타 기간 중 상세 분석 템플릿만 사용
 * 추후 SummaryTemplate, ParentTemplate, PrintTemplate 활성화 예정
 */
import { useState, useCallback, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  useAnalysisResult,
  useExtendedAnalysis,
  useGenerateExtendedAnalysis,
  useRequestAnswerAnalysis,
} from '../hooks/useAnalysis';
import { DetailedTemplate } from '../components/analysis/templates';
import { CacheHitBanner } from '../components/analysis/CacheHitBanner';
import { getConfidenceLevel, CONFIDENCE_COLORS, DIFFICULTY_COLORS } from '../styles/tokens';
import examService, { type ExamType, type Exam } from '../services/exam';

// Hoisted static elements (rendering-hoist-jsx)
const loadingState = <div className="p-8">로딩 중...</div>;
const notFoundState = <div className="p-8">결과를 찾을 수 없습니다</div>;

export function AnalysisResultPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { result, isLoading, error, mutate: mutateResult } = useAnalysisResult(id);
  const { extension, mutate: mutateExtension } = useExtendedAnalysis(id);
  const { generateExtended, isGenerating } = useGenerateExtendedAnalysis();
  const { requestAnswerAnalysis, isRequesting: isRequestingAnswerAnalysis } = useRequestAnswerAnalysis();

  const [exam, setExam] = useState<Exam | null>(null);
  const [hasAnswerAnalysis, setHasAnswerAnalysis] = useState(false);

  // 캐시 히트 여부 (쿼리 파라미터에서 확인)
  const isCacheHit = searchParams.get('cached') === 'true';

  // 배너 닫기 핸들러
  const handleBannerDismiss = useCallback(() => {
    searchParams.delete('cached');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // exam 정보 조회
  useEffect(() => {
    if (result?.exam_id) {
      examService.getDetail(result.exam_id).then(examData => {
        setExam(examData);
        setHasAnswerAnalysis(examData.has_answer_analysis || false);
      }).catch(() => {
        // 실패 시 기본값 유지
      });
    }
  }, [result?.exam_id]);

  const examType: ExamType = exam?.exam_type || 'blank';

  const handleGenerateExtended = useCallback(async () => {
    if (!id) return;
    const ext = await generateExtended({ analysisId: id });
    if (ext) {
      mutateExtension(ext);
    }
  }, [id, generateExtended, mutateExtension]);

  // 정오답 분석 요청 핸들러
  const handleRequestAnswerAnalysis = useCallback(async () => {
    if (!result?.exam_id) return;
    await requestAnswerAnalysis({ examId: result.exam_id });
    setHasAnswerAnalysis(true);
    // 분석 결과 다시 조회
    mutateResult();
  }, [result?.exam_id, requestAnswerAnalysis, mutateResult]);

  // Early return for loading/error states (js-early-exit)
  if (isLoading) return loadingState;
  if (error || !result) return notFoundState;

  const { questions, total_questions } = result;

  // 총 배점 계산 (부동소수점 오류 방지를 위해 반올림)
  const totalPoints = Math.round(questions.reduce((sum, q) => sum + (q.points || 0), 0) * 10) / 10;

  // 평균 신뢰도 계산
  const questionsWithConfidence = questions.filter((q) => q.confidence != null);
  const avgConfidence =
    questionsWithConfidence.length > 0
      ? questionsWithConfidence.reduce((sum, q) => sum + (q.confidence || 0), 0) /
        questionsWithConfidence.length
      : null;

  // 템플릿 Props
  const templateProps = {
    result,
    extension,
    examType,
    analysisId: id || '',
    onGenerateExtended: handleGenerateExtended,
    isGenerating,
    hasAnswerAnalysis,
    onRequestAnswerAnalysis: handleRequestAnswerAnalysis,
    isRequestingAnswerAnalysis,
  };

  // 난이도 분포 계산
  const difficultyDist = {
    high: questions.filter(q => q.difficulty === 'high').length,
    medium: questions.filter(q => q.difficulty === 'medium').length,
    low: questions.filter(q => q.difficulty === 'low').length,
  };
  const totalDiff = difficultyDist.high + difficultyDist.medium + difficultyDist.low;

  // 종합 난이도 등급 계산 (A+~D-)
  const calculateDifficultyGrade = () => {
    if (totalDiff === 0) return null;
    // 가중 평균: high=3, medium=2, low=1
    const weightedScore = (difficultyDist.high * 3 + difficultyDist.medium * 2 + difficultyDist.low * 1) / totalDiff;

    // 등급 매핑 (점수가 높을수록 어려운 시험)
    if (weightedScore >= 2.83) return { grade: 'A+', label: '최상', color: 'bg-red-600', text: 'text-white' };
    if (weightedScore >= 2.67) return { grade: 'A', label: '상', color: 'bg-red-500', text: 'text-white' };
    if (weightedScore >= 2.50) return { grade: 'A-', label: '상', color: 'bg-red-400', text: 'text-white' };
    if (weightedScore >= 2.33) return { grade: 'B+', label: '중상', color: 'bg-orange-500', text: 'text-white' };
    if (weightedScore >= 2.17) return { grade: 'B', label: '중상', color: 'bg-orange-400', text: 'text-white' };
    if (weightedScore >= 2.00) return { grade: 'B-', label: '중상', color: 'bg-amber-500', text: 'text-white' };
    if (weightedScore >= 1.83) return { grade: 'C+', label: '중', color: 'bg-yellow-500', text: 'text-gray-900' };
    if (weightedScore >= 1.67) return { grade: 'C', label: '중', color: 'bg-yellow-400', text: 'text-gray-900' };
    if (weightedScore >= 1.50) return { grade: 'C-', label: '중하', color: 'bg-lime-500', text: 'text-white' };
    if (weightedScore >= 1.33) return { grade: 'D+', label: '하', color: 'bg-green-500', text: 'text-white' };
    if (weightedScore >= 1.17) return { grade: 'D', label: '하', color: 'bg-green-400', text: 'text-white' };
    return { grade: 'D-', label: '최하', color: 'bg-emerald-400', text: 'text-white' };
  };
  const difficultyGrade = calculateDifficultyGrade();

  // 시험지 표시 제목 (AI 추출 제목 우선)
  const displayTitle = exam?.suggested_title || exam?.title || '시험지';
  // 학년 (AI 추출 학년 우선)
  const displayGrade = exam?.extracted_grade || exam?.grade;
  // 과목
  const displaySubject = exam?.detected_subject || exam?.subject || '수학';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          to="/exams"
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
        >
          &larr; 목록으로 돌아가기
        </Link>

        {/* 캐시 히트 알림 배너 */}
        {isCacheHit && result?.exam_id && (
          <CacheHitBanner
            examId={result.exam_id}
            analyzedAt={result.analyzed_at}
            onReanalyze={handleBannerDismiss}
          />
        )}

        {/* 시험지 정보 카드 */}
        <div className="bg-white rounded-lg shadow p-5 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* 좌측: 제목 및 기본 정보 */}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 truncate" title={displayTitle}>
                {displayTitle}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                {displayGrade && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-medium">
                    {displayGrade}
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-medium">
                  {displaySubject}
                </span>
                <span className="text-gray-500">
                  총 {total_questions}문항 · {totalPoints}점 만점
                </span>
                {avgConfidence != null && (() => {
                  const level = getConfidenceLevel(avgConfidence);
                  const config = CONFIDENCE_COLORS[level];
                  return (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
                      title="AI 분석 신뢰도"
                    >
                      신뢰도 {Math.round(avgConfidence * 100)}%
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* 우측: 종합 난이도 등급 */}
            {difficultyGrade && (
              <div className="flex items-center gap-3">
                <div className="text-xs text-gray-500">난이도</div>
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-lg ${difficultyGrade.color} ${difficultyGrade.text} font-bold text-lg shadow-sm`}
                  title={`난이도 등급: ${difficultyGrade.grade} (${difficultyGrade.label})`}
                >
                  {difficultyGrade.grade}
                </div>
                <div className="text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DIFFICULTY_COLORS.high.bg }} />
                    <span>상 {difficultyDist.high}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DIFFICULTY_COLORS.medium.bg }} />
                    <span>중 {difficultyDist.medium}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DIFFICULTY_COLORS.low.bg }} />
                    <span>하 {difficultyDist.low}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 상세 분석 템플릿 (베타 기간 중 단일 템플릿 사용) */}
      <DetailedTemplate {...templateProps} />
    </div>
  );
}
