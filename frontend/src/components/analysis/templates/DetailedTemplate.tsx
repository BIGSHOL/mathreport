/**
 * Detailed Template - 상세 분석 (기본값)
 * 모든 정보를 표시하는 기본 레이아웃
 */
import { useState, useCallback, useMemo, memo } from 'react';
import type { TemplateProps } from './types';
import { QuestionCard } from '../QuestionCard';
import { ExtendedReport } from '../ExtendedReport';
import { AnswerAnalysis } from '../AnswerAnalysis';
import { CommentFeedbackButton } from '../CommentFeedbackButton';
import {
  DifficultyPieChart,
  TypePieChart,
  TopicDistributionChart,
  PointsDistributionChart,
  FormatDistributionChart,
} from '../charts/DifficultyPieChart';
import { TopicAnalysisChart } from '../charts/TopicAnalysisChart';
import { ConfidenceExplanation } from '../ConfidenceBadge';
import { TabGroup, type Tab } from '../../ui/TabGroup';
import { FEATURE_FLAGS } from '../../../lib/featureFlags';
import { getQuestionTypeLabel } from '../../../styles/tokens';

type ViewMode = 'basic' | 'comments' | 'answers' | 'extended';

export const DetailedTemplate = memo(function DetailedTemplate({
  result,
  extension,
  examType,
  analysisId,
  onGenerateExtended,
  isGenerating,
  hasAnswerAnalysis,
  onRequestAnswerAnalysis,
  isRequestingAnswerAnalysis,
}: TemplateProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('basic');
  // 기본 분석 탭 차트 유형 ('donut' | 'bar')
  const [chartType, setChartType] = useState<'donut' | 'bar'>('bar');
  // AI 코멘트 탭 토글 상태
  const [showDifficultyReason, setShowDifficultyReason] = useState(true);
  const [showAiComment, setShowAiComment] = useState(true);
  const isStudentExam = examType === 'student';

  const { summary, questions } = result;

  // 평균 신뢰도 계산
  const avgConfidence = useMemo(() => {
    const questionsWithConfidence = questions.filter((q) => q.confidence != null);
    return questionsWithConfidence.length > 0
      ? questionsWithConfidence.reduce((sum, q) => sum + (q.confidence || 0), 0) /
          questionsWithConfidence.length
      : null;
  }, [questions]);

  // AI 코멘트가 있는 문항 필터링
  const questionsWithComments = useMemo(() => {
    return questions.filter((q) => q.ai_comment && q.ai_comment.trim().length > 0);
  }, [questions]);

  // 문항을 형식별로 그룹핑 (객관식 / 서술형)
  const groupedQuestions = useMemo(() => {
    const objective = questions.filter((q) => q.question_format === 'objective');
    const subjective = questions.filter((q) => q.question_format !== 'objective'); // short_answer, essay, undefined
    return { objective, subjective };
  }, [questions]);

  // 난이도 분석이 있는 문항 수
  const difficultyReasonCount = useMemo(() => {
    return questionsWithComments.filter((q) => q.difficulty_reason && q.difficulty_reason.trim().length > 0).length;
  }, [questionsWithComments]);

  // 탭 구성
  const tabs: Tab[] = useMemo(() => {
    const baseTabs: Tab[] = [
      { id: 'basic', label: '기본 분석' },
      { id: 'comments', label: 'AI 코멘트' },
    ];
    if (isStudentExam) {
      baseTabs.push(
        {
          id: 'answers',
          label: FEATURE_FLAGS.ANSWER_ANALYSIS ? '정오답 분석' : '정오답 분석 (미리보기)'
        },
        {
          id: 'extended',
          label: FEATURE_FLAGS.EXTENDED_ANALYSIS ? '확장 분석' : '확장 분석 (미리보기)'
        }
      );
    }
    return baseTabs;
  }, [isStudentExam]);

  const handleTabChange = useCallback((tabId: string) => {
    setViewMode(tabId as ViewMode);
  }, []);

  return (
    <>
      {/* 탭 네비게이션 */}
      <div className="mb-6 flex items-center justify-between">
        <TabGroup
          tabs={tabs}
          activeTab={viewMode}
          onTabChange={handleTabChange}
          variant="bordered"
        />
        {/* 기본 분석 탭 차트 형태 토글 */}
        {viewMode === 'basic' && (
          <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                chartType === 'bar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              막대
            </button>
            <button
              onClick={() => setChartType('donut')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                chartType === 'donut'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              도넛
            </button>
          </div>
        )}
        {/* AI 코멘트 탭 토글 버튼 */}
        {viewMode === 'comments' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => difficultyReasonCount > 0 && setShowDifficultyReason(!showDifficultyReason)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                difficultyReasonCount === 0
                  ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  : showDifficultyReason
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-500'
              }`}
              title={difficultyReasonCount === 0 ? '난이도 분석 데이터 없음' : `${difficultyReasonCount}개 문항`}
            >
              난이도 분석 {difficultyReasonCount > 0 && `(${difficultyReasonCount})`}
            </button>
            <button
              onClick={() => setShowAiComment(!showAiComment)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                showAiComment
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              코멘트
            </button>
          </div>
        )}
      </div>

      {viewMode === 'basic' && (
        <>
          {/* 신뢰도 설명 패널 */}
          {avgConfidence != null && (
            <ConfidenceExplanation avgConfidence={avgConfidence} />
          )}

          {/* 분포 차트 - 1행: 난이도, 유형 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <DifficultyPieChart distribution={summary.difficulty_distribution} chartMode={chartType} />
            <TypePieChart distribution={summary.type_distribution} chartMode={chartType} />
          </div>

          {/* 분포 차트 - 2행: 문항 형식, 단원 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <FormatDistributionChart formats={questions.map((q) => q.question_format)} chartMode={chartType} />
            <TopicDistributionChart topics={questions.map((q) => q.topic || '')} chartMode={chartType} />
          </div>

          {/* 분포 차트 - 3행: 배점 */}
          <div className="mb-4">
            <PointsDistributionChart questions={questions} chartMode={chartType} />
          </div>

          {/* 과목별/단원별 출제현황 */}
          <div className="mb-4">
            <TopicAnalysisChart questions={questions} chartMode={chartType} />
          </div>

          {/* Question List - 테이블 형식 (형식별 그룹) */}
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
                    <th className="px-3 py-2 text-center w-16">번호</th>
                    <th className="px-3 py-2 text-center w-16">난이도</th>
                    <th className="px-3 py-2 text-left w-28">유형</th>
                    <th className="px-3 py-2 text-left">단원</th>
                    <th className="px-3 py-2 text-right w-16">배점</th>
                    <th className="px-3 py-2 text-center w-20">신뢰도</th>
                    <th className="px-3 py-2 text-center w-20">피드백</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {/* 객관식 그룹 */}
                  {groupedQuestions.objective.length > 0 && (
                    <>
                      <tr className="bg-sky-50 border-y border-sky-200">
                        <td colSpan={7} className="px-3 py-2">
                          <span className="text-sm font-semibold text-sky-700">
                            객관식
                          </span>
                          <span className="ml-2 text-xs text-sky-500">
                            {groupedQuestions.objective.length}문항
                          </span>
                        </td>
                      </tr>
                      {groupedQuestions.objective.map((q) => (
                        <QuestionCard key={q.id} question={q} analysisId={analysisId} />
                      ))}
                    </>
                  )}
                  {/* 서술형 그룹 */}
                  {groupedQuestions.subjective.length > 0 && (
                    <>
                      <tr className="bg-amber-50 border-y border-amber-200">
                        <td colSpan={7} className="px-3 py-2">
                          <span className="text-sm font-semibold text-amber-700">
                            서술형
                          </span>
                          <span className="ml-2 text-xs text-amber-500">
                            {groupedQuestions.subjective.length}문항
                          </span>
                        </td>
                      </tr>
                      {groupedQuestions.subjective.map((q) => (
                        <QuestionCard key={q.id} question={q} analysisId={analysisId} />
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {viewMode === 'comments' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">
              AI 분석 코멘트
              {questionsWithComments.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({questionsWithComments.length}개 문항)
                </span>
              )}
            </h3>
          </div>
          {questionsWithComments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs text-gray-500 whitespace-nowrap">
                  <tr>
                    <th className="px-3 py-2 text-center w-20">번호</th>
                    <th className="px-3 py-2 text-center w-14">난이도</th>
                    <th className="px-3 py-2 text-left w-16">유형</th>
                    <th className="px-3 py-2 text-left w-32">단원</th>
                    <th className="px-3 py-2 text-left">AI 코멘트</th>
                    <th className="px-3 py-2 text-center w-20">피드백</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {questionsWithComments.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <span className="font-semibold text-gray-700">{q.question_number}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold text-white ${
                          q.difficulty === 'high' ? 'bg-red-500' :
                          q.difficulty === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}>
                          {q.difficulty === 'high' ? '상' : q.difficulty === 'medium' ? '중' : '하'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                        {getQuestionTypeLabel(q.question_type)}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {q.topic?.split(' > ').pop() || '-'}
                      </td>
                      <td className="px-3 py-2">
                        {showDifficultyReason && q.difficulty_reason && (
                          <p className="text-xs text-gray-500 mb-1">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1 ${
                              q.difficulty === 'high' ? 'bg-red-100 text-red-700' :
                              q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {q.difficulty === 'high' ? '상' : q.difficulty === 'medium' ? '중' : '하'}
                            </span>
                            {q.difficulty_reason}
                          </p>
                        )}
                        {showAiComment && (
                          <p className="text-gray-700">{q.ai_comment}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <CommentFeedbackButton analysisId={analysisId} questionId={q.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              AI 코멘트가 없습니다
            </div>
          )}
        </div>
      )}

      {viewMode === 'answers' && isStudentExam && (
        FEATURE_FLAGS.ANSWER_ANALYSIS || hasAnswerAnalysis ? (
          <AnswerAnalysis questions={questions} analysisId={analysisId} />
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                정오답 분석
              </h3>
              <p className="text-gray-600 mb-4">
                학생의 답안을 분석하여 정답/오답 여부와 오류 유형을 파악합니다.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-700 mb-6">
                <p className="font-medium mb-2">분석 내용:</p>
                <ul className="space-y-1 list-disc list-inside text-gray-600">
                  <li>문항별 정답/오답 표시 및 득점 현황</li>
                  <li>틀린 문제 유형 분석</li>
                  <li>AI 기반 오답 원인 분석</li>
                  <li>맞춤형 학습 피드백</li>
                </ul>
              </div>

              {/* 정오답 분석 요청 버튼 */}
              {onRequestAnswerAnalysis && (
                <button
                  onClick={onRequestAnswerAnalysis}
                  disabled={isRequestingAnswerAnalysis}
                  className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRequestingAnswerAnalysis ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      분석 중...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      정오답 분석 요청 (+1크레딧)
                    </>
                  )}
                </button>
              )}

              <p className="text-xs text-gray-400 mt-3">
                분석에는 보통 10-20초가 소요됩니다
              </p>
            </div>
          </div>
        )
      )}

      {viewMode === 'extended' && (
        FEATURE_FLAGS.EXTENDED_ANALYSIS ? (
          <ExtendedReport
            extension={extension ?? null}
            onGenerate={onGenerateExtended || (async () => {})}
            isGenerating={isGenerating || false}
          />
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                확장 분석 기능 미리보기
              </h3>
              <p className="text-gray-600 mb-4">
                이 기능은 현재 베타 서비스 기간 중 준비 중입니다.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-700">
                <p className="font-medium mb-2">출시 예정 기능:</p>
                <ul className="space-y-1 list-disc list-inside text-gray-600">
                  <li>취약 단원 심층 진단</li>
                  <li>학습 우선순위 추천</li>
                  <li>맞춤형 보충 학습 가이드</li>
                  <li>성적 향상 예측 분석</li>
                </ul>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                정식 출시 시 알림을 받으시려면 계정 설정에서 알림을 활성화해주세요.
              </p>
            </div>
          </div>
        )
      )}
    </>
  );
});
