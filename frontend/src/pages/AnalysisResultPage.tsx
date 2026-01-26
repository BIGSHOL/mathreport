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
  useExportAnalysis,
} from '../hooks/useAnalysis';
import { DetailedTemplate } from '../components/analysis/templates';
import { CacheHitBanner } from '../components/analysis/CacheHitBanner';
import { ExportModal } from '../components/analysis/ExportModal';
import { ToastContainer, useToast } from '../components/Toast';
import { getConfidenceLevel, CONFIDENCE_COLORS, DIFFICULTY_COLORS, calculateDifficultyGrade } from '../styles/tokens';
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
  const { exportAnalysis, isExporting } = useExportAnalysis();

  const [exam, setExam] = useState<Exam | null>(null);
  const [hasAnswerAnalysis, setHasAnswerAnalysis] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // 토스트 알림
  const toast = useToast();

  // 캐시 히트 여부 (쿼리 파라미터에서 확인)
  const isCacheHit = searchParams.get('cached') === 'true';

  // 크레딧 소비 알림 (쿼리 파라미터에서 확인)
  useEffect(() => {
    const creditsConsumed = searchParams.get('credits_consumed');
    const creditsRemaining = searchParams.get('credits_remaining');

    if (creditsConsumed && parseInt(creditsConsumed) > 0) {
      toast.info(
        `${creditsConsumed}크레딧이 차감되었습니다. (남은 크레딧: ${creditsRemaining ?? 0})`,
        5000
      );
      // 쿼리 파라미터 제거 (한 번만 표시)
      searchParams.delete('credits_consumed');
      searchParams.delete('credits_remaining');
      setSearchParams(searchParams, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // 내보내기 핸들러
  const handleExport = useCallback(async (format: 'html' | 'image', sections: string[]) => {
    if (!id || !result) return;

    try {
      const response = await exportAnalysis({
        analysisId: id,
        sections,
        format,
        examTitle: exam?.suggested_title || exam?.title,
        examGrade: exam?.extracted_grade || exam?.grade,
        examSubject: exam?.detected_subject || exam?.subject,
      });

      if (response?.success && response.html) {
        // HTML 다운로드
        const blob = new Blob([response.html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.filename || 'report.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setShowExportModal(false);
      }
    } catch (error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 402) {
        alert('크레딧이 부족합니다. 크레딧을 구매해주세요.');
      } else {
        alert('내보내기에 실패했습니다.');
      }
    }
  }, [id, result, exam, exportAnalysis]);

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

  // 서술형 개수 계산
  const essayCount = questions.filter(q => q.question_format === 'essay').length;

  // 종합 난이도 등급 계산 (A+~D-, 서술형 가중치 포함)
  const difficultyGrade = calculateDifficultyGrade(
    difficultyDist.high,
    difficultyDist.medium,
    difficultyDist.low,
    essayCount,
    questions.length
  );

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

        {/* 만점 100점 아님 경고 배너 */}
        {totalPoints !== 100 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-800">
                  만점이 100점이 아닙니다
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  이 시험지의 만점은 <span className="font-semibold">{totalPoints}점</span>입니다.
                  AI가 배점을 잘못 인식했을 수 있으니 각 문항의 배점을 확인해주세요.
                </p>
              </div>
            </div>
          </div>
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
                <span className="text-gray-500 flex items-center gap-1.5">
                  <span>총 {total_questions}문항 · {totalPoints}점 만점</span>
                  {totalPoints !== 100 && (
                    <span title={`만점이 100점이 아닙니다 (${totalPoints}점). 배점을 확인해주세요.`}>
                      <svg
                        className="w-4 h-4 text-amber-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
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

            {/* 우측: 내보내기 버튼 + 종합 난이도 등급 */}
            <div className="flex items-center gap-4">
              {/* 내보내기 버튼 */}
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                내보내기
              </button>

              {/* 종합 난이도 등급 */}
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
      </div>

      {/* 상세 분석 템플릿 (베타 기간 중 단일 템플릿 사용) */}
      <DetailedTemplate {...templateProps} />

      {/* 내보내기 모달 */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        result={result}
        examTitle={displayTitle}
        examGrade={displayGrade}
        examSubject={displaySubject}
        isAnswered={hasAnswerAnalysis}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* 토스트 알림 */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
