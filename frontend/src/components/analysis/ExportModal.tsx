/**
 * Export Modal - 분석 결과 내보내기 (A4 1페이지 압축 버전)
 */
import { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { AnalysisResult } from '../../services/analysis';
import { DIFFICULTY_COLORS } from '../../styles/tokens';

// 내보내기 섹션 정의
export interface ExportSection {
  id: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}

const EXPORT_SECTIONS: ExportSection[] = [
  { id: 'header', label: '시험지 정보', description: '제목, 학년, 과목', defaultChecked: true },
  { id: 'summary', label: '요약 통계', description: '총점, 문항수, 평균 난이도', defaultChecked: true },
  { id: 'difficulty', label: '난이도 분포', description: '상/중/하 분포', defaultChecked: true },
  { id: 'type', label: '유형 분포', description: '계산/도형/응용 등', defaultChecked: true },
  { id: 'topic', label: '단원 분포', description: '단원별 문항 수', defaultChecked: true },
  { id: 'scores', label: '점수 분석', description: '정답률, 획득 점수', defaultChecked: true },
  { id: 'questions', label: '문항 요약', description: '문항별 난이도/배점 표', defaultChecked: true },
  { id: 'comments', label: 'AI 코멘트', description: '주요 문항 분석 코멘트', defaultChecked: false },
];

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
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(EXPORT_SECTIONS.filter(s => s.defaultChecked).map(s => s.id))
  );
  const previewRef = useRef<HTMLDivElement>(null);

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedSections(new Set(EXPORT_SECTIONS.map(s => s.id)));
    } else {
      setSelectedSections(new Set(['header']));
    }
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
    const earnedPoints = Math.round(questions.reduce((sum, q) => sum + (q.earned_points || 0), 0) * 10) / 10;

    // 평균 난이도
    const diffScore = (diffDist.high * 3 + diffDist.medium * 2 + diffDist.low * 1) / questions.length;
    const avgDiff = diffScore >= 2.5 ? '상' : diffScore >= 1.5 ? '중' : '하';

    return { totalPoints, diffDist, typeDist, topicDist, correctRate, earnedPoints, avgDiff };
  }, [result]);

  const handleExport = async (format: 'html' | 'image') => {
    await onExport(format, Array.from(selectedSections));
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">분석 보고서 내보내기</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 본문 */}
          <div className="flex-1 overflow-hidden flex">
            {/* 왼쪽: 옵션 */}
            <div className="w-64 border-r p-4 overflow-y-auto bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 text-sm">포함 항목</h3>
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={selectedSections.size === EXPORT_SECTIONS.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="rounded border-gray-300 w-3.5 h-3.5"
                  />
                  전체
                </label>
              </div>

              <div className="space-y-1.5">
                {EXPORT_SECTIONS.map(section => {
                  if (section.id === 'scores' && !isAnswered) return null;
                  return (
                    <label
                      key={section.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${
                        selectedSections.has(section.id) ? 'bg-indigo-100' : 'hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSections.has(section.id)}
                        onChange={() => toggleSection(section.id)}
                        disabled={section.id === 'header'}
                        className="rounded border-gray-300 w-3.5 h-3.5 text-indigo-600"
                      />
                      <span className="text-gray-700">{section.label}</span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-4 p-2 bg-amber-50 rounded border border-amber-200 text-xs text-amber-700">
                내보내기 시 1 크레딧 차감
              </div>
            </div>

            {/* 오른쪽: A4 미리보기 */}
            <div className="flex-1 p-4 overflow-auto bg-gray-100 flex justify-center">
              <div
                ref={previewRef}
                className="bg-white shadow-lg"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  maxHeight: '297mm',
                  padding: '10mm',
                  fontSize: '9pt',
                  fontFamily: "'Pretendard Variable', -apple-system, sans-serif",
                  overflow: 'hidden',
                  transform: 'scale(0.7)',
                  transformOrigin: 'top center',
                }}
              >
                <A4Preview
                  result={result}
                  selectedSections={selectedSections}
                  examTitle={examTitle}
                  examGrade={examGrade}
                  examSubject={examSubject}
                  stats={stats}
                  isAnswered={isAnswered}
                />
              </div>
            </div>
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={() => handleExport('html')}
              disabled={isExporting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isExporting ? '내보내는 중...' : 'HTML 다운로드'}
            </button>
            <button
              onClick={() => handleExport('image')}
              disabled={isExporting}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              이미지 다운로드
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// A4 미리보기 (압축 레이아웃)
interface A4PreviewProps {
  result: AnalysisResult;
  selectedSections: Set<string>;
  examTitle: string;
  examGrade?: string;
  examSubject: string;
  stats: {
    totalPoints: number;
    diffDist: { high: number; medium: number; low: number };
    typeDist: Record<string, number>;
    topicDist: Record<string, number>;
    correctRate: number;
    earnedPoints: number;
    avgDiff: string;
  };
  isAnswered: boolean;
}

function A4Preview({
  result,
  selectedSections,
  examTitle,
  examGrade,
  examSubject,
  stats,
  isAnswered,
}: A4PreviewProps) {
  const { questions, total_questions } = result;
  const { totalPoints, diffDist, typeDist, topicDist, correctRate, earnedPoints, avgDiff } = stats;

  const TYPE_LABELS: Record<string, string> = {
    calculation: '계산', geometry: '도형', application: '응용',
    proof: '증명', graph: '그래프', statistics: '통계',
  };

  if (selectedSections.size === 0) {
    return <div className="h-full flex items-center justify-center text-gray-400">항목을 선택하세요</div>;
  }

  return (
    <div className="h-full flex flex-col" style={{ lineHeight: '1.4' }}>
      {/* 헤더 */}
      {selectedSections.has('header') && (
        <div className="text-center border-b-2 border-indigo-600 pb-2 mb-3">
          <h1 className="text-lg font-bold text-indigo-900">{examTitle}</h1>
          <div className="text-xs text-gray-600 mt-1">
            {examGrade && <span className="mr-2">{examGrade}</span>}
            <span>{examSubject}</span>
            <span className="mx-2">·</span>
            <span>{new Date(result.analyzed_at).toLocaleDateString('ko-KR')}</span>
          </div>
        </div>
      )}

      {/* 2열 레이아웃 */}
      <div className="flex gap-4 flex-1">
        {/* 왼쪽 열 */}
        <div className="flex-1 space-y-3">
          {/* 요약 통계 */}
          {selectedSections.has('summary') && (
            <div className="bg-indigo-50 rounded p-2">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <div className="text-lg font-bold text-indigo-700">{total_questions}</div>
                  <div className="text-gray-500">문항</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-indigo-700">{totalPoints}</div>
                  <div className="text-gray-500">총점</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-indigo-700">{avgDiff}</div>
                  <div className="text-gray-500">난이도</div>
                </div>
                {isAnswered && selectedSections.has('scores') && (
                  <div>
                    <div className="text-lg font-bold text-green-600">{correctRate}%</div>
                    <div className="text-gray-500">정답률</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 점수 분석 (답안지) */}
          {selectedSections.has('scores') && isAnswered && (
            <div className="border rounded p-2">
              <h3 className="font-semibold text-xs text-gray-700 mb-1">점수</h3>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-indigo-600">{earnedPoints}</span>
                <span className="text-gray-400">/</span>
                <span className="text-lg text-gray-600">{totalPoints}</span>
                <span className="text-xs text-gray-400">점</span>
              </div>
            </div>
          )}

          {/* 난이도 분포 */}
          {selectedSections.has('difficulty') && (
            <div className="border rounded p-2">
              <h3 className="font-semibold text-xs text-gray-700 mb-1">난이도 분포</h3>
              <div className="flex gap-1 h-4 rounded overflow-hidden">
                {diffDist.low > 0 && (
                  <div
                    className="flex items-center justify-center text-white text-xs"
                    style={{ width: `${(diffDist.low / total_questions) * 100}%`, backgroundColor: DIFFICULTY_COLORS.low.bg }}
                  >
                    {diffDist.low}
                  </div>
                )}
                {diffDist.medium > 0 && (
                  <div
                    className="flex items-center justify-center text-white text-xs"
                    style={{ width: `${(diffDist.medium / total_questions) * 100}%`, backgroundColor: DIFFICULTY_COLORS.medium.bg }}
                  >
                    {diffDist.medium}
                  </div>
                )}
                {diffDist.high > 0 && (
                  <div
                    className="flex items-center justify-center text-white text-xs"
                    style={{ width: `${(diffDist.high / total_questions) * 100}%`, backgroundColor: DIFFICULTY_COLORS.high.bg }}
                  >
                    {diffDist.high}
                  </div>
                )}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>하 {diffDist.low}</span>
                <span>중 {diffDist.medium}</span>
                <span>상 {diffDist.high}</span>
              </div>
            </div>
          )}

          {/* 유형 분포 */}
          {selectedSections.has('type') && (
            <div className="border rounded p-2">
              <h3 className="font-semibold text-xs text-gray-700 mb-1">유형 분포</h3>
              <div className="flex flex-wrap gap-1">
                {Object.entries(typeDist).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([type, count]) => (
                  <span key={type} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                    {TYPE_LABELS[type] || type} {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 단원 분포 */}
          {selectedSections.has('topic') && (
            <div className="border rounded p-2">
              <h3 className="font-semibold text-xs text-gray-700 mb-1">단원 분포</h3>
              <div className="space-y-0.5">
                {Object.entries(topicDist).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([topic, count]) => (
                  <div key={topic} className="flex justify-between text-xs">
                    <span className="truncate text-gray-600">{topic}</span>
                    <span className="text-indigo-600 font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽 열: 문항 표 */}
        {selectedSections.has('questions') && (
          <div className="flex-1 border rounded p-2">
            <h3 className="font-semibold text-xs text-gray-700 mb-1">문항별 분석</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-0.5">번호</th>
                  <th className="text-center">난이도</th>
                  <th className="text-center">배점</th>
                  <th className="text-left">단원</th>
                  {isAnswered && <th className="text-center">정답</th>}
                </tr>
              </thead>
              <tbody>
                {questions.slice(0, 20).map((q, idx) => (
                  <tr key={q.id || idx} className="border-b border-gray-100">
                    <td className="py-0.5 font-medium">{q.question_number}</td>
                    <td className="text-center">
                      <span
                        className="inline-block w-4 h-4 rounded text-white text-xs leading-4"
                        style={{ backgroundColor: DIFFICULTY_COLORS[q.difficulty as keyof typeof DIFFICULTY_COLORS]?.bg }}
                      >
                        {q.difficulty === 'high' ? '상' : q.difficulty === 'medium' ? '중' : '하'}
                      </span>
                    </td>
                    <td className="text-center text-gray-600">{q.points}</td>
                    <td className="truncate max-w-20 text-gray-500">{q.topic?.split(' > ').pop() || '-'}</td>
                    {isAnswered && (
                      <td className="text-center">
                        {q.is_correct === true && <span className="text-green-600">O</span>}
                        {q.is_correct === false && <span className="text-red-600">X</span>}
                        {q.is_correct === null && <span className="text-gray-400">-</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {questions.length > 20 && (
              <div className="text-center text-xs text-gray-400 mt-1">... 외 {questions.length - 20}문항</div>
            )}
          </div>
        )}
      </div>

      {/* AI 코멘트 (선택 시) */}
      {selectedSections.has('comments') && (
        <div className="mt-3 border-t pt-2">
          <h3 className="font-semibold text-xs text-gray-700 mb-1">AI 분석 코멘트</h3>
          <div className="text-xs text-gray-600 space-y-1">
            {questions.filter(q => q.ai_comment).slice(0, 3).map((q, idx) => (
              <div key={idx} className="flex gap-1">
                <span className="font-medium text-indigo-600">{q.question_number}번:</span>
                <span className="truncate">{q.ai_comment}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 푸터 */}
      <div className="mt-auto pt-2 border-t text-center text-xs text-gray-400">
        Powered by AI 시험지 분석
      </div>
    </div>
  );
}

export default ExportModal;
