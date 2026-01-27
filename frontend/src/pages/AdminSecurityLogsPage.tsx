/**
 * 보안 로그 관리 페이지 (관리자 전용)
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/auth';
import { useNavigate } from 'react-router-dom';
import {
  adminService,
  type SecurityLogItem,
  type SecurityLogStats,
} from '../services/admin';

// 로그 타입별 설정
const LOG_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  auth_failure: { label: '인증 실패', color: 'bg-yellow-100 text-yellow-800', icon: '🔐' },
  api_error: { label: 'API 오류', color: 'bg-red-100 text-red-800', icon: '⚠️' },
  security_alert: { label: '보안 경고', color: 'bg-purple-100 text-purple-800', icon: '🚨' },
};

// 심각도별 설정
const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  warning: { label: '경고', color: 'bg-yellow-100 text-yellow-700' },
  error: { label: '오류', color: 'bg-red-100 text-red-700' },
  critical: { label: '심각', color: 'bg-red-200 text-red-900' },
};

// 날짜 포맷팅
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const month = kstDate.getUTCMonth() + 1;
  const day = kstDate.getUTCDate();
  const hours = kstDate.getUTCHours().toString().padStart(2, '0');
  const minutes = kstDate.getUTCMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

export function AdminSecurityLogsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<SecurityLogItem[]>([]);
  const [stats, setStats] = useState<SecurityLogStats | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 필터
  const [logTypeFilter, setLogTypeFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [ipFilter, setIpFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 30;

  // 상세 보기 모달
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    log: SecurityLogItem | null;
  }>({
    isOpen: false,
    log: null,
  });

  // 관리자 권한 확인
  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // 통계 로드
  const loadStats = useCallback(async () => {
    try {
      const data = await adminService.getSecurityLogStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  // 로그 로드
  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * pageSize;
      const data = await adminService.getSecurityLogs({
        log_type: logTypeFilter || undefined,
        severity: severityFilter || undefined,
        ip_address: ipFilter || undefined,
        limit: pageSize,
        offset,
      });
      setLogs(data.logs);
      setTotal(data.total);
      setHasMore(data.has_more);
    } catch (err) {
      setError('로그를 불러오는데 실패했습니다.');
      console.error('Failed to load logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, logTypeFilter, severityFilter, ipFilter]);

  useEffect(() => {
    loadStats();
    loadLogs();
  }, [loadStats, loadLogs]);

  // 오래된 로그 정리
  const handleClearOldLogs = async (days: number) => {
    if (!confirm(`${days}일 이전의 로그를 삭제하시겠습니까?`)) return;

    try {
      const result = await adminService.clearOldSecurityLogs(days);
      alert(result.message);
      loadLogs();
      loadStats();
    } catch (err) {
      alert('로그 정리에 실패했습니다.');
      console.error(err);
    }
  };

  // 개별 로그 삭제
  const handleDeleteLog = async (logId: string) => {
    if (!confirm('이 로그를 삭제하시겠습니까?')) return;

    try {
      await adminService.deleteSecurityLog(logId);
      loadLogs();
      loadStats();
    } catch (err) {
      alert('삭제에 실패했습니다.');
      console.error(err);
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">보안 로그</h1>
            <p className="text-sm text-gray-500 mt-1">
              인증 실패, API 오류, 보안 경고 모니터링
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleClearOldLogs(7)}
              className="px-3 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
            >
              7일 이전 정리
            </button>
            <button
              onClick={() => handleClearOldLogs(30)}
              className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              30일 이전 정리
            </button>
          </div>
        </div>

        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">인증 실패 (전체)</div>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.total_auth_failures}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">API 오류 (전체)</div>
              <div className="text-2xl font-bold text-red-600">
                {stats.total_api_errors}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">보안 경고 (전체)</div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.total_security_alerts}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">인증 실패 (24시간)</div>
              <div className="text-2xl font-bold text-orange-600">
                {stats.auth_failures_24h}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">API 오류 (24시간)</div>
              <div className="text-2xl font-bold text-pink-600">
                {stats.api_errors_24h}
              </div>
            </div>
          </div>
        )}

        {/* Top IP / Users / Endpoints */}
        {stats && (stats.top_failing_ips.length > 0 || stats.top_failing_users?.length > 0 || stats.top_failing_endpoints.length > 0) && (
          <div className="grid md:grid-cols-3 gap-4">
            {stats.top_failing_ips.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Top 실패 IP</h3>
                <div className="space-y-2">
                  {stats.top_failing_ips.slice(0, 5).map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="font-mono text-gray-600">{item.ip}</span>
                      <span className="text-red-600 font-semibold">
                        {item.count}회
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {stats.top_failing_users?.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Top 실패 사용자</h3>
                <div className="space-y-2">
                  {stats.top_failing_users.slice(0, 5).map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-600 truncate max-w-[150px]">{item.email}</span>
                      <span className="text-red-600 font-semibold">
                        {item.count}회
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {stats.top_failing_endpoints.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-700 mb-3">
                  Top 오류 엔드포인트
                </h3>
                <div className="space-y-2">
                  {stats.top_failing_endpoints.slice(0, 5).map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="font-mono text-gray-600 truncate max-w-[200px]">
                        {item.endpoint}
                      </span>
                      <span className="text-red-600 font-semibold">
                        {item.count}회
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">로그 타입</label>
              <select
                value={logTypeFilter}
                onChange={(e) => {
                  setLogTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">전체</option>
                <option value="auth_failure">인증 실패</option>
                <option value="api_error">API 오류</option>
                <option value="security_alert">보안 경고</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">심각도</label>
              <select
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
                  setPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">전체</option>
                <option value="warning">경고</option>
                <option value="error">오류</option>
                <option value="critical">심각</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">IP 주소</label>
              <input
                type="text"
                value={ipFilter}
                onChange={(e) => {
                  setIpFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="IP 검색"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40"
              />
            </div>
            <div className="flex items-end">
              <span className="text-sm text-gray-500">총 {total}건</span>
            </div>
          </div>
        </div>

        {/* 로그 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : isLoading ? (
            <div className="p-8 text-center text-gray-500">로딩 중...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              로그가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      시간
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      타입
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      심각도
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      사용자
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      IP
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      엔드포인트
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      메시지
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => {
                    const typeConfig =
                      LOG_TYPE_CONFIG[log.log_type] || LOG_TYPE_CONFIG.api_error;
                    const sevConfig =
                      SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.warning;

                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${typeConfig.color}`}
                          >
                            {typeConfig.icon} {typeConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${sevConfig.color}`}
                          >
                            {sevConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs truncate max-w-[150px]">
                          {log.email || '-'}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-600 text-xs">
                          {log.ip_address || '-'}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-600 text-xs truncate max-w-[150px]">
                          {log.method && (
                            <span className="text-blue-600 mr-1">
                              {log.method}
                            </span>
                          )}
                          {log.endpoint || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">
                          {log.error_message || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() =>
                                setDetailModal({ isOpen: true, log })
                              }
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                            >
                              상세
                            </button>
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {total > pageSize && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
            >
              이전
            </button>
            <span className="px-4 py-2 text-gray-600">
              {page} / {Math.ceil(total / pageSize)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 상세 보기 모달 */}
      {detailModal.isOpen && detailModal.log && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">로그 상세</h3>
              <button
                onClick={() => setDetailModal({ isOpen: false, log: null })}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">시간:</span>
                  <span className="ml-2 font-medium">
                    {formatDate(detailModal.log.created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">타입:</span>
                  <span className="ml-2 font-medium">
                    {LOG_TYPE_CONFIG[detailModal.log.log_type]?.label}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">심각도:</span>
                  <span className="ml-2 font-medium">
                    {SEVERITY_CONFIG[detailModal.log.severity]?.label}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">IP:</span>
                  <span className="ml-2 font-mono">
                    {detailModal.log.ip_address || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">이메일:</span>
                  <span className="ml-2">{detailModal.log.email || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">사용자 ID:</span>
                  <span className="ml-2 font-mono text-xs">
                    {detailModal.log.user_id || '-'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-gray-500 text-sm">엔드포인트:</span>
                <div className="mt-1 p-2 bg-gray-100 rounded font-mono text-sm">
                  {detailModal.log.method}{' '}
                  {detailModal.log.endpoint || '-'}
                </div>
              </div>

              <div>
                <span className="text-gray-500 text-sm">오류 메시지:</span>
                <div className="mt-1 p-2 bg-red-50 rounded text-sm text-red-700">
                  {detailModal.log.error_message || '-'}
                </div>
              </div>

              {detailModal.log.user_agent && (
                <div>
                  <span className="text-gray-500 text-sm">User Agent:</span>
                  <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono break-all">
                    {detailModal.log.user_agent}
                  </div>
                </div>
              )}

              {detailModal.log.details && (
                <div>
                  <span className="text-gray-500 text-sm">상세 정보:</span>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono overflow-x-auto">
                    {JSON.stringify(detailModal.log.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
