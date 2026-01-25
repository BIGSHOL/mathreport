/**
 * Exam list item component - 분석 요약 포함
 * Implements: rerender-memo (memoized component)
 */
import { memo, useState, useEffect } from 'react';
import type { Exam } from '../../services/exam';

interface ExamListItemProps {
  exam: Exam;
  onViewResult: (examId: string) => void;
  onRequestAnalysis: (examId: string) => void;
  onDelete: (examId: string) => void;
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

export const ExamListItem = memo(function ExamListItem({
  exam,
  onViewResult,
  onRequestAnalysis,
  onDelete,
  selectionMode = false,
  isSelected = false,
  onSelectionChange,
}: ExamListItemProps) {
  const formattedDate = new Date(exam.created_at).toLocaleDateString();
  const brief = exam.analysis_brief;

  // 분석 단계 시뮬레이션
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    if (exam.status !== 'analyzing') {
      setCurrentStage(0);
      return;
    }

    // 단계별 진행 시뮬레이션
    setCurrentStage(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let accumulatedTime = 0;

    // 각 단계 시작 시간에 맞춰 단계 전환
    ANALYSIS_STAGES.forEach((stage, idx) => {
      if (idx > 0) {
        accumulatedTime += ANALYSIS_STAGES[idx - 1].duration;
        timers.push(
          setTimeout(() => {
            setCurrentStage(idx);
          }, accumulatedTime)
        );
      }
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [exam.status]);

  // 신뢰도 레벨 계산
  const getConfidenceStyle = (conf: number | null | undefined) => {
    if (conf == null) return { bg: 'bg-gray-100', text: 'text-gray-600' };
    if (conf >= 0.9) return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
    if (conf >= 0.7) return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
    return { bg: 'bg-red-100', text: 'text-red-700' };
  };

  const confStyle = getConfidenceStyle(brief?.avg_confidence);

  // AI 감지 설명 생성
  // grading_status: not_graded(미채점), partially_graded(일부채점), fully_graded(완전채점)
  const getDetectionExplanation = () => {
    if (!exam.detected_type || !exam.detection_confidence) return null;

    const type = exam.detected_type;
    const grading = exam.grading_status;

    if (type === 'blank') {
      // 미채점 답안지가 blank로 다운그레이드된 경우
      if (grading === 'not_graded') {
        return '손글씨는 있으나 채점 표시가 없어 시험지로 분류됨';
      }
      return '문제만 있는 시험지로 감지됨';
    } else {
      // student: 채점된 답안지
      if (grading === 'fully_graded') {
        return '채점 완료된 답안지로 감지됨 (정오답 분석 가능)';
      }
      if (grading === 'partially_graded') {
        return '일부 채점된 답안지로 감지됨';
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
            {/* 시험지 유형 배지 - AI 감지 결과 우선 표시 */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold cursor-help ${
                isStudentType
                  ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-200'
                  : 'bg-sky-100 text-sky-700 ring-1 ring-sky-200'
              }`}
              title={detectionExplanation || (isStudentType ? '학생이 푼 답안지' : '문제만 있는 시험지')}
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
            <span className="truncate">{exam.subject}</span>
            <span>•</span>
            <span>{STATUS_MAP[exam.status] || exam.status}</span>
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
