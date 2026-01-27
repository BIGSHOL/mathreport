/**
 * GradeConnectionsSection - 학년별 연계 경고 섹션
 *
 * 선수학습이 중요한 단원들을 대단원별로 그룹핑하여 표시합니다.
 * - 대단원별 분류 (지수와 로그, 삼각함수, 수열 등)
 * - 필수/중요/권장 연계 구분
 * - 접이식 UI로 상세 정보 제공
 */
import { memo, useState } from 'react';
import type { GradeConnection } from '../../../data/curriculumStrategies';
import type { TopicSummary } from './types';

interface GradeConnectionsSectionProps {
  gradeConnections: Map<string, GradeConnection[]>;
  topicSummaries: TopicSummary[];
}

export const GradeConnectionsSection = memo(function GradeConnectionsSection({
  gradeConnections,
}: GradeConnectionsSectionProps) {
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());
  const [expandedConnectionImportance, setExpandedConnectionImportance] = useState<Map<string, Set<string>>>(new Map());

  const toggleConnection = (topic: string) => {
    setExpandedConnections((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  const toggleConnectionImportance = (topic: string, importance: string) => {
    setExpandedConnectionImportance((prev) => {
      const next = new Map(prev);
      const topicSet = next.get(topic) || new Set<string>();
      const newTopicSet = new Set(topicSet);

      if (newTopicSet.has(importance)) {
        newTopicSet.delete(importance);
      } else {
        newTopicSet.add(importance);
      }

      next.set(topic, newTopicSet);
      return next;
    });
  };

  // 대단원 분류 함수
  const getMajorUnit = (topic: string): string => {
    const t = topic.toLowerCase();
    if (t.includes('지수') || t.includes('로그')) return '지수와 로그';
    if (t.includes('삼각함수') || t.includes('삼각비') || t.includes('호도법') || t.includes('부채꼴') || t.includes('사인') || t.includes('코사인')) return '삼각함수';
    if (t.includes('수열') || t.includes('급수') || t.includes('점화식') || t.includes('등차') || t.includes('등비')) return '수열';
    if (t.includes('함수') || t.includes('합성') || t.includes('역함수')) return '함수';
    if (t.includes('극한') || t.includes('연속')) return '극한과 연속';
    if (t.includes('미분') || t.includes('도함수')) return '미분';
    if (t.includes('적분')) return '적분';
    if (t.includes('확률') || t.includes('순열') || t.includes('조합')) return '확률과 통계';
    if (t.includes('벡터') || t.includes('평면')) return '벡터';
    if (t.includes('행렬')) return '행렬';
    if (t.includes('방정식') || t.includes('부등식')) return '방정식과 부등식';
    if (t.includes('집합') || t.includes('명제')) return '집합과 명제';
    return '기타';
  };

  // 연계가 없으면 렌더링하지 않음
  if (gradeConnections.size === 0) return null;

  // 대단원별로 그루핑
  const groupedByMajor = new Map<string, Array<{ topic: string; connections: GradeConnection[] }>>();
  Array.from(gradeConnections.entries()).forEach(([topic, connections]) => {
    const majorUnit = getMajorUnit(topic);
    if (!groupedByMajor.has(majorUnit)) {
      groupedByMajor.set(majorUnit, []);
    }
    groupedByMajor.get(majorUnit)!.push({ topic, connections });
  });

  // 필수 연계 개수가 많은 순으로 정렬
  const sortedGroups = Array.from(groupedByMajor.entries()).sort((a, b) => {
    const aCritical = a[1].reduce((sum, item) => sum + item.connections.filter(c => c.importance === 'critical').length, 0);
    const bCritical = b[1].reduce((sum, item) => sum + item.connections.filter(c => c.importance === 'critical').length, 0);
    return bCritical - aCritical;
  });

  const totalCritical = Array.from(gradeConnections.values()).flat().filter(c => c.importance === 'critical').length;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">학년별 연계 경고</h3>
              <p className="text-xs text-gray-600">선수학습이 중요한 단원 (대단원별)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{sortedGroups.length}개 단원</span>
            {totalCritical > 0 && (
              <span className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded">
                필수 {totalCritical}개
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {sortedGroups.map(([majorUnit, items]) => {
          const isExpanded = expandedConnections.has(majorUnit);
          const criticalCount = items.reduce((sum, item) => sum + item.connections.filter((c: GradeConnection) => c.importance === 'critical').length, 0);
          const totalCount = items.reduce((sum, item) => sum + item.connections.length, 0);

          return (
            <div key={`major-${majorUnit}`}>
              <button
                onClick={() => toggleConnection(majorUnit)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-orange-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${criticalCount > 0 ? 'bg-red-500' : 'bg-orange-400'}`} />
                  <span className="font-medium text-gray-900">{majorUnit}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {items.length}개 소단원
                  </span>
                  {criticalCount > 0 && (
                    <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                      필수 {criticalCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-orange-600">연계 {totalCount}개</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 bg-orange-50 space-y-2">
                  {items.map(({ topic, connections }) => {
                    const shortTopic = topic.split(' > ').pop() || topic;
                    const topicCritical = connections.filter((c: GradeConnection) => c.importance === 'critical').length;
                    const topicImportanceSet = expandedConnectionImportance.get(topic) || new Set<string>();
                    const isTopicExpanded = topicImportanceSet.has('detail');

                    return (
                      <div key={`topic-${topic}`} className="bg-white rounded-lg border border-orange-200 overflow-hidden">
                        <button
                          onClick={() => toggleConnectionImportance(topic, 'detail')}
                          className="w-full px-3 py-2 flex items-center justify-between hover:bg-orange-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${topicCritical > 0 ? 'bg-red-400' : 'bg-orange-300'}`} />
                            <span className="text-sm font-medium text-gray-800">{shortTopic}</span>
                            {topicCritical > 0 && (
                              <span className="text-[10px] text-red-600 bg-red-50 px-1 py-0.5 rounded">필수</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{connections.length}개</span>
                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform ${isTopicExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {isTopicExpanded && (
                          <div className="px-3 pb-3 space-y-2 border-t border-orange-100">
                            {connections.slice(0, 3).map((conn: GradeConnection, i: number) => (
                              <div key={i} className={`p-2 rounded text-xs ${
                                conn.importance === 'critical' ? 'bg-red-50 border-l-2 border-red-400' :
                                conn.importance === 'high' ? 'bg-orange-50 border-l-2 border-orange-400' :
                                'bg-yellow-50 border-l-2 border-yellow-400'
                              }`}>
                                <div className="flex items-center gap-1 mb-1">
                                  <span className={`px-1 py-0.5 rounded text-[9px] font-bold text-white ${
                                    conn.importance === 'critical' ? 'bg-red-500' :
                                    conn.importance === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                                  }`}>
                                    {conn.importance === 'critical' ? '필수' : conn.importance === 'high' ? '중요' : '권장'}
                                  </span>
                                  <span className="text-gray-600">{conn.fromGrade} → {conn.toGrade}</span>
                                </div>
                                <p className="text-gray-700 line-clamp-2">{conn.warning}</p>
                              </div>
                            ))}
                            {connections.length > 3 && (
                              <p className="text-[10px] text-gray-500 text-center">+{connections.length - 3}개 더...</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
