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
  // 학습 대책 탭 세부 섹션 옵션
  strategyOptions?: {
    showTopicAnalysis: boolean;      // 출제 영역별 분석
    showLearningStrategies: boolean; // 영역별 학습 전략
    showEssay: boolean;              // 서술형 대비
    showTimeAllocation: boolean;     // 시간 배분 전략
    showMistakes: boolean;           // 자주 하는 실수
    showConnections: boolean;        // 학년 연계
    showKiller: boolean;             // 킬러 문항
    showLevelStrategies: boolean;    // 수준별 전략
    showTimeline: boolean;           // 학습 타임라인
  };
  preferredChartType?: 'bar' | 'donut';
  selectedCommentIds?: Set<string>;
  // 탭별 내보내기용 - 특정 탭만 렌더링
  exportTab?: 'basic' | 'comments' | 'strategy';
}
