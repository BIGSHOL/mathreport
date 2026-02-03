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
import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import {
  useAnalysisResult,
  useExtendedAnalysis,
  useGenerateExtendedAnalysis,
  useRequestAnswerAnalysis,
  useRequestAnalysis,
} from '../hooks/useAnalysis';
import { DetailedTemplate } from '../components/analysis/templates/DetailedTemplate';
import { CacheHitBanner } from '../components/analysis/CacheHitBanner';
import { ExportModal } from '../components/analysis/ExportModal';
import { AnswerEditor } from '../components/analysis/AnswerEditor';
import { ExamCommentarySection } from '../components/analysis/ExamCommentarySection';
import { TopicStrategiesSection } from '../components/analysis/TopicStrategiesSection';
import { ScoreLevelPlanSection } from '../components/analysis/ScoreLevelPlanSection';
import { ExamPrepStrategySection } from '../components/analysis/ExamPrepStrategySection';
import { ToastContainer, useToast } from '../components/Toast';
import { getConfidenceLevel, CONFIDENCE_COLORS, DIFFICULTY_COLORS, calculateDifficultyGrade } from '../styles/tokens';
import examService, { type ExamType, type Exam } from '../services/exam';
import analysisService, { type ExamCommentary, type TopicStrategiesResponse, type ScoreLevelPlanResponse, type ExamPrepStrategyResponse } from '../services/analysis';

// Hoisted static elements (rendering-hoist-jsx)
const loadingState = <div className="p-8">로딩 중...</div>;
const notFoundState = <div className="p-8">결과를 찾을 수 없습니다</div>;

export function AnalysisResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mutate: globalMutate } = useSWRConfig();
  const [searchParams, setSearchParams] = useSearchParams();
  const { result, isLoading, error, mutate: mutateResult } = useAnalysisResult(id);
  const { extension, mutate: mutateExtension } = useExtendedAnalysis(id);
  const { generateExtended, isGenerating } = useGenerateExtendedAnalysis();
  const { requestAnswerAnalysis, isRequesting: isRequestingAnswerAnalysis } = useRequestAnswerAnalysis();
  const { requestAnalysis, isRequesting: isReanalyzing } = useRequestAnalysis();

  const [exam, setExam] = useState<Exam | null>(null);
  const [hasAnswerAnalysis, setHasAnswerAnalysis] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAnswerEditor, setShowAnswerEditor] = useState(false);
  const [commentary, setCommentary] = useState<ExamCommentary | null>(null);
  const [isGeneratingCommentary, setIsGeneratingCommentary] = useState(false);
  const [topicStrategies, setTopicStrategies] = useState<TopicStrategiesResponse | null>(null);
  const [isGeneratingStrategies, setIsGeneratingStrategies] = useState(false);
  const [scoreLevelPlan, setScoreLevelPlan] = useState<ScoreLevelPlanResponse | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [examPrepStrategy, setExamPrepStrategy] = useState<ExamPrepStrategyResponse | null>(null);
  const [isGeneratingExamPrep, setIsGeneratingExamPrep] = useState(false);
  const [showExamPrepForm, setShowExamPrepForm] = useState(false);
  const [examPrepFormData, setExamPrepFormData] = useState({ examName: '', daysUntilExam: 7 });

  // 토스트 알림
  const toast = useToast();

  // 목록으로 돌아가기 핸들러 (SWR 캐시 무효화)
  const handleBackToList = useCallback(() => {
    // 시험 목록 캐시 무효화하여 최신 상태 가져오기
    globalMutate('/api/v1/exams');
    navigate('/exams');
  }, [globalMutate, navigate]);

  // 캐시 히트 여부 (쿼리 파라미터에서 확인)
  const isCacheHit = searchParams.get('cached') === 'true';

  // 크레딧 소비 알림 표시 여부 추적 (rerender-dependencies: ref로 일회성 효과 제어)
  const creditNotificationShownRef = useRef(false);

  // 크레딧 소비 알림 (쿼리 파라미터에서 확인)
  useEffect(() => {
    if (creditNotificationShownRef.current) return;

    const creditsConsumed = searchParams.get('credits_consumed');
    const creditsRemaining = searchParams.get('credits_remaining');

    if (creditsConsumed && parseInt(creditsConsumed) > 0) {
      creditNotificationShownRef.current = true;
      toast.info(
        `${creditsConsumed}크레딧이 차감되었습니다. (남은 크레딧: ${creditsRemaining ?? 0})`,
        5000
      );
      // 쿼리 파라미터 제거 (한 번만 표시)
      searchParams.delete('credits_consumed');
      searchParams.delete('credits_remaining');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

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

  // 기존 총평 로드
  useEffect(() => {
    if (result?.commentary) {
      setCommentary(result.commentary);
    }
  }, [result?.commentary]);

  const examType: ExamType = exam?.exam_type || 'blank';

  const handleGenerateExtended = useCallback(async () => {
    if (!id) return;
    const ext = await generateExtended({ analysisId: id });
    if (ext) {
      mutateExtension(ext);
    }
  }, [id, generateExtended, mutateExtension]);

  // AI 총평 생성 핸들러
  const handleGenerateCommentary = useCallback(async (forceRegenerate: boolean = false) => {
    if (!id) return;

    setIsGeneratingCommentary(true);
    try {
      const newCommentary = await analysisService.generateCommentary(id, forceRegenerate);
      setCommentary(newCommentary);
      toast.success('AI 시험 총평이 생성되었습니다');
      // SWR 캐시에 총평 즉시 반영 (optimistic update)
      if (result) {
        mutateResult({ ...result, commentary: newCommentary }, false);
      }
    } catch (error) {
      console.error('Failed to generate commentary:', error);
      toast.error('총평 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsGeneratingCommentary(false);
    }
  }, [id, toast, mutateResult, result]);

  // 영역별 학습 전략 생성 핸들러
  const handleGenerateTopicStrategies = useCallback(async () => {
    if (!id) return;

    setIsGeneratingStrategies(true);
    try {
      const strategies = await analysisService.generateTopicStrategies(id);
      setTopicStrategies(strategies);
      toast.success('영역별 학습 전략이 생성되었습니다');
    } catch (error: any) {
      console.error('Failed to generate topic strategies:', error);
      if (error.response?.status === 400) {
        toast.error('영역별 학습 전략은 답안지 분석에만 사용 가능합니다');
      } else {
        toast.error('학습 전략 생성에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsGeneratingStrategies(false);
    }
  }, [id, toast]);

  // 점수대별 학습 계획 생성 핸들러
  const handleGenerateScoreLevelPlan = useCallback(async () => {
    if (!id) return;

    setIsGeneratingPlan(true);
    try {
      const plan = await analysisService.generateScoreLevelPlan(id);
      setScoreLevelPlan(plan);
      toast.success('점수대별 학습 계획이 생성되었습니다');
    } catch (error: any) {
      console.error('Failed to generate score level plan:', error);
      if (error.response?.status === 400) {
        toast.error('점수대별 학습 계획은 답안지 분석에만 사용 가능합니다');
      } else {
        toast.error('학습 계획 생성에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [id, toast]);

  // 시험 대비 전략 생성 핸들러
  const handleGenerateExamPrepStrategy = useCallback(async () => {
    if (!id || !examPrepFormData.examName.trim()) {
      toast.error('시험 이름을 입력해주세요');
      return;
    }

    setIsGeneratingExamPrep(true);
    setShowExamPrepForm(false);
    try {
      const strategy = await analysisService.generateExamPrepStrategy(
        id,
        examPrepFormData.examName,
        examPrepFormData.daysUntilExam
      );
      setExamPrepStrategy(strategy);
      toast.success('시험 대비 전략이 생성되었습니다');
    } catch (error: any) {
      console.error('Failed to generate exam prep strategy:', error);
      if (error.response?.status === 400) {
        toast.error('시험 대비 전략은 답안지 분석에만 사용 가능합니다');
      } else {
        toast.error('전략 생성에 실패했습니다. 다시 시도해주세요.');
      }
      setShowExamPrepForm(true);
    } finally {
      setIsGeneratingExamPrep(false);
    }
  }, [id, examPrepFormData, toast]);

  // 정오답 분석 요청 핸들러
  const handleRequestAnswerAnalysis = useCallback(async () => {
    if (!result?.exam_id) return;
    await requestAnswerAnalysis({ examId: result.exam_id });
    setHasAnswerAnalysis(true);
    // 분석 결과 다시 조회
    mutateResult();
  }, [result?.exam_id, requestAnswerAnalysis, mutateResult]);

  // 정오답 수정 저장 핸들러
  const handleSaveAnswers = useCallback(async (updates: Record<string, boolean | null>) => {
    if (!id || !result) return;

    try {
      // 백엔드 API 호출
      const response = await analysisService.updateAnswers(id, updates);

      // 성공 시 분석 결과 다시 조회
      mutateResult();
      toast.success(response.message || '정오답이 수정되었습니다');
    } catch (error) {
      console.error('Failed to update answers:', error);
      toast.error('정오답 수정에 실패했습니다. 다시 시도해주세요.');
      throw error;
    }
  }, [id, result, mutateResult, toast]);

  // 재분석 핸들러
  const handleReanalyze = useCallback(async () => {
    if (!result?.exam_id) return;

    if (!confirm('시험지를 다시 분석하시겠습니까?\n새로운 4단계 난이도 시스템(개념/유형/심화/최상위)으로 분류됩니다.\n(크레딧이 추가로 소모됩니다)')) {
      return;
    }

    try {
      const newResult = await requestAnalysis({
        examId: result.exam_id,
        forceReanalyze: true,
      });
      if (newResult?.analysis_id) {
        toast.success('재분석이 완료되었습니다');
        // 새 분석 결과 페이지로 이동
        window.location.href = `/analysis/${newResult.analysis_id}`;
      }
    } catch (error) {
      console.error('재분석 실패:', error);
      toast.error('재분석에 실패했습니다. 다시 시도해주세요.');
    }
  }, [result?.exam_id, requestAnalysis, toast]);

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

  // 신뢰도 분포 계산
  const confidenceDistribution = {
    high: questionsWithConfidence.filter(q => (q.confidence || 0) >= 0.9).length,
    medium: questionsWithConfidence.filter(q => (q.confidence || 0) >= 0.7 && (q.confidence || 0) < 0.9).length,
    low: questionsWithConfidence.filter(q => (q.confidence || 0) < 0.7).length,
  };

  // 템플릿 Props
  const templateProps = {
    result,
    extension,
    examType,
    analysisId: id || '',
    grade: exam?.extracted_grade || exam?.grade,
    onGenerateExtended: handleGenerateExtended,
    isGenerating,
    hasAnswerAnalysis,
    onRequestAnswerAnalysis: handleRequestAnswerAnalysis,
    isRequestingAnswerAnalysis,
  };

  // 난이도 분포 및 서술형 개수 계산 (js-combine-iterations: 단일 루프로 통합)
  const { difficultyDist, essayCount } = questions.reduce(
    (acc, q) => {
      // 난이도 카운트
      if (q.difficulty) {
        acc.difficultyDist[q.difficulty] = (acc.difficultyDist[q.difficulty] || 0) + 1;
      }
      // 서술형 카운트
      if (q.question_format === 'essay') {
        acc.essayCount++;
      }
      return acc;
    },
    {
      difficultyDist: {
        concept: 0, pattern: 0, reasoning: 0, creative: 0,  // 4단계 시스템
        high: 0, medium: 0, low: 0,  // 3단계 시스템 (하위 호환)
      } as Record<string, number>,
      essayCount: 0,
    }
  );

  // 4단계 시스템 감지
  const is4Level = difficultyDist.concept > 0 || difficultyDist.pattern > 0 ||
                   difficultyDist.reasoning > 0 || difficultyDist.creative > 0;

  // 종합 난이도 등급 계산 (A+~D-, 서술형 가중치 포함)
  const difficultyGrade = is4Level
    ? calculateDifficultyGrade(
        difficultyDist.concept,
        difficultyDist.pattern,
        difficultyDist.reasoning,
        difficultyDist.creative,
        essayCount,
        questions.length
      )
    : calculateDifficultyGrade(
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
  // 지역 (예: 대구_수성구 → 대구 수성구)
  const displayRegion = exam?.school_region?.replace('_', ' ');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={handleBackToList}
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
        >
          &larr; 목록으로 돌아가기
        </button>

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
                {displayRegion && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                    {displayRegion}
                  </span>
                )}
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
                  const percentage = Math.round(avgConfidence * 100);

                  return (
                    <div className="relative group">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-help ${config.bg} ${config.text}`}
                      >
                        신뢰도 {percentage}%
                      </span>
                      {/* 툴팁 */}
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-80 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="font-semibold mb-2">이 시험이 {percentage}% 신뢰도를 받은 이유</div>

                        <div className="mb-2 pb-2 border-b border-gray-600">
                          <div className="text-gray-300 leading-relaxed">
                            {confidenceDistribution.high}개 문항이 높은 신뢰도(90%+)로 분석되었습니다.
                          </div>
                          {confidenceDistribution.medium > 0 && (
                            <div className="text-gray-300 leading-relaxed">
                              {confidenceDistribution.medium}개 문항은 보통 신뢰도(70-89%)입니다.
                            </div>
                          )}
                          {confidenceDistribution.low > 0 && (
                            <div className="text-yellow-300 leading-relaxed">
                              {confidenceDistribution.low}개 문항은 낮은 신뢰도(&lt;70%)입니다.
                            </div>
                          )}
                        </div>

                        <div className="text-gray-300 leading-relaxed">
                          {percentage >= 90 ? (
                            <>
                              <div className="font-semibold text-emerald-300 mb-1">✓ 매우 신뢰할 수 있는 분석</div>
                              <div>문항들이 명확하게 인식되어 정확한 분석이 가능했습니다.</div>
                            </>
                          ) : percentage >= 70 ? (
                            <>
                              <div className="font-semibold text-yellow-300 mb-1">△ 대체로 신뢰 가능</div>
                              <div>일부 문항에서 불확실성이 있을 수 있습니다.</div>
                            </>
                          ) : (
                            <>
                              <div className="font-semibold text-red-300 mb-1">⚠ 검토 권장</div>
                              <div>스캔 품질이나 문항 형식을 확인해주세요.</div>
                            </>
                          )}
                        </div>

                        {/* 말풍선 화살표 */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 우측: 버튼들 + 종합 난이도 등급 */}
            <div className="flex items-center gap-4">
              {/* 정오답 수정 버튼 (학생 답안지만) */}
              {examType === 'student' && (
                <button
                  onClick={() => setShowAnswerEditor(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                  title="AI 판별이 정확하지 않을 때 직접 수정하세요"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  정오답 수정
                </button>
              )}

              {/* 재분석 버튼 (4단계 시스템으로 이미 분석된 경우 숨김) */}
              {!is4Level && (
                <button
                  onClick={handleReanalyze}
                  disabled={isReanalyzing}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="4단계 난이도 시스템으로 다시 분석합니다"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isReanalyzing ? '분석 중...' : '재분석'}
                </button>
              )}

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
                  <div className="text-xs text-gray-500">종합<br/>난이도</div>
                  <div
                    className={`flex items-center justify-center w-14 h-14 rounded-xl ${difficultyGrade.color} ${difficultyGrade.text} font-bold text-xl shadow-md border-2 border-white`}
                    title={`난이도 등급: ${difficultyGrade.grade} (${difficultyGrade.label})`}
                  >
                    {difficultyGrade.grade}
                  </div>
                  <div className="text-xs text-gray-600">
                    {is4Level ? (
                      <>
                        {difficultyDist.concept > 0 && (
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DIFFICULTY_COLORS.concept.bg }} />
                            <span className="font-medium">개념</span>
                            <span className="text-gray-500">{difficultyDist.concept}</span>
                          </div>
                        )}
                        {difficultyDist.pattern > 0 && (
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DIFFICULTY_COLORS.pattern.bg }} />
                            <span className="font-medium">유형</span>
                            <span className="text-gray-500">{difficultyDist.pattern}</span>
                          </div>
                        )}
                        {difficultyDist.reasoning > 0 && (
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DIFFICULTY_COLORS.reasoning.bg }} />
                            <span className="font-medium">심화</span>
                            <span className="text-gray-500">{difficultyDist.reasoning}</span>
                          </div>
                        )}
                        {difficultyDist.creative > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DIFFICULTY_COLORS.creative.bg }} />
                            <span className="font-medium">최상위</span>
                            <span className="text-gray-500">{difficultyDist.creative}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {difficultyDist.high > 0 && (
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DIFFICULTY_COLORS.high.bg }} />
                            <span className="font-medium">상</span>
                            <span className="text-gray-500">{difficultyDist.high}</span>
                          </div>
                        )}
                        {difficultyDist.medium > 0 && (
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DIFFICULTY_COLORS.medium.bg }} />
                            <span className="font-medium">중</span>
                            <span className="text-gray-500">{difficultyDist.medium}</span>
                          </div>
                        )}
                        {difficultyDist.low > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DIFFICULTY_COLORS.low.bg }} />
                            <span className="font-medium">하</span>
                            <span className="text-gray-500">{difficultyDist.low}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI 시험 총평 섹션 */}
      {!commentary && !isGeneratingCommentary && id && (
        <div className="mb-6">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">AI 시험 총평</h3>
                <p className="text-xs text-gray-600">시험 전체에 대한 전문가 수준의 종합 평가를 받아보세요 <span className="text-amber-600 font-medium">(크레딧 소모)</span></p>
              </div>
            </div>
            <button
              onClick={() => handleGenerateCommentary(false)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              총평 생성
            </button>
          </div>
        </div>
      )}
      {(commentary || isGeneratingCommentary) && (
        <div className="mb-6">
          <ExamCommentarySection
            commentary={commentary}
            isLoading={isGeneratingCommentary}
          />
        </div>
      )}

      {/* 영역별 학습 전략 섹션 (답안지만) */}
      {hasAnswerAnalysis && !topicStrategies && !isGeneratingStrategies && id && (
        <div className="mb-6">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">영역별 학습 전략</h3>
                <p className="text-xs text-gray-600">취약 단원별로 맞춤 학습 방법과 전략을 제공합니다 <span className="text-amber-600 font-medium">(크레딧 소모)</span></p>
              </div>
            </div>
            <button
              onClick={handleGenerateTopicStrategies}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              전략 생성
            </button>
          </div>
        </div>
      )}
      {(topicStrategies || isGeneratingStrategies) && (
        <div className="mb-6">
          <TopicStrategiesSection
            strategies={topicStrategies!}
            isLoading={isGeneratingStrategies}
            onRegenerate={handleGenerateTopicStrategies}
          />
        </div>
      )}

      {/* 점수대별 학습 계획 섹션 (답안지만) */}
      {hasAnswerAnalysis && !scoreLevelPlan && !isGeneratingPlan && id && (
        <div className="mb-6">
          <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg border border-sky-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">점수대별 맞춤 학습 계획</h3>
                <p className="text-xs text-gray-600">현재 점수를 분석하여 목표 달성을 위한 단계별 계획을 제공합니다 <span className="text-amber-600 font-medium">(크레딧 소모)</span></p>
              </div>
            </div>
            <button
              onClick={handleGenerateScoreLevelPlan}
              className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition-colors"
            >
              계획 생성
            </button>
          </div>
        </div>
      )}
      {(scoreLevelPlan || isGeneratingPlan) && (
        <div className="mb-6">
          <ScoreLevelPlanSection
            plan={scoreLevelPlan!}
            isLoading={isGeneratingPlan}
            onRegenerate={handleGenerateScoreLevelPlan}
          />
        </div>
      )}

      {/* 시험 대비 전략 섹션 (답안지만) */}
      {hasAnswerAnalysis && !examPrepStrategy && !isGeneratingExamPrep && !showExamPrepForm && id && (
        <div className="mb-6">
          <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border border-pink-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">시험 대비 전략</h3>
                <p className="text-xs text-gray-600">다가오는 시험을 위한 D-day 카운트다운 학습 전략을 제공합니다 <span className="text-amber-600 font-medium">(크레딧 소모)</span></p>
              </div>
            </div>
            <button
              onClick={() => setShowExamPrepForm(true)}
              className="px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 transition-colors"
            >
              전략 생성
            </button>
          </div>
        </div>
      )}

      {/* 시험 대비 전략 생성 폼 */}
      {showExamPrepForm && (
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">시험 정보 입력</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="examName" className="block text-sm font-medium text-gray-700 mb-1">
                  시험 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  id="examName"
                  type="text"
                  value={examPrepFormData.examName}
                  onChange={(e) => setExamPrepFormData({ ...examPrepFormData, examName: e.target.value })}
                  placeholder="예: 중간고사, 기말고사, 모의고사"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label htmlFor="daysUntilExam" className="block text-sm font-medium text-gray-700 mb-1">
                  시험까지 남은 일수 <span className="text-red-500">*</span>
                </label>
                <input
                  id="daysUntilExam"
                  type="number"
                  min="1"
                  max="30"
                  value={examPrepFormData.daysUntilExam}
                  onChange={(e) => setExamPrepFormData({ ...examPrepFormData, daysUntilExam: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <p className="text-xs text-gray-500 mt-1">1일 ~ 30일 사이로 입력해주세요</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleGenerateExamPrepStrategy}
                  className="flex-1 px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 transition-colors"
                >
                  생성하기
                </button>
                <button
                  onClick={() => setShowExamPrepForm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 시험 대비 전략 표시 */}
      {(examPrepStrategy || isGeneratingExamPrep) && (
        <div className="mb-6">
          <ExamPrepStrategySection
            strategy={examPrepStrategy!}
            isLoading={isGeneratingExamPrep}
            onRegenerate={() => setShowExamPrepForm(true)}
          />
        </div>
      )}

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
      />

      {/* 정오답 수정 모달 */}
      {showAnswerEditor && examType === 'student' && (
        <AnswerEditor
          questions={questions}
          onSave={handleSaveAnswers}
          onClose={() => setShowAnswerEditor(false)}
        />
      )}

      {/* 토스트 알림 */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
