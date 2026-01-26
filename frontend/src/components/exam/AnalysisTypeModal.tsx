/**
 * Analysis confirmation modal with progress indicator.
 * Shows before analysis to confirm and display cost (1 credit).
 *
 * 2단계 분석 시스템:
 * - 1단계: 문항 분석 (1크레딧) - 이 모달에서 실행
 * - 2단계: 정오답 분석 (+1크레딧) - 분석 결과에서 별도 요청
 */
import { useState, useEffect, useCallback } from 'react';
import type { Exam } from '../../services/exam';

// Analysis stages for progress display
const ANALYSIS_STAGES = [
  { id: 'prepare', label: '파일 준비', duration: 1000 },
  { id: 'classify', label: '유형 분석', duration: 2000 },
  { id: 'analyze', label: 'AI 분석 중', duration: 15000 },
  { id: 'save', label: '결과 저장', duration: 1000 },
];

interface AnalysisTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  onConfirm: () => Promise<void>;
}

function ProgressIndicator({ currentStage }: { currentStage: number }) {
  return (
    <div className="space-y-3 my-6">
      {ANALYSIS_STAGES.map((s, idx) => {
        const isCompleted = idx < currentStage;
        const isCurrent = idx === currentStage;

        return (
          <div key={s.id} className="flex items-center gap-3">
            {/* Stage indicator */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                isCompleted
                  ? 'bg-green-500 text-white'
                  : isCurrent
                  ? 'bg-indigo-500 text-white animate-pulse'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {isCompleted ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                idx + 1
              )}
            </div>

            {/* Stage label */}
            <span
              className={`flex-1 ${
                isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {s.label}
            </span>

            {/* Current indicator */}
            {isCurrent && (
              <span className="text-indigo-500 text-sm flex items-center gap-1">
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
                진행 중...
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AnalysisTypeModal({ isOpen, onClose, exam, onConfirm }: AnalysisTypeModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStage, setCurrentStage] = useState(-1);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && exam) {
      setIsAnalyzing(false);
      setCurrentStage(-1);
    }
  }, [isOpen, exam]);

  // Progress simulation during analysis
  useEffect(() => {
    if (!isAnalyzing) return;

    let stageIndex = 0;
    setCurrentStage(0);

    const advanceStage = () => {
      stageIndex++;
      if (stageIndex < ANALYSIS_STAGES.length) {
        setCurrentStage(stageIndex);
      }
    };

    // Schedule stage advances based on durations
    const timers: ReturnType<typeof setTimeout>[] = [];
    let accumulatedTime = 0;

    ANALYSIS_STAGES.forEach((_, idx) => {
      if (idx > 0) {
        accumulatedTime += ANALYSIS_STAGES[idx - 1].duration;
        timers.push(setTimeout(advanceStage, accumulatedTime));
      }
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [isAnalyzing]);

  const handleConfirm = useCallback(async () => {
    setIsAnalyzing(true);

    try {
      await onConfirm();
      // Success - modal will be closed by parent
    } catch {
      setIsAnalyzing(false);
      setCurrentStage(-1);
    }
  }, [onConfirm]);

  if (!isOpen || !exam) return null;

  const isStudentExam = exam.detected_type === 'student' || (exam.detected_type as string) === 'answered';
  const confidencePercent = exam.detection_confidence
    ? Math.round(exam.detection_confidence * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50"
          onClick={isAnalyzing ? undefined : onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          {/* Close button - hidden during analysis */}
          {!isAnalyzing && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {isAnalyzing ? '분석 진행 중' : '시험지 분석'}
            </h3>
            <p className="text-gray-600 mt-1 text-sm truncate px-4">{exam.title}</p>
          </div>

          {/* Progress indicator during analysis */}
          {isAnalyzing ? (
            <ProgressIndicator currentStage={currentStage} />
          ) : (
            <>
              {/* AI Detection result */}
              {exam.detected_type && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm text-blue-800">
                      AI 감지:{' '}
                      <strong>
                        {isStudentExam ? '학생 답안지' : '빈 시험지'}
                      </strong>
                      <span className="text-blue-600 ml-1">({confidencePercent}% 확신)</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Analysis info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">문항 분석</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      문항별 난이도, 유형, 토픽을 분석합니다.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                        1크레딧
                      </span>
                    </div>
                  </div>
                </div>

                {/* Student exam info */}
                {isStudentExam && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          정오답 분석
                          <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">
                            추가 옵션
                          </span>
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          분석 완료 후 정오답 분석을 추가할 수 있습니다.
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                            +1크레딧
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                분석 시작 (1크레딧)
              </button>

              {/* Info text */}
              <p className="text-xs text-gray-400 text-center mt-3">
                분석에는 보통 10-30초가 소요됩니다
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalysisTypeModal;
