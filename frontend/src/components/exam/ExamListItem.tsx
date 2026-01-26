/**
 * Exam list item component - 분석 요약 포함
 * Implements: rerender-memo (memoized component)
 */
import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Exam } from '../../services/exam';
import { calculateDifficultyGrade } from '../../styles/tokens';

interface ExamListItemProps {
  exam: Exam;
  onViewResult: (examId: string) => void;
  onRequestAnalysis: (examId: string, forceReanalyze?: boolean) => void;
  onDelete: (examId: string) => void;
  onFeedback?: (examId: string, feedbackType: string, comment?: string) => void;
  // 선택 모드 관련
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (examId: string, selected: boolean) => void;
}

const STATUS_MAP: Record<string, string> = {
  pending: '대기중',
  analyzing: '분석중',
  completed: '완료',
  failed: '실패',
};

// 분석 단계 정의
const ANALYSIS_STAGES = [
  { id: 1, label: '파일 준비', duration: 2000 },
  { id: 2, label: '유형 분석', duration: 3000 },
  { id: 3, label: 'AI 분석', duration: 60000, slowMessage: '문항이 많으면 시간이 더 걸릴 수 있습니다' },
  { id: 4, label: '결과 저장', duration: 2000 },
];

// 시험지 레벨 피드백 타입
const EXAM_FEEDBACK_TYPES = [
  { value: 'wrong_classification', label: '유형오분류' },
  { value: 'upload_issue', label: '업로드오류' },
  { value: 'other', label: '기타' },
] as const;

export const ExamListItem = memo(function ExamListItem({
  exam,
  onViewResult,
  onRequestAnalysis,
  onDelete,
  onFeedback,
  selectionMode = false,
  isSelected = false,
  onSelectionChange,
}: ExamListItemProps) {
  const formattedDate = new Date(exam.created_at).toLocaleDateString();
  const brief = exam.analysis_brief;

  // 분석 단계 시뮬레이션
  const [currentStage, setCurrentStage] = useState(0);

  // 피드백 UI 상태
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 위치 계산
  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 200;
      const spaceBelow = window.innerHeight - rect.bottom;

      if (spaceBelow >= dropdownHeight) {
        setDropdownPos({
          top: rect.bottom + 4,
          left: rect.right - 192, // w-48 = 192px
        });
      } else {
        setDropdownPos({
          top: rect.top - dropdownHeight - 4,
          left: rect.right - 192,
        });
      }
    }
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setShowFeedback(false);
        setShowCommentInput(false);
        setComment('');
      }
    };

    if (showFeedback) {
      updateDropdownPosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [showFeedback, updateDropdownPosition]);

  // 서버에서 받은 analysis_step을 기반으로 현재 단계 설정
  useEffect(() => {
    if (exam.status !== 'analyzing') {
      setCurrentStage(0);
      return;
    }

    // 서버에서 받은 analysis_step 사용 (1-4), 없으면 0
    const serverStep = exam.analysis_step ?? 0;
    // 서버 step은 1-based, UI는 0-based
    setCurrentStage(Math.max(0, serverStep - 1));
  }, [exam.status, exam.analysis_step]);

  // 신뢰도 레벨 계산
  const getConfidenceStyle = (conf: number | null | undefined) => {
    if (conf == null) return { bg: 'bg-gray-100', text: 'text-gray-600' };
    if (conf >= 0.9) return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
    if (conf >= 0.7) return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
    return { bg: 'bg-red-100', text: 'text-red-700' };
  };

  const confStyle = getConfidenceStyle(brief?.avg_confidence);

  // AI 감지 설명 생성
  // grading_status: not_graded(미채점), partially_graded(일부채점), fully_graded(완전채점), uncertain(판단불가)
  const getDetectionExplanation = () => {
    if (!exam.detected_type || !exam.detection_confidence) return null;

    const type = exam.detected_type;
    const grading = exam.grading_status;

    // uncertain 상태 처리 (흑백 등으로 판단 어려움)
    if (grading === 'uncertain') {
      if (type === 'blank') {
        return '문제만 있는 시험지로 감지됨 (채점 여부 판단 불가)';
      }
      return '답안지로 감지됨 (채점 여부 판단 불가 - 흑백/모호한 표시)';
    }

    if (type === 'blank') {
      // 빈 시험지
      if (grading === 'not_applicable') {
        return '문제만 있는 빈 시험지로 감지됨';
      }
      if (grading === 'not_graded') {
        return '손글씨는 있으나 채점 표시가 없어 시험지로 분류됨';
      }
      return '문제만 있는 시험지로 감지됨';
    } else {
      // student: 답안지
      if (grading === 'fully_graded') {
        return '채점 완료된 답안지로 감지됨 (정오답 분석 가능)';
      }
      if (grading === 'partially_graded') {
        return '일부 채점된 답안지로 감지됨';
      }
      if (grading === 'not_graded') {
        return '답안지로 감지됨 (채점 표시 없음)';
      }
      return '손글씨 답안과 채점 표시가 감지됨';
    }
  };

  const detectionExplanation = getDetectionExplanation();

  // AI 감지 결과 우선, 없으면 exam_type 사용
  const displayType = exam.detected_type || exam.exam_type;
  const isStudentType = displayType === 'student';

  // 체크박스는 completed 상태일 때만 선택 가능
  const canSelect = exam.status === 'completed';

  return (
    <li className={`p-4 hover:bg-gray-50 ${isSelected ? 'bg-indigo-50' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        {/* 선택 모드일 때 체크박스 표시 */}
        {selectionMode && (
          <div className="flex-shrink-0 pt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelectionChange?.(exam.id, e.target.checked)}
              disabled={!canSelect}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title={canSelect ? '병합할 분석 선택' : '분석 완료된 시험지만 선택 가능'}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {/* 제목 행 */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-indigo-600 truncate">
              {exam.title}
            </p>
            {/* AI 추천 제목이 있고 현재 제목과 다르면 표시 */}
            {exam.suggested_title && exam.suggested_title !== exam.title && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-amber-50 text-amber-700 cursor-help"
                title={`AI 추천: ${exam.suggested_title}`}
              >
                <svg className="w-3 h-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                추천명
              </span>
            )}
            {/* 시험지 유형 배지 - AI 감지 결과가 있을 때만 tooltip 표시 */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                detectionExplanation ? 'cursor-help' : ''
              } ${
                isStudentType
                  ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-200'
                  : 'bg-sky-100 text-sky-700 ring-1 ring-sky-200'
              }`}
              title={detectionExplanation || undefined}
            >
              {isStudentType ? '답안지' : '시험지'}
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
          {/* AI 추천 제목 표시 (호버 시 상세보기 가능) */}
          {exam.suggested_title && exam.suggested_title !== exam.title && (
            <p className="text-xs text-amber-600 mt-0.5 truncate" title={exam.suggested_title}>
              AI 추천: {exam.suggested_title}
            </p>
          )}

          {/* 메타 정보 */}
          <p className="flex items-center flex-wrap text-sm text-gray-500 mt-1 gap-x-1">
            {exam.status === 'failed' ? (
              <span
                className="text-red-600 cursor-help underline decoration-dotted"
                title={exam.error_message || '알 수 없는 오류'}
              >
                {STATUS_MAP[exam.status]}
              </span>
            ) : (
              <span>{STATUS_MAP[exam.status] || exam.status}</span>
            )}
            <span>•</span>
            <span>{formattedDate}</span>
          </p>

          {/* AI 감지 설명 (대기 상태이고 감지 결과가 있을 때) */}
          {exam.status === 'pending' && detectionExplanation && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {detectionExplanation}
            </p>
          )}

          {/* 분석 요약 (completed 상태이고 brief가 있을 때만) */}
          {exam.status === 'completed' && brief && (() => {
            // 4단계 시스템 감지
            const is4Level = brief.difficulty_concept != null && brief.difficulty_pattern != null &&
                             brief.difficulty_reasoning != null && brief.difficulty_creative != null;

            const difficultyGrade = is4Level
              ? calculateDifficultyGrade(
                  brief.difficulty_concept,
                  brief.difficulty_pattern,
                  brief.difficulty_reasoning,
                  brief.difficulty_creative,
                  brief.format_essay,
                  brief.total_questions
                )
              : calculateDifficultyGrade(
                  brief.difficulty_high,
                  brief.difficulty_medium,
                  brief.difficulty_low,
                  brief.format_essay,
                  brief.total_questions
                );

            return (
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                <span className="font-medium flex items-center gap-1">
                  <span>{brief.total_questions}문항 · {brief.total_points}점</span>
                  {brief.total_points !== 100 && (
                    <span title={`만점이 100점이 아닙니다 (${brief.total_points}점). 배점을 확인해주세요.`}>
                      <svg
                        className="w-3.5 h-3.5 text-amber-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </span>
                {difficultyGrade && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold ${difficultyGrade.color} ${difficultyGrade.text}`}
                    title={`난이도 등급: ${difficultyGrade.grade} (${difficultyGrade.label})`}
                  >
                    {difficultyGrade.grade}
                  </span>
                )}
                {is4Level ? (
                  <>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      개념{brief.difficulty_concept}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      유형{brief.difficulty_pattern}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      사고{brief.difficulty_reasoning}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      창의{brief.difficulty_creative}
                    </span>
                  </>
                ) : (
                  <>
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
                  </>
                )}
                {/* 신뢰도 < 60%일 때 무료 재분석 안내 */}
                {brief.avg_confidence != null && brief.avg_confidence < 0.6 && (
                  <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded" title="신뢰도가 낮아 무료로 재분석할 수 있습니다">
                    신뢰도 {Math.round(brief.avg_confidence * 100)}% (무료 재분석 가능)
                  </span>
                )}
              </div>
            );
          })()}

          {/* 분석 단계 표시 (analyzing 상태일 때만) */}
          {exam.status === 'analyzing' && (
            <div className="mt-3">
              {/* 단계 인디케이터 */}
              <div className="flex items-center gap-1 mb-2">
                {ANALYSIS_STAGES.map((stage, idx) => {
                  const isCompleted = idx < currentStage;
                  const isCurrent = idx === currentStage;

                  return (
                    <div key={stage.id} className="flex items-center">
                      {/* 단계 원 */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isCurrent
                            ? 'bg-indigo-500 text-white ring-2 ring-indigo-200'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          stage.id
                        )}
                      </div>
                      {/* 연결선 */}
                      {idx < ANALYSIS_STAGES.length - 1 && (
                        <div
                          className={`w-4 h-0.5 ${
                            isCompleted ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
                {/* 단계 번호 텍스트 */}
                <span className="ml-2 text-xs text-gray-500">
                  {currentStage + 1}/{ANALYSIS_STAGES.length}
                </span>
              </div>

              {/* 현재 단계 라벨 */}
              <div className="flex items-center gap-1.5 text-sm">
                <svg className="animate-spin h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-indigo-600 font-medium">
                  {ANALYSIS_STAGES[currentStage]?.label || '분석 중'}
                </span>
              </div>

              {/* AI 분석 단계일 때 안내 메시지 */}
              {ANALYSIS_STAGES[currentStage]?.slowMessage && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {ANALYSIS_STAGES[currentStage].slowMessage}
                </p>
              )}
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
            <span className="flex items-center gap-1.5 text-indigo-600">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
            </span>
          ) : (
            <button
              onClick={() => onRequestAnalysis(exam.id)}
              className="text-green-600 hover:text-green-900 font-medium"
            >
              분석 요청
            </button>
          )}

          {/* 재분석 버튼 (신뢰도 < 60%일 때만 표시) */}
          {exam.status === 'completed' && brief && brief.avg_confidence != null && brief.avg_confidence < 0.6 && (
            <button
              onClick={() => onRequestAnalysis(exam.id, true)}
              className="text-amber-600 hover:text-amber-900 font-medium flex items-center gap-1"
              title="신뢰도가 낮아 무료로 재분석할 수 있습니다"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              무료 재분석
            </button>
          )}

          <button
            onClick={() => onDelete(exam.id)}
            className="text-red-600 hover:text-red-900 font-medium"
          >
            삭제
          </button>

          {/* 피드백 버튼 */}
          {onFeedback && (
            <div className="relative">
              {feedbackSent ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  완료
                </span>
              ) : (
                <button
                  ref={buttonRef}
                  onClick={() => setShowFeedback(!showFeedback)}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                    showFeedback
                      ? 'bg-gray-100 text-gray-700'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                  title="오류 신고"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  신고
                </button>
              )}

              {/* 드롭다운 메뉴 - Portal로 body에 렌더링 */}
              {showFeedback && !feedbackSent && createPortal(
                <div
                  ref={dropdownRef}
                  className="fixed z-[9999] w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                  style={{ top: dropdownPos.top, left: Math.max(8, dropdownPos.left) }}
                >
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-medium text-gray-700">오류 유형 선택</p>
                  </div>

                  {showCommentInput ? (
                    <div className="p-3">
                      <input
                        type="text"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="오류 내용을 입력하세요"
                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && comment.trim()) {
                            onFeedback(exam.id, 'other', comment.trim());
                            setFeedbackSent(true);
                            setShowCommentInput(false);
                            setShowFeedback(false);
                          }
                          if (e.key === 'Escape') {
                            setShowCommentInput(false);
                            setComment('');
                          }
                        }}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            if (comment.trim()) {
                              onFeedback(exam.id, 'other', comment.trim());
                              setFeedbackSent(true);
                              setShowCommentInput(false);
                              setShowFeedback(false);
                            }
                          }}
                          disabled={!comment.trim()}
                          className="flex-1 text-sm px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-md transition-colors"
                        >
                          제출
                        </button>
                        <button
                          onClick={() => {
                            setShowCommentInput(false);
                            setComment('');
                          }}
                          className="text-sm px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-1">
                      {EXAM_FEEDBACK_TYPES.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => {
                            if (type.value === 'other') {
                              setShowCommentInput(true);
                            } else {
                              onFeedback(exam.id, type.value);
                              setFeedbackSent(true);
                              setShowFeedback(false);
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          {type.value === 'wrong_classification' && (
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                          )}
                          {type.value === 'upload_issue' && (
                            <span className="w-2 h-2 rounded-full bg-red-400" />
                          )}
                          {type.value === 'other' && (
                            <span className="w-2 h-2 rounded-full bg-gray-400" />
                          )}
                          {type.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-gray-100 px-3 py-2">
                    <button
                      onClick={() => {
                        setShowFeedback(false);
                        setShowCommentInput(false);
                        setComment('');
                      }}
                      className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      닫기
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
});
