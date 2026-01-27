/**
 * StudyStrategyTab 관련 타입 정의
 */
import type { QuestionAnalysis } from '../../../services/analysis';

export interface StudyStrategyTabProps {
  questions: QuestionAnalysis[];
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
  avgDifficulty: number;
  features: string[];
}
