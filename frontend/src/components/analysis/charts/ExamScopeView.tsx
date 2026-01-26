/**
 * Exam Scope View - 시험범위 분석 (컴팩트 버전)
 *
 * Vercel React Best Practices:
 * - 6.3 Hoist Static Data: 색상 상수를 tokens.ts에서 임포트
 */
import { memo, useMemo } from 'react';
import type { QuestionAnalysis } from '../../../services/analysis';
import { SUBJECT_COLORS } from '../../../styles/tokens';

interface ExamScopeViewProps {
  questions: QuestionAnalysis[];
}

// 2022 개정 교육과정 전체 범위
const CURRICULUM: Record<string, string[]> = {
  // 공통 과목
  '공통수학1': ['다항식', '방정식과 부등식', '경우의 수', '행렬'],
  '공통수학2': ['도형의 방정식', '집합과 명제', '함수와 그래프'],
  // 일반 선택 과목
  '대수': ['지수함수와 로그함수', '삼각함수', '수열'],
  '미적분I': ['함수의 극한과 연속', '미분', '적분'],
  '확률과통계': ['경우의 수', '확률', '통계'],
  // 진로 선택 과목
  '미적분II': ['수열의 극한', '여러 가지 미분법', '여러 가지 적분법'],
  '기하': ['이차곡선', '평면벡터', '공간도형과 공간좌표'],
};

export const ExamScopeView = memo(function ExamScopeView({
  questions,
}: ExamScopeViewProps) {
  const { coverage, coveredSubjects } = useMemo(() => {
    // 출제된 토픽 수집
    const subjectMap = new Map<string, { count: number; points: number; units: Map<string, { count: number; points: number }> }>();

    questions.forEach((q) => {
      if (!q.topic) return;

      const parts = q.topic.split(' > ');
      const subject = parts[0];
      const unit = parts[1] || '기타';

      const entry = subjectMap.get(subject) || { count: 0, points: 0, units: new Map() };
      entry.count += 1;
      entry.points += q.points || 0;

      const unitEntry = entry.units.get(unit) || { count: 0, points: 0 };
      unitEntry.count += 1;
      unitEntry.points += q.points || 0;
      entry.units.set(unit, unitEntry);

      subjectMap.set(subject, entry);
    });

    // 커버리지 계산
    let totalUnits = 0;
    let covered = 0;
    Object.entries(CURRICULUM).forEach(([subject, units]) => {
      totalUnits += units.length;
      const subjectEntry = subjectMap.get(subject);
      if (subjectEntry) {
        units.forEach((unit) => {
          if (subjectEntry.units.has(unit)) {
            covered += 1;
          }
        });
      }
    });

    const coveredSubjects = Array.from(subjectMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        points: data.points,
        units: Array.from(data.units.entries()).map(([unitName, unitData]) => ({
          name: unitName,
          count: unitData.count,
          points: unitData.points,
        })).sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      coverage: totalUnits > 0 ? Math.round((covered / totalUnits) * 100) : 0,
      coveredSubjects,
    };
  }, [questions]);

  const totalUnits = coveredSubjects.reduce((sum, s) => sum + s.units.length, 0);

  if (coveredSubjects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">
        출제 범위 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-base font-semibold text-gray-900 mb-3">
        시험범위 분석
      </h3>

      {/* 요약 통계 - 컴팩트 인라인 */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-gray-500">출제 과목</span>
          <span className="font-bold text-indigo-600">{coveredSubjects.length}개</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">출제 단원</span>
          <span className="font-bold text-green-600">{totalUnits}개</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">커버리지</span>
          <span className="font-bold text-yellow-600">{coverage}%</span>
        </div>
      </div>

      {/* 출제된 과목/단원만 표시 - 컴팩트 테이블 */}
      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">과목</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">단원</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600 w-16">문항</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600 w-20 whitespace-nowrap">배점</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {coveredSubjects.map((subject) => (
              subject.units.map((unit, unitIdx) => (
                <tr key={`${subject.name}-${unit.name}`} className="hover:bg-gray-50">
                  {unitIdx === 0 ? (
                    <td
                      className="px-3 py-2 font-medium"
                      rowSpan={subject.units.length}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: SUBJECT_COLORS[subject.name] || '#6b7280' }}
                        />
                        {subject.name}
                      </div>
                    </td>
                  ) : null}
                  <td className="px-3 py-2 text-gray-700">{unit.name}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{unit.count}</td>
                  <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">{Number(unit.points.toFixed(1))}점</td>
                </tr>
              ))
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-medium">
            <tr>
              <td className="px-3 py-2" colSpan={2}>합계</td>
              <td className="px-3 py-2 text-right">
                {coveredSubjects.reduce((sum, s) => sum + s.count, 0)}
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                {Number(coveredSubjects.reduce((sum, s) => sum + s.points, 0).toFixed(1))}점
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
});
