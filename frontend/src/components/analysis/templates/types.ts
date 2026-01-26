/**
 * Template component common types
 */
import type { AnalysisResult, AnalysisExtension } from '../../../services/analysis';
import type { ExamType } from '../../../services/exam';

export interface TemplateProps {
  result: AnalysisResult;
  extension: AnalysisExtension | null | undefined;
  examType: ExamType;
  analysisId: string;
  onGenerateExtended?: () => Promise<void>;
  isGenerating?: boolean;
  // 정오답 분석 관련
  hasAnswerAnalysis?: boolean;
  onRequestAnswerAnalysis?: () => Promise<void>;
  isRequestingAnswerAnalysis?: boolean;
  // Export mode
  isExport?: boolean;
  exportMetadata?: {
    examTitle: string;
    examSubject?: string;
    examGrade?: string;
  };
  exportOptions?: {
    showSummary: boolean;
    showDifficulty: boolean;
    showType: boolean;
    showTopic: boolean;
    showQuestions: boolean;
    showComments: boolean;
  };
  preferredChartType?: 'bar' | 'donut';
  selectedCommentIds?: Set<string>;
}
