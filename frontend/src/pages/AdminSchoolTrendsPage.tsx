/**
 * 학교별 출제 경향 관리 페이지 (관리자 전용)
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/auth';
import { useNavigate } from 'react-router-dom';
import {
  adminService,
  type SchoolTrendItem,
  type RegionSummaryItem,
} from '../services/admin';

// 난이도 라벨
const DIFFICULTY_LABELS: Record<string, string> = {
  concept: '개념',
  pattern: '유형',
  reasoning: '심화',
  creative: '최상위',
  low: '하',
  medium: '중',
  high: '상',
};

// 난이도 레벨 색상
const DIFFICULTY_LEVEL_COLORS: Record<string, string> = {
  상: 'bg-red-100 text-red-700',
  중상: 'bg-orange-100 text-orange-700',
  중: 'bg-yellow-100 text-yellow-700',
  하: 'bg-green-100 text-green-700',
};

export function AdminSchoolTrendsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // 상태
  const [trends, setTrends] = useState<SchoolTrendItem[]>([]);
  const [regions, setRegions] = useState<RegionSummaryItem[]>([]);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAggregating, setIsAggregating] = useState(false);

  // 필터
  const [searchSchool, setSearchSchool] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  // 페이지네이션
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  // 상세 보기 모달
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    trend: SchoolTrendItem | null;
  }>({
    isOpen: false,
    trend: null,
  });

  // 관리자 권한 체크
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/exams');
    }
  }, [user, navigate]);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [trendsRes, regionsRes, availableRegionsRes] = await Promise.all([
        adminService.getSchoolTrends({
          school_name: searchSchool || undefined,
          school_region: filterRegion || undefined,
          grade: filterGrade || undefined,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
        adminService.getRegionSummary(),
        adminService.getAvailableRegions(),
      ]);
      setTrends(trendsRes.data);
      setTotal(trendsRes.total);
      setRegions(regionsRes);
      setAvailableRegions(availableRegionsRes);
    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [searchSchool, filterRegion, filterGrade, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 집계 실행
  const handleAggregate = async () => {
    if (!confirm('학교별 출제 경향을 다시 집계하시겠습니까?\n시간이 소요될 수 있습니다.')) {
      return;
    }

    setIsAggregating(true);
    try {
      const result = await adminService.aggregateSchoolTrends();

      if (result.created === 0 && result.updated === 0) {
        alert(
          `집계 완료\n\n처리된 학교: ${result.total_schools_processed}개\n\n` +
          `⚠️ 집계된 데이터가 없습니다.\n\n` +
          `가능한 원인:\n` +
          `- 완료된 시험(status=completed)이 없음\n` +
          `- 학교명(school_name)이 입력되지 않은 시험만 존재\n` +
          `- 분석 결과가 없는 시험만 존재`
        );
      } else {
        alert(`집계 완료\n\n- 새로 생성: ${result.created}개\n- 업데이트: ${result.updated}개\n- 처리된 학교: ${result.total_schools_processed}개`);
        // 필터 초기화하고 첫 페이지로
        setSearchSchool('');
        setFilterRegion('');
        setFilterGrade('');
        setPage(1);
      }

      // 데이터 다시 로드
      await loadData();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || '알 수 없는 오류';
      alert(`집계에 실패했습니다.\n\n원인: ${detail}`);
      console.error(err);
    } finally {
      setIsAggregating(false);
    }
  };

  // 삭제
  const handleDelete = async (trend: SchoolTrendItem) => {
    if (!confirm(`${trend.school_name} (${trend.grade}) 경향 데이터를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await adminService.deleteSchoolTrend(trend.id);
      loadData();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || '알 수 없는 오류';
      alert(`삭제에 실패했습니다.\n\n원인: ${detail}`);
      console.error(err);
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">학교별 출제 경향</h1>
          <p className="text-gray-600 mt-1">
            시험 데이터를 학교/학년별로 집계하여 출제 경향을 분석합니다.
          </p>
        </div>
        <button
          onClick={handleAggregate}
          disabled={isAggregating}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAggregating ? '집계 중...' : '데이터 집계'}
        </button>
      </div>

      {/* 지역별 요약 */}
      {regions.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">지역별 현황</h3>
          <div className="flex flex-wrap gap-2">
            {regions.map((r) => (
              <button
                key={r.region}
                onClick={() => setFilterRegion(r.region === '미분류' ? '' : r.region)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  filterRegion === r.region
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {r.region} ({r.school_count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={searchSchool}
          onChange={(e) => setSearchSchool(e.target.value)}
          placeholder="학교명 검색..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">전체 지역</option>
          {availableRegions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
        <select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">전체 학년</option>
          <option value="중1">중1</option>
          <option value="중2">중2</option>
          <option value="중3">중3</option>
          <option value="고1">고1</option>
          <option value="고2">고2</option>
          <option value="고3">고3</option>
        </select>
        {(searchSchool || filterRegion || filterGrade) && (
          <button
            onClick={() => {
              setSearchSchool('');
              setFilterRegion('');
              setFilterGrade('');
              setPage(1);
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* 로딩 */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : trends.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {searchSchool || filterRegion || filterGrade
              ? '검색 조건에 맞는 데이터가 없습니다.'
              : '집계된 데이터가 없습니다.'}
          </p>
          {!searchSchool && !filterRegion && !filterGrade && (
            <p className="text-sm text-gray-400">
              &quot;데이터 집계&quot; 버튼을 눌러 시험 데이터를 집계하세요.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* 통계 */}
          <div className="mb-4 text-sm text-gray-600">
            총 {total}개 학교/학년 조합
          </div>

          {/* 테이블 */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    학교
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    학년
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    샘플 수
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    난이도
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    특성
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {trends.map((trend) => (
                  <tr key={trend.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {trend.school_name}
                      </div>
                      {trend.school_region && (
                        <div className="text-xs text-gray-500">
                          {trend.school_region}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {trend.grade}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {trend.sample_count}개
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${
                          DIFFICULTY_LEVEL_COLORS[trend.trend_summary.difficulty_level] ||
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {trend.trend_summary.difficulty_level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {trend.trend_summary.characteristics.slice(0, 2).map((c, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDetailModal({ isOpen: true, trend })}
                        className="px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        상세
                      </button>
                      <button
                        onClick={() => handleDelete(trend)}
                        className="px-2 py-1 text-xs text-red-600 hover:text-red-800 ml-2"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="text-sm text-gray-500">
                {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} / {total}건
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  이전
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-700">
                  {page} / {Math.ceil(total / PAGE_SIZE)}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(Math.ceil(total / PAGE_SIZE), p + 1))}
                  disabled={page >= Math.ceil(total / PAGE_SIZE)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 상세 모달 */}
      {detailModal.isOpen && detailModal.trend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {detailModal.trend.school_name} ({detailModal.trend.grade})
              </h3>
              <button
                onClick={() => setDetailModal({ isOpen: false, trend: null })}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* 기본 정보 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">지역</div>
                <div className="font-medium">{detailModal.trend.school_region || '-'}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">학교 유형</div>
                <div className="font-medium">{detailModal.trend.school_type || '-'}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">샘플 수</div>
                <div className="font-medium">{detailModal.trend.sample_count}개 시험</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">평균</div>
                <div className="font-medium">
                  {detailModal.trend.avg_question_count.toFixed(1)}문항 / {detailModal.trend.avg_total_points.toFixed(0)}점
                </div>
              </div>
            </div>

            {/* 난이도 분포 */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">난이도 분포</h4>
              <div className="flex gap-2">
                {detailModal.trend && Object.entries(detailModal.trend.difficulty_distribution).map(([key, value]) => (
                  <div key={key} className="flex-1 p-2 bg-gray-50 rounded text-center">
                    <div className="text-xs text-gray-500">{DIFFICULTY_LABELS[key] || key}</div>
                    <div className="font-bold text-gray-900">{value}</div>
                    {detailModal.trend?.difficulty_avg_points[key] && (
                      <div className="text-xs text-gray-400">
                        평균 {detailModal.trend.difficulty_avg_points[key]}점
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 문제 유형 분포 */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">문제 유형 분포</h4>
              <div className="flex gap-2">
                {Object.entries(detailModal.trend.question_type_distribution).map(([key, value]) => (
                  <div key={key} className="px-3 py-2 bg-blue-50 rounded">
                    <span className="text-sm text-blue-700">{key}</span>
                    <span className="ml-2 font-bold text-blue-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 단원 분포 */}
            {Object.keys(detailModal.trend.chapter_distribution).length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">단원별 출제 빈도</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(detailModal.trend.chapter_distribution)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([key, value]) => (
                      <div key={key} className="px-3 py-1 bg-purple-50 rounded text-sm">
                        <span className="text-purple-700">{key}</span>
                        <span className="ml-1 font-bold text-purple-900">{value}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 출제 특성 */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">출제 특성</h4>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    DIFFICULTY_LEVEL_COLORS[detailModal.trend.trend_summary.difficulty_level] ||
                    'bg-gray-100 text-gray-700'
                  }`}>
                    난이도 {detailModal.trend.trend_summary.difficulty_level}
                  </span>
                </div>
                {detailModal.trend.trend_summary.characteristics.length > 0 && (
                  <ul className="text-sm text-indigo-900 space-y-1">
                    {detailModal.trend.trend_summary.characteristics.map((c, i) => (
                      <li key={i}>• {c}</li>
                    ))}
                  </ul>
                )}
                {detailModal.trend.trend_summary.focus_areas.length > 0 && (
                  <div className="mt-2 text-sm text-indigo-700">
                    <strong>주요 출제 단원:</strong> {detailModal.trend.trend_summary.focus_areas.join(', ')}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setDetailModal({ isOpen: false, trend: null })}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
