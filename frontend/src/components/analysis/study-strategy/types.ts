/**
 * StudyStrategyTab 관련 타입 정의
 */
import type { QuestionAnalysis } from '../../../services/analysis';

// 학습 대책 섹션별 표시 옵션
export interface StrategyExportOptions {
  showTopicAnalysis: boolean;      // 출제 영역별 분석
  showLearningStrategies: boolean; // 영역별 학습 전략
  showEssay: boolean;              // 서술형 대비
  showTimeAllocation: boolean;     // 시간 배분 전략
  showMistakes: boolean;           // 자주 하는 실수
  showConnections: boolean;        // 학년 연계
  showKiller: boolean;             // 킬러 문항
  showLevelStrategies: boolean;    // 수준별 전략
  showTimeline: boolean;           // 학습 타임라인
  showPersonalized?: boolean;      // 맞춤형 학습 대책 (정오답 분석 기반)
}

export interface StudyStrategyTabProps {
  questions: QuestionAnalysis[];
  /** 내보내기 모드에서 섹션별 표시 옵션 */
  exportOptions?: StrategyExportOptions;
}

export interface TopicSummary {
  topic: string;
  shortTopic: string;
  questionCount: number;
  totalPoints: number;
  percentage: number;
  difficulties: string[];
  types: string[];
  essayCount: number;
  essayNumbers: number[]; // 서술형 문항 번호들
  avgDifficulty: number;
  features: string[];
  questionNumbers: number[]; // 해당 단원의 문항 번호들
}

// 대단원 그룹핑 인터페이스
export interface ChapterGroup {
  chapterName: string;
  topics: TopicSummary[];
  questionCount: number;
  totalPoints: number;
  percentage: number;
  essayCount: number;
  essayNumbers: number[]; // 서술형 문항 번호들
  avgDifficulty: number;
  features: string[];
}
