/**
 * Analysis type selection modal with progress indicator.
 * Shows before analysis to confirm exam type and display cost.
 */
import { useState, useEffect, useCallback } from 'react';
import type { Exam, ExamType } from '../../services/exam';

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
  onConfirm: (examType: ExamType) => Promise<void>;
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
  const [selectedType, setSelectedType] = useState<ExamType>('blank');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStage, setCurrentStage] = useState(-1);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && exam) {
      // Use detected_type if available, otherwise fall back to exam_type
      setSelectedType(exam.detected_type || exam.exam_type || 'blank');
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
      await onConfirm(selectedType);
      // Success - modal will be closed by parent
    } catch {
      setIsAnalyzing(false);
      setCurrentStage(-1);
    }
  }, [selectedType, onConfirm]);

  if (!isOpen || !exam) return null;

  const creditCost = selectedType === 'student' ? 2 : 1;
  const hasDetection = exam.detected_type != null;
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
              {isAnalyzing ? '분석 진행 중' : '분석 유형 선택'}
            </h3>
            <p className="text-gray-600 mt-1 text-sm truncate px-4">{exam.title}</p>
          </div>

          {/* Progress indicator during analysis */}
          {isAnalyzing ? (
            <ProgressIndicator currentStage={currentStage} />
          ) : (
            <>
              {/* AI Detection result */}
              {hasDetection && (
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
                        {exam.detected_type === 'student' ? '학생 답안지' : '빈 시험지'}
                      </strong>
                      <span className="text-blue-600 ml-1">({confidencePercent}% 확신)</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Type selection */}
              <div className="space-y-3 mb-6">
                <label
                  className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    selectedType === 'blank'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="examType"
                    value="blank"
                    checked={selectedType === 'blank'}
                    onChange={() => setSelectedType('blank')}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                      selectedType === 'blank' ? 'border-indigo-500' : 'border-gray-300'
                    }`}
                  >
                    {selectedType === 'blank' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">빈 시험지</span>
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                        1크레딧
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">문제만 있는 시험지 (출제 분석)</p>
                  </div>
                </label>

                <label
                  className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    selectedType === 'student'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="examType"
                    value="student"
                    checked={selectedType === 'student'}
                    onChange={() => setSelectedType('student')}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                      selectedType === 'student' ? 'border-indigo-500' : 'border-gray-300'
                    }`}
                  >
                    {selectedType === 'student' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">학생 답안지</span>
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                        2크레딧
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      정오답 분석 + 취약점 진단 가능
                    </p>
                  </div>
                </label>
              </div>

              {/* Warning: blank detected but student selected */}
              {exam.detected_type === 'blank' && selectedType === 'student' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <div className="flex gap-2">
                    <svg
                      className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">빈 시험지로 감지되었습니다</p>
                      <p className="text-amber-700 mt-0.5">
                        학생 답안지로 분석하면 정오답 정보가 없어 정확한 분석이 어려울 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info: student detected but blank selected */}
              {exam.detected_type === 'student' && selectedType === 'blank' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex gap-2">
                    <svg
                      className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
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
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">학생 답안지로 감지되었습니다</p>
                      <p className="text-blue-700 mt-0.5">
                        학생 답안지로 분석하면 정오답 분석과 취약점 진단을 받을 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                분석 시작 ({creditCost}크레딧)
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
