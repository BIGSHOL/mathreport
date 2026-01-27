/**
 * 교육과정 데이터 유틸리티 함수
 */

/**
 * 단원명이 충분히 유사한지 판별 (너무 짧은 부분 문자열 매칭 방지)
 * - 매칭 대상이 2글자 이하면 정확히 일치하거나 "~의", "~와" 등 조사가 붙은 경우만 허용
 * - 3글자 이상이면 부분 문자열 매칭 허용
 */
export function isTopicMatch(topic: string, target: string): boolean {
  const tLower = topic.toLowerCase().trim();
  const gLower = target.toLowerCase().trim();

  // 정확히 일치
  if (tLower === gLower) return true;

  // 짧은 대상(2글자 이하, 예: "실수")은 단어 경계 매칭
  if (gLower.length <= 2) {
    // "실수의 대소 관계"에서 "실수" 매칭: "실수"로 시작하고 뒤에 조사/공백이 오는 경우
    const idx = tLower.indexOf(gLower);
    if (idx === -1) return false;
    // 시작 위치이거나 앞이 공백인 경우만
    if (idx !== 0 && tLower[idx - 1] !== ' ') return false;
    // 뒤에 아무것도 없거나 조사("의", "와", "과", "에", " ")가 오는 경우
    const afterIdx = idx + gLower.length;
    if (afterIdx >= tLower.length) return true;
    const nextChar = tLower[afterIdx];
    return ['의', '와', '과', '에', ' ', '·', ',', '('].includes(nextChar);
  }

  // 3글자 이상이면 부분 문자열 매칭 허용
  return tLower.includes(gLower) || gLower.includes(tLower);
}

/**
 * 시험 결과 기반 수준 추정
 * @param correctRate 정답률 (0~100)
 */
export function estimateLevel(correctRate: number): '하위권' | '중위권' | '상위권' {
  if (correctRate >= 80) return '상위권';
  if (correctRate >= 50) return '중위권';
  return '하위권';
}

/**
 * 학년 기반 멘트 필터링 (중학생/고등학생 맞춤)
 * @param messages 원본 멘트 배열
 * @param grade 학년 (예: '중1', '고2')
 */
export function filterMessagesByGrade(messages: string[], grade: string): string[] {
  const isMiddleSchool = grade.startsWith('중');

  return messages.map(msg => {
    // 고등학교 관련 멘트를 중학생에게 맞게 수정
    if (isMiddleSchool) {
      return msg
        .replace(/고등학교 3년/g, '중고등학교 시절')
        .replace(/고등학교 수학/g, '고등학교 진학 후 수학')
        .replace(/대학/g, '고등학교')
        .replace(/수능/g, '고입/내신');
    }
    return msg;
  });
}
