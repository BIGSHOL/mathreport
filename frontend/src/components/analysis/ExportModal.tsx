/**
 * Export Modal - 분석 보고서 내보내기 (리팩토링 버전)
 *
 * 개선 사항:
 * - 차트 형태 선택 (막대/도넛)
 * - 세밀한 컨텐츠 선택
 * - AI 코멘트 개별 선택
 * - 공간 활용 최적화
 */
import { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { AnalysisResult, QuestionAnalysis } from '../../services/analysis';
import { DIFFICULTY_COLORS, CHART_COLORS, QUESTION_TYPE_COLORS } from '../../styles/tokens';
import html2canvas from 'html2canvas';

type ChartMode = 'bar' | 'donut';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AnalysisResult;
  examTitle?: string;
  examGrade?: string;
  examSubject?: string;
  isAnswered?: boolean;
  onExport: (format: 'html' | 'image', sections: string[]) => Promise<void>;
  isExporting?: boolean;
}

export function ExportModal({
  isOpen,
  onClose,
  result,
  examTitle = '시험지',
  examGrade,
  examSubject = '수학',
  isAnswered = false,
  onExport,
  isExporting = false,
}: ExportModalProps) {
  // 섹션 선택
  const [showHeader, setShowHeader] = useState(true);
  const [showSummary, setShowSummary] = useState(true);
  const [showDifficulty, setShowDifficulty] = useState(true);
  const [showType, setShowType] = useState(true);
  const [showTopic, setShowTopic] = useState(true);
  const [showQuestions, setShowQuestions] = useState(true);
  const [showComments, setShowComments] = useState(true);

  // 차트 모드
  const [chartMode, setChartMode] = useState<ChartMode>('donut');

  // 선택된 코멘트 문항
  const [selectedCommentQuestions, setSelectedCommentQuestions] = useState<Set<string>>(new Set());

  const previewRef = useRef<HTMLDivElement>(null);

  // 코멘트가 있는 문항들
  const questionsWithComments = useMemo(() =>
    result.questions.filter(q => q.ai_comment),
    [result.questions]
  );

  // 코멘트 문항 초기 선택 (처음 6개)
  useState(() => {
    const initial = new Set(questionsWithComments.slice(0, 6).map(q => q.id || q.question_number?.toString() || ''));
    setSelectedCommentQuestions(initial);
  });

  const toggleCommentQuestion = (id: string) => {
    setSelectedCommentQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const stats = useMemo(() => {
    const { questions } = result;
    const totalPoints = Math.round(questions.reduce((sum, q) => sum + (q.points || 0), 0) * 10) / 10;

    const diffDist = {
      high: questions.filter(q => q.difficulty === 'high').length,
      medium: questions.filter(q => q.difficulty === 'medium').length,
      low: questions.filter(q => q.difficulty === 'low').length,
    };

    const typeDist: Record<string, number> = {};
    questions.forEach(q => {
      const type = q.question_type || 'other';
      typeDist[type] = (typeDist[type] || 0) + 1;
    });

    const topicDist: Record<string, number> = {};
    questions.forEach(q => {
      const topic = q.topic?.split(' > ')[0] || '미분류';
      topicDist[topic] = (topicDist[topic] || 0) + 1;
    });

    const answeredQs = questions.filter(q => q.is_correct !== undefined && q.is_correct !== null);
    const correctCount = answeredQs.filter(q => q.is_correct).length;
    const correctRate = answeredQs.length > 0 ? Math.round((correctCount / answeredQs.length) * 100) : 0;

    const diffScore = questions.length > 0
      ? (diffDist.high * 3 + diffDist.medium * 2 + diffDist.low * 1) / questions.length
      : 2;

    const getDiffGrade = () => {
      if (diffScore >= 2.83) return { grade: 'A+', color: '#dc2626' };
      if (diffScore >= 2.67) return { grade: 'A', color: '#ef4444' };
      if (diffScore >= 2.50) return { grade: 'A-', color: '#f87171' };
      if (diffScore >= 2.33) return { grade: 'B+', color: '#f97316' };
      if (diffScore >= 2.17) return { grade: 'B', color: '#fb923c' };
      if (diffScore >= 2.00) return { grade: 'B-', color: '#f59e0b' };
      if (diffScore >= 1.83) return { grade: 'C+', color: '#eab308' };
      if (diffScore >= 1.67) return { grade: 'C', color: '#facc15' };
      if (diffScore >= 1.50) return { grade: 'C-', color: '#84cc16' };
      if (diffScore >= 1.33) return { grade: 'D+', color: '#22c55e' };
      if (diffScore >= 1.17) return { grade: 'D', color: '#4ade80' };
      return { grade: 'D-', color: '#34d399' };
    };

    return { totalPoints, diffDist, typeDist, topicDist, correctRate, diffGrade: getDiffGrade() };
  }, [result]);

  const handleExport = async (format: 'html' | 'image') => {
    if (format === 'image' && previewRef.current) {
      try {
        const canvas = await html2canvas(previewRef.current, {
          scale: 2, // 고해상도
          backgroundColor: '#ffffff',
          logging: false
        });

        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `${examTitle}_분석보고서.png`;
        link.click();
      } catch (err) {
        console.error('Image export failed:', err);
        alert('이미지 내보내기에 실패했습니다.');
      }
      return;
    }

    const sections: string[] = [];
    if (showHeader) sections.push('header');
    if (showSummary) sections.push('summary');
    if (showDifficulty) sections.push('difficulty');
    if (showType) sections.push('type');
    if (showTopic) sections.push('topic');
    if (showQuestions) sections.push('questions');
    if (showComments) sections.push('comments');
    await onExport(format, sections);
  };

  const selectAllComments = () => {
    setSelectedCommentQuestions(new Set(questionsWithComments.map(q => q.id || q.question_number?.toString() || '')));
  };

  const deselectAllComments = () => {
    setSelectedCommentQuestions(new Set());
  };

  if (!isOpen) return null;

  const selectedCommentsArray = questionsWithComments.filter(q =>
    selectedCommentQuestions.has(q.id || q.question_number?.toString() || '')
  );

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-600 to-purple-600">
            <div>
              <h2 className="text-xl font-bold text-white">분석 보고서 내보내기</h2>
              <p className="text-indigo-200 text-sm mt-0.5">{examTitle}</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 본문 */}
          <div className="flex-1 overflow-hidden flex">
            {/* 왼쪽: 옵션 */}
            <div className="w-72 border-r flex flex-col bg-gray-50 overflow-y-auto">
              {/* 섹션 선택 */}
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900 text-sm mb-3">포함할 섹션</h3>
                <div className="space-y-2">
                  <SectionToggle label="시험지 정보" checked={showHeader} onChange={setShowHeader} disabled />
                  <SectionToggle label="요약 통계" checked={showSummary} onChange={setShowSummary} />
                  <SectionToggle label="난이도 분포" checked={showDifficulty} onChange={setShowDifficulty} />
                  <SectionToggle label="유형 분포" checked={showType} onChange={setShowType} />
                  <SectionToggle label="단원 분포" checked={showTopic} onChange={setShowTopic} />
                  <SectionToggle label="문항 테이블" checked={showQuestions} onChange={setShowQuestions} />
                  <SectionToggle label="AI 코멘트" checked={showComments} onChange={setShowComments} />
                </div>
              </div>

              {/* 차트 스타일 */}
              {(showDifficulty || showType || showTopic) && (
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">차트 스타일</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setChartMode('bar')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${chartMode === 'bar'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      막대
                    </button>
                    <button
                      onClick={() => setChartMode('donut')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${chartMode === 'donut'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                      </svg>
                      도넛
                    </button>
                  </div>
                </div>
              )}

              {/* AI 코멘트 선택 */}
              {showComments && questionsWithComments.length > 0 && (
                <div className="p-4 flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm">AI 코멘트 선택</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={selectAllComments}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        전체
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={deselectAllComments}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        해제
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {questionsWithComments.map(q => {
                      const qId = q.id || q.question_number?.toString() || '';
                      return (
                        <label
                          key={qId}
                          className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs ${selectedCommentQuestions.has(qId)
                              ? 'bg-amber-50 border border-amber-200'
                              : 'bg-white border border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCommentQuestions.has(qId)}
                            onChange={() => toggleCommentQuestion(qId)}
                            className="mt-0.5 rounded border-gray-300 w-3.5 h-3.5 text-amber-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="inline-flex items-center justify-center w-5 h-5 rounded text-white text-xs font-bold"
                                style={{ backgroundColor: DIFFICULTY_COLORS[q.difficulty as keyof typeof DIFFICULTY_COLORS]?.bg || '#9ca3af' }}
                              >
                                {q.question_number}
                              </span>
                              <span className="text-gray-500 truncate">{q.topic?.split(' > ').slice(-1)[0] || '-'}</span>
                            </div>
                            <p className="text-gray-600 truncate mt-0.5">{q.ai_comment}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    {selectedCommentQuestions.size}개 선택됨
                  </div>
                </div>
              )}

              {/* 크레딧 알림 */}
              <div className="p-4 border-t mt-auto">
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">1 크레딧 차감</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: 미리보기 */}
            <div className="flex-1 overflow-auto bg-gray-200 p-6">
              <div
                ref={previewRef}
                className="bg-white shadow-xl rounded-lg mx-auto"
                style={{
                  width: '800px',
                  minHeight: '900px',
                  padding: '32px',
                  fontFamily: "'Pretendard Variable', -apple-system, sans-serif",
                }}
              >
                <ReportPreview
                  result={result}
                  examTitle={examTitle}
                  examGrade={examGrade}
                  examSubject={examSubject}
                  stats={stats}
                  isAnswered={isAnswered}
                  showHeader={showHeader}
                  showSummary={showSummary}
                  showDifficulty={showDifficulty}
                  showType={showType}
                  showTopic={showTopic}
                  showQuestions={showQuestions}
                  showComments={showComments}
                  chartMode={chartMode}
                  selectedComments={selectedCommentsArray}
                />
              </div>
            </div>
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
            <div className="text-sm text-gray-500">
              미리보기는 실제 출력과 다를 수 있습니다
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleExport('html')}
                disabled={isExporting}
                className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {isExporting ? '내보내는 중...' : 'HTML 다운로드'}
              </button>
              <button
                onClick={() => handleExport('image')}
                disabled={isExporting}
                className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                이미지 다운로드
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// 섹션 토글 컴포넌트
function SectionToggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-indigo-50' : 'hover:bg-gray-100'
      } ${disabled ? 'opacity-60' : ''}`}>
      <span className={`text-sm ${checked ? 'text-indigo-700 font-medium' : 'text-gray-700'}`}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
        className="rounded border-gray-300 w-4 h-4 text-indigo-600"
      />
    </label>
  );
}

// SVG 도넛 차트
function MiniDonutChart({
  data,
  size = 80,
  strokeWidth = 12,
}: {
  data: { value: number; color: string; label: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativePercent = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
      {data.filter(d => d.value > 0).map((d, idx) => {
        const percent = d.value / total;
        const offset = cumulativePercent * circumference;
        cumulativePercent += percent;

        return (
          <circle
            key={idx}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={d.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${percent * circumference} ${circumference}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        );
      })}
      <text x={center} y={center} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '12px', fontWeight: 'bold', fill: '#374151' }}>
        {total}
      </text>
    </svg>
  );
}

// 막대 차트
function MiniBarChart({
  data,
  maxValue,
}: {
  data: { value: number; color: string; label: string }[];
  maxValue: number;
}) {
  if (data.length === 0) return null;

  return (
    <div className="space-y-1.5 flex-1">
      {data.slice(0, 5).map((d, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="w-12 text-xs text-gray-600 truncate">{d.label}</span>
          <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
            <div
              className="h-full rounded flex items-center justify-end pr-1 text-xs text-white font-medium"
              style={{
                width: `${(d.value / maxValue) * 100}%`,
                backgroundColor: d.color,
                minWidth: d.value > 0 ? '20px' : 0,
              }}
            >
              {d.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 리포트 미리보기
interface ReportPreviewProps {
  result: AnalysisResult;
  examTitle: string;
  examGrade?: string;
  examSubject: string;
  stats: {
    totalPoints: number;
    diffDist: { high: number; medium: number; low: number };
    typeDist: Record<string, number>;
    topicDist: Record<string, number>;
    correctRate: number;
    diffGrade: { grade: string; color: string };
  };
  isAnswered: boolean;
  showHeader: boolean;
  showSummary: boolean;
  showDifficulty: boolean;
  showType: boolean;
  showTopic: boolean;
  showQuestions: boolean;
  showComments: boolean;
  chartMode: ChartMode;
  selectedComments: QuestionAnalysis[];
}

function ReportPreview({
  result,
  examTitle,
  examGrade,
  examSubject,
  stats,
  isAnswered,
  showHeader,
  showSummary,
  showDifficulty,
  showType,
  showTopic,
  showQuestions,
  showComments,
  chartMode,
  selectedComments,
}: ReportPreviewProps) {
  const { questions, total_questions } = result;
  const { totalPoints, diffDist, typeDist, topicDist, diffGrade, correctRate } = stats;

  const TYPE_LABELS: Record<string, string> = {
    calculation: '계산', geometry: '도형', application: '응용',
    proof: '증명', graph: '그래프', statistics: '통계', concept: '개념',
    vocabulary: '어휘', grammar: '문법', reading_main_idea: '대의파악',
    reading_detail: '세부정보', reading_inference: '추론', listening: '듣기',
    writing: '영작', sentence_completion: '문장완성', conversation: '대화문',
    other: '기타',
  };

  const FORMAT_LABELS: Record<string, string> = {
    objective: '객관식', short_answer: '단답형', essay: '서술형',
  };

  // 차트 데이터
  const diffData = [
    { value: diffDist.low, color: CHART_COLORS[0], label: '하' },
    { value: diffDist.medium, color: CHART_COLORS[1], label: '중' },
    { value: diffDist.high, color: CHART_COLORS[2], label: '상' },
  ];

  const typeEntries = Object.entries(typeDist).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const typeData = typeEntries.map(([type, count], idx) => ({
    value: count,
    color: CHART_COLORS[idx % CHART_COLORS.length],
    label: TYPE_LABELS[type] || type,
  }));

  const topicEntries = Object.entries(topicDist).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topicData = topicEntries.map(([topic, count], idx) => ({
    value: count,
    color: CHART_COLORS[idx % CHART_COLORS.length],
    label: topic,
  }));

  const maxTypeValue = Math.max(...typeEntries.map(([, v]) => v));
  const maxTopicValue = Math.max(...topicEntries.map(([, v]) => v));

  const hasCharts = showDifficulty || showType || showTopic;

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      {showHeader && (
        <div className="text-center pb-4 border-b-2 border-indigo-600">
          <h1 className="text-2xl font-bold text-gray-900">{examTitle}</h1>
          <div className="flex items-center justify-center gap-3 mt-2 text-sm">
            {examGrade && <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md font-medium">{examGrade}</span>}
            <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-md font-medium">{examSubject}</span>
            <span className="text-gray-500">분석일: {new Date(result.analyzed_at).toLocaleDateString('ko-KR')}</span>
          </div>
        </div>
      )}

      {/* 요약 통계 */}
      {showSummary && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5">
          <div className={`grid gap-4 ${isAnswered ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">{total_questions}</div>
              <div className="text-sm text-gray-600 mt-1">총 문항수</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">{totalPoints}</div>
              <div className="text-sm text-gray-600 mt-1">총 배점</div>
            </div>
            <div className="text-center">
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-lg text-white font-bold text-xl"
                style={{ backgroundColor: diffGrade.color }}
              >
                {diffGrade.grade}
              </div>
              <div className="text-sm text-gray-600 mt-1">난이도</div>
            </div>
            {isAnswered && (
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600">{correctRate}%</div>
                <div className="text-sm text-gray-600 mt-1">정답률</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 차트 영역 */}
      {hasCharts && (
        <div className="grid grid-cols-3 gap-4">
          {/* 난이도 분포 */}
          {showDifficulty && (
            <div className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">난이도 분포</h3>
              <div className="flex items-center gap-3">
                {chartMode === 'donut' ? (
                  <>
                    <MiniDonutChart data={diffData} />
                    <div className="flex-1 space-y-1">
                      {diffData.filter(d => d.value > 0).map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: d.color }} />
                            <span className="text-gray-600">{d.label}</span>
                          </div>
                          <span className="font-medium">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <MiniBarChart data={diffData} maxValue={total_questions} />
                )}
              </div>
            </div>
          )}

          {/* 유형 분포 */}
          {showType && (
            <div className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">유형 분포</h3>
              <div className="flex items-center gap-3">
                {chartMode === 'donut' ? (
                  <>
                    <MiniDonutChart data={typeData} />
                    <div className="flex-1 space-y-1">
                      {typeData.slice(0, 4).map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: d.color }} />
                            <span className="text-gray-600 truncate">{d.label}</span>
                          </div>
                          <span className="font-medium">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <MiniBarChart data={typeData} maxValue={maxTypeValue} />
                )}
              </div>
            </div>
          )}

          {/* 단원 분포 */}
          {showTopic && (
            <div className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">단원 분포</h3>
              <div className="flex items-center gap-3">
                {chartMode === 'donut' ? (
                  <>
                    <MiniDonutChart data={topicData} />
                    <div className="flex-1 space-y-1">
                      {topicData.slice(0, 4).map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: d.color }} />
                            <span className="text-gray-600 truncate max-w-[70px]">{d.label}</span>
                          </div>
                          <span className="font-medium">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <MiniBarChart data={topicData} maxValue={maxTopicValue} />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 문항 테이블 */}
      {showQuestions && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-900 text-sm">문항별 분석</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs">
                <th className="text-left px-3 py-2 font-medium text-gray-600">번호</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">난이도</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">형식</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">배점</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">유형</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">단원</th>
                {isAnswered && <th className="text-center px-3 py-2 font-medium text-gray-600">정답</th>}
              </tr>
            </thead>
            <tbody>
              {questions.map((q, idx) => (
                <tr key={q.id || idx} className="border-b border-gray-100">
                  <td className="px-3 py-1.5 font-medium text-xs">{q.question_number}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded text-white text-xs font-medium"
                      style={{ backgroundColor: DIFFICULTY_COLORS[q.difficulty as keyof typeof DIFFICULTY_COLORS]?.bg || '#9ca3af' }}
                    >
                      {q.difficulty === 'high' ? '상' : q.difficulty === 'medium' ? '중' : '하'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-center text-xs text-gray-600">
                    {FORMAT_LABELS[q.question_format || 'objective']}
                  </td>
                  <td className="px-3 py-1.5 text-center text-xs">{q.points}</td>
                  <td className="px-3 py-1.5 text-xs">
                    <span style={{ color: QUESTION_TYPE_COLORS[q.question_type || 'other']?.color || '#6b7280' }}>
                      {TYPE_LABELS[q.question_type || 'other']}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-xs text-gray-600 truncate max-w-[100px]">
                    {q.topic?.split(' > ').slice(-1)[0] || '-'}
                  </td>
                  {isAnswered && (
                    <td className="px-3 py-1.5 text-center">
                      {q.is_correct === true && <span className="text-emerald-600 font-bold">O</span>}
                      {q.is_correct === false && <span className="text-red-600 font-bold">X</span>}
                      {q.is_correct === null && <span className="text-gray-400">-</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* AI 코멘트 */}
      {showComments && selectedComments.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="font-semibold text-gray-900">AI 분석 코멘트</h3>
            <span className="text-xs text-gray-500">({selectedComments.length}개)</span>
          </div>
          <div className="space-y-3">
            {selectedComments.map((q, idx) => (
              <div key={idx} className="bg-white rounded-lg p-3 border border-amber-100">
                <div className="flex items-start gap-3">
                  <span
                    className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-sm font-bold"
                    style={{ backgroundColor: DIFFICULTY_COLORS[q.difficulty as keyof typeof DIFFICULTY_COLORS]?.bg || '#9ca3af' }}
                  >
                    {q.question_number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                        {TYPE_LABELS[q.question_type || 'other']}
                      </span>
                      <span className="text-xs text-gray-500">{q.topic?.split(' > ').slice(-1)[0]}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{q.ai_comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 푸터 */}
      <div className="pt-4 border-t text-center">
        <p className="text-xs text-gray-400">Powered by AI 시험지 분석 시스템</p>
      </div>
    </div>
  );
}

export default ExportModal;
