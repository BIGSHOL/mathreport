/**
 * 교육과정 전략 매칭 유틸리티
 * 토픽 키워드 기반으로 학습 전략을 찾습니다.
 */

import type { TopicStrategy } from './types';
import { MIDDLE_SCHOOL_CURRICULUM, HIGH_SCHOOL_CURRICULUM } from '../curriculumStrategies';

/**
 * 토픽 문자열과 매칭되는 전략 찾기
 * 키워드 기반 점수 시스템으로 최적의 전략 반환
 */
export function findMatchingStrategies(topic: string, grade?: string): TopicStrategy | null {
  if (!topic) return null;

  const topicLower = topic.toLowerCase();
  const allCurriculums = [...MIDDLE_SCHOOL_CURRICULUM, ...HIGH_SCHOOL_CURRICULUM];

  // 학년 필터링 (제공된 경우)
  const filteredCurriculums = grade
    ? allCurriculums.filter(c => c.grade.includes(grade.replace(/학년|학기/g, '').trim().slice(0, 2)))
    : allCurriculums;

  // 매칭 결과 수집 (키워드 길이 기반 점수)
  let bestMatch: { strategy: TopicStrategy; score: number } | null = null;

  for (const curriculum of filteredCurriculums) {
    for (const unit of curriculum.units) {
      for (const topicStrategy of unit.topics) {
        // 키워드 매칭 점수 계산
        let score = 0;
        for (const keyword of topicStrategy.keywords) {
          // 너무 짧은 키워드(2자 이하)는 완전 매칭 필요
          if (keyword.length <= 2) {
            // 단어 경계 확인 (한글은 공백/특수문자 기준)
            const regex = new RegExp(`(^|[\\s>])${keyword}($|[\\s>])`, 'i');
            if (regex.test(topic) || topic === keyword) {
              score += keyword.length * 2; // 정확 매칭 보너스
            }
          } else {
            // 긴 키워드는 부분 매칭 허용
            if (topicLower.includes(keyword.toLowerCase()) || topic.includes(keyword)) {
              score += keyword.length;
            }
          }
        }

        // 더 높은 점수의 매칭 선택
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { strategy: topicStrategy, score };
        }
      }
    }
  }

  if (bestMatch) {
    return bestMatch.strategy;
  }

  // 학년 필터 없이 전체 검색 (폴백)
  if (grade) {
    return findMatchingStrategies(topic);
  }

  return null;
}

/**
 * 여러 토픽에서 전략 배열 추출
 */
export function getStrategiesForTopics(topics: string[], grade?: string): string[] {
  const strategiesSet = new Set<string>();

  for (const topic of topics) {
    const match = findMatchingStrategies(topic, grade);
    if (match) {
      match.strategies.forEach(s => strategiesSet.add(s));
    }
  }

  return Array.from(strategiesSet).slice(0, 5);
}
