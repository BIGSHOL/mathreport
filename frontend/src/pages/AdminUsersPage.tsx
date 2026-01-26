/**
 * 사용자 관리 페이지 (관리자 전용)
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/auth';
import { useNavigate } from 'react-router-dom';
import { adminService, type UserListItem } from '../services/admin';

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: '무료', color: 'bg-gray-100 text-gray-700' },
  basic: { label: '베이직', color: 'bg-blue-100 text-blue-700' },
  pro: { label: '프로', color: 'bg-purple-100 text-purple-700' },
};

export function AdminUsersPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 검색 및 페이징
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // 크레딧 수정 모달
  const [creditModal, setCreditModal] = useState<{
    isOpen: boolean;
    user: UserListItem | null;
    amount: string;
    reason: string;
  }>({
    isOpen: false,
    user: null,
    amount: '',
    reason: '',
  });

  // 요금제 수정 모달
  const [tierModal, setTierModal] = useState<{
    isOpen: boolean;
    user: UserListItem | null;
    tier: 'free' | 'basic' | 'pro';
  }>({
    isOpen: false,
    user: null,
    tier: 'free',
  });

  // 관리자 권한 체크
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/exams');
    }
  }, [user, navigate]);

  // 사용자 목록 로드
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminService.getUsers(page, pageSize, search || undefined);
      setUsers(response.data || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError('사용자 목록을 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  // 크레딧 수정
  const handleCreditSubmit = async () => {
    if (!creditModal.user) return;

    const amount = parseInt(creditModal.amount, 10);
    if (isNaN(amount) || amount === 0) {
      alert('유효한 크레딧 수량을 입력하세요.');
      return;
    }

    try {
      await adminService.updateCredits(creditModal.user.id, {
        amount,
        reason: creditModal.reason,
      });
      setCreditModal({ isOpen: false, user: null, amount: '', reason: '' });
      loadUsers();
    } catch (err) {
      alert('크레딧 수정에 실패했습니다.');
      console.error(err);
    }
  };

  // 요금제 수정
  const handleTierSubmit = async () => {
    if (!tierModal.user) return;

    try {
      await adminService.updateSubscription(tierModal.user.id, {
        tier: tierModal.tier,
      });
      setTierModal({ isOpen: false, user: null, tier: 'free' });
      loadUsers();
    } catch (err) {
      alert('요금제 수정에 실패했습니다.');
      console.error(err);
    }
  };

  // 활성 상태 토글
  const handleToggleActive = async (targetUser: UserListItem) => {
    if (!confirm(`${targetUser.nickname}님을 ${targetUser.is_active ? '비활성화' : '활성화'}하시겠습니까?`)) {
      return;
    }

    try {
      await adminService.toggleUserActive(targetUser.id);
      loadUsers();
    } catch (err) {
      alert('상태 변경에 실패했습니다.');
      console.error(err);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
        <p className="mt-1 text-sm text-gray-500">
          등록된 사용자의 크레딧과 요금제를 관리합니다. 현재 베타 서비스 기간입니다.
        </p>
      </div>

      {/* 검색 */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이메일 또는 닉네임 검색..."
            className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            검색
          </button>
        </div>
      </form>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {/* 테이블 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  요금제
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  크레딧
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  이번달 사용
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    로딩 중...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const tierInfo = TIER_LABELS[u.subscription_tier] || TIER_LABELS.free;
                  return (
                    <tr key={u.id} className={!u.is_active ? 'bg-gray-50 opacity-60' : ''}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{u.nickname}</span>
                              {u.is_superuser && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded">
                                  관리자
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${tierInfo.color}`}
                        >
                          {tierInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-semibold text-gray-900">{u.credits}</span>
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-gray-600">
                        분석 {u.monthly_analysis_count}회
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            u.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {u.is_active ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() =>
                              setCreditModal({
                                isOpen: true,
                                user: u,
                                amount: '',
                                reason: '',
                              })
                            }
                            className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                          >
                            크레딧
                          </button>
                          <button
                            onClick={() =>
                              setTierModal({
                                isOpen: true,
                                user: u,
                                tier: u.subscription_tier as 'free' | 'basic' | 'pro',
                              })
                            }
                            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                          >
                            요금제
                          </button>
                          {!u.is_superuser && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`px-2 py-1 text-xs rounded ${
                                u.is_active
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {u.is_active ? '비활성화' : '활성화'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              총 {total}명 중 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
              >
                이전
              </button>
              <span className="px-3 py-1 text-sm">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 크레딧 수정 모달 */}
      {creditModal.isOpen && creditModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              크레딧 수정 - {creditModal.user.nickname}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              현재 크레딧: <span className="font-semibold">{creditModal.user.credits}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  변경량 (양수: 추가, 음수: 차감)
                </label>
                <input
                  type="number"
                  value={creditModal.amount}
                  onChange={(e) =>
                    setCreditModal((m) => ({ ...m, amount: e.target.value }))
                  }
                  placeholder="예: 10 또는 -5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사유 (선택)
                </label>
                <input
                  type="text"
                  value={creditModal.reason}
                  onChange={(e) =>
                    setCreditModal((m) => ({ ...m, reason: e.target.value }))
                  }
                  placeholder="예: 베타 테스터 보상"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() =>
                  setCreditModal({ isOpen: false, user: null, amount: '', reason: '' })
                }
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleCreditSubmit}
                className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 요금제 수정 모달 */}
      {tierModal.isOpen && tierModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              요금제 수정 - {tierModal.user.nickname}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              현재 요금제:{' '}
              <span className="font-semibold">
                {TIER_LABELS[tierModal.user.subscription_tier]?.label || '무료'}
              </span>
            </p>
            <div className="space-y-2">
              {(['free', 'basic', 'pro'] as const).map((tier) => (
                <label
                  key={tier}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${
                    tierModal.tier === tier
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="tier"
                    value={tier}
                    checked={tierModal.tier === tier}
                    onChange={() => setTierModal((m) => ({ ...m, tier }))}
                    className="text-indigo-600"
                  />
                  <div>
                    <div className="font-medium">{TIER_LABELS[tier].label}</div>
                    <div className="text-xs text-gray-500">
                      {tier === 'free' && '주 5회 분석'}
                      {tier === 'basic' && '주 20회 분석'}
                      {tier === 'pro' && '무제한 분석'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setTierModal({ isOpen: false, user: null, tier: 'free' })}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleTierSubmit}
                className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
