/**
 * 과목 감지 및 데이터 접근 유틸리티
 *
 * 토픽에서 과목을 추론하고 해당 과목의 데이터를 반환합니다.
 * 현재는 수학만 활성화되어 있으며, 영어는 향후 지원 예정입니다.
 */

// 수학 데이터 (현재 활성)
import {
  findGradeConnections,
  findKillerPatterns,
  KILLER_QUESTION_TYPES,
  GRADE_CONNECTIONS,
} from './curriculumStrategies';

/**
 * 지원 과목 타입
 */
export type Subject = '수학' | '영어';

/**
 * 영어 관련 키워드 (토픽에서 과목 추론용)
 */
const ENGLISH_KEYWORDS = [
  '영어', 'english', '문법', 'grammar', '어휘', 'vocabulary',
  '독해', 'reading', '듣기', 'listening', '빈칸', '추론',
  'be동사', '일반동사', '시제', '조동사', 'to부정사', '동명사',
  '관계대명사', '관계부사', '분사', '가정법', '수동태',
  '비교급', '최상급', '접속사', '현재완료', '과거완료',
];

/**
 * 토픽 목록에서 과목 추론
 */
export function detectSubjectFromTopics(topics: string[]): Subject {
  const topicsJoined = topics.join(' ').toLowerCase();

  for (const keyword of ENGLISH_KEYWORDS) {
    if (topicsJoined.includes(keyword.toLowerCase())) {
      return '영어';
    }
  }

  return '수학'; // 기본값
}

/**
 * 단일 토픽에서 과목 추론
 */
export function detectSubjectFromTopic(topic: string): Subject {
  return detectSubjectFromTopics([topic]);
}

/**
 * 과목별 학년 연계 검색
 * 현재: 수학만 지원, 영어는 향후 지원 예정
 */
export function findGradeConnectionsBySubject(topic: string, _subject?: Subject) {
  // 향후 영어 지원 시:
  // if (subject === '영어') {
  //   return findEnglishGradeConnections(topic);
  // }
  return findGradeConnections(topic);
}

/**
 * 과목별 킬러 패턴 검색
 * 현재: 수학만 지원, 영어는 향후 지원 예정
 */
export function findKillerPatternsBySubject(topic: string, _subject?: Subject) {
  // 향후 영어 지원 시:
  // if (subject === '영어') {
  //   return findEnglishKillerPatterns(topic);
  // }
  return findKillerPatterns(topic);
}

/**
 * 과목별 전체 킬러 패턴 조회
 * 현재: 수학만 지원, 영어는 향후 지원 예정
 */
export function getAllKillerPatternsBySubject(_subject?: Subject) {
  // 향후 영어 지원 시:
  // if (subject === '영어') {
  //   return ENGLISH_KILLER_PATTERNS;
  // }
  return KILLER_QUESTION_TYPES;
}

/**
 * 과목별 전체 학년 연계 조회
 * 현재: 수학만 지원, 영어는 향후 지원 예정
 */
export function getAllGradeConnectionsBySubject(_subject?: Subject) {
  // 향후 영어 지원 시:
  // if (subject === '영어') {
  //   return ENGLISH_GRADE_CONNECTIONS;
  // }
  return GRADE_CONNECTIONS;
}

/**
 * 과목 지원 여부 확인
 * 현재: 수학만 활성화
 */
export function isSubjectSupported(subject: Subject): boolean {
  return subject === '수학';
  // 향후: return true;
}
