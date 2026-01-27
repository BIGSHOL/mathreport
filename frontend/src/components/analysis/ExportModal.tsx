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
import type { AnalysisResult } from '../../services/analysis';
import { DIFFICULTY_COLORS } from '../../styles/tokens';
import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { DetailedTemplate } from './templates/DetailedTemplate';

type ChartMode = 'bar' | 'donut';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AnalysisResult;
  examTitle?: string;
  examGrade?: string;
  examSubject?: string;
  isAnswered?: boolean;
}

export function ExportModal({
  isOpen,
  onClose,
  result,
  examTitle = '시험지',
  examGrade,
  examSubject = '수학',
  isAnswered = false,
}: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
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

  // Stats calculation removed - not used in simplified export modal

  const handleImageDownload = async () => {
    if (previewRef.current) {
      setIsExporting(true);
      try {
        // html-to-image를 사용하여 최신 CSS(oklch 등) 지원
        const dataUrl = await toPng(previewRef.current, {
          cacheBust: true,
          backgroundColor: '#ffffff',
          pixelRatio: 2, // 고해상도
        });

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${examTitle}_분석보고서.png`;
        link.click();
      } catch (err) {
        console.error('Image export failed:', err);
        alert(`이미지 내보내기에 실패했습니다: ${err}`);
      } finally {
        setIsExporting(false);
      }
      return;
    }
  };

  const handlePdfDownload = async () => {
    if (!previewRef.current) return;

    setIsExporting(true);
    try {
      // html2canvas로 캡처 (고해상도)
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // A4 크기 (mm)
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;

      // 이미지 비율 계산
      const contentWidth = pdfWidth - (margin * 2);
      const ratio = contentWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;

      // PDF 생성
      const pdf = new jsPDF({
        orientation: scaledHeight > pdfHeight - (margin * 2) ? 'portrait' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // 여러 페이지가 필요한 경우 처리
      const pageHeight = pdfHeight - (margin * 2);
      let heightLeft = scaledHeight;
      let position = margin;

      // 첫 페이지
      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, scaledHeight);
      heightLeft -= pageHeight;

      // 추가 페이지
      while (heightLeft > 0) {
        position = margin - (scaledHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, contentWidth, scaledHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${examTitle}_분석보고서.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert(`PDF 내보내기에 실패했습니다: ${err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const selectAllComments = () => {
    setSelectedCommentQuestions(new Set(questionsWithComments.map(q => q.id || q.question_number?.toString() || '')));
  };

  const deselectAllComments = () => {
    setSelectedCommentQuestions(new Set());
  };

  if (!isOpen) return null;

  // selectedCommentsArray removed - not used

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
                  <SectionToggle label="단원별 출제경향" checked={showTopic} onChange={setShowTopic} />
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
            <div className="flex-1 overflow-auto bg-gray-200 p-6 flex justify-center items-start">
              {/* Preview Scaling Wrapper - UI only */}
              <div style={{ transform: 'scale(0.7)', transformOrigin: 'top center', marginTop: '20px' }}>
                <div
                  ref={previewRef}
                  className="bg-white shadow-xl rounded-lg mx-auto"
                  style={{
                    width: '1024px',
                    minHeight: '1200px',
                    padding: '40px',
                    fontFamily: "'Pretendard Variable', -apple-system, sans-serif",
                  }}
                >
                  <DetailedTemplate
                    result={result}
                    examType={isAnswered ? 'student' : 'blank'}
                    analysisId={result.id}
                    extension={null}
                    isExport={true}
                    exportMetadata={{
                      examTitle,
                      examSubject,
                      examGrade: examGrade || undefined,
                    }}
                    exportOptions={{
                      showSummary,
                      showDifficulty,
                      showType,
                      showTopic,
                      showQuestions,
                      showComments,
                    }}
                    preferredChartType={chartMode}
                    selectedCommentIds={selectedCommentQuestions}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
            <div className="text-sm text-gray-500">
              미리보기 그대로 내보내집니다
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handlePdfDownload}
                disabled={true}
                className="px-5 py-2.5 text-sm font-medium text-gray-400 bg-gray-200 rounded-lg cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF 다운로드 (준비중)
              </button>
              <button
                onClick={handleImageDownload}
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

