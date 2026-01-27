/**
 * User profile page component.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import authService from '../services/auth';
import subscriptionService, {
    type UsageStatus,
    type CreditLogItem,
} from '../services/subscription';
import type { TemplateType } from '../types/auth';

// 액션 타입별 라벨 및 스타일
const ACTION_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
    analysis: { label: '분석', color: 'bg-blue-100 text-blue-700' },
    extended: { label: '확장 분석', color: 'bg-purple-100 text-purple-700' },
    export: { label: '내보내기', color: 'bg-orange-100 text-orange-700' },
    purchase: { label: '구매', color: 'bg-green-100 text-green-700' },
    admin: { label: '관리자', color: 'bg-gray-100 text-gray-700' },
    expire: { label: '만료', color: 'bg-red-100 text-red-700' },
    reward: { label: '보상', color: 'bg-emerald-100 text-emerald-700' },
};

// 날짜 포맷팅
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    // 한국 시간(KST, UTC+9)으로 변환
    const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    const month = kstDate.getUTCMonth() + 1;
    const day = kstDate.getUTCDate();
    const hours = kstDate.getUTCHours().toString().padStart(2, '0');
    const minutes = kstDate.getUTCMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
}

// 초기화까지 남은 시간 계산
function getTimeUntilReset(nextResetAt: string): string {
    const now = new Date();
    const reset = new Date(nextResetAt);
    const diffMs = reset.getTime() - now.getTime();
    if (diffMs <= 0) return '0일 0시간';
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${diffDays}일 ${diffHours}시간`;
}

const TEMPLATE_OPTIONS: Array<{ id: TemplateType; name: string; icon: string; description: string }> = [
  { id: 'detailed', name: '상세 분석', icon: '📊', description: '모든 정보를 표시하는 기본 레이아웃' },
  { id: 'summary', name: '요약 카드', icon: '📋', description: '핵심 지표만 카드 형태로 표시' },
  { id: 'parent', name: '부모용', icon: '👨‍👩‍👧', description: '쉬운 언어로 개선 방향 중심 표시' },
  { id: 'print', name: '프린트', icon: '🖨️', description: '인쇄에 최적화된 흑백 레이아웃' },
];

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, fetchUser } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    nickname: '',
  });

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('detailed');

  // 구독/사용량 관련 상태
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<CreditLogItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({ nickname: user.nickname || '' });
      setSelectedTemplate(user.preferred_template || 'detailed');
      // 사용량 로드
      subscriptionService.getUsage().then(setUsage).catch(console.error);
    }
  }, [user]);

  const loadHistory = async (reset: boolean = false) => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const offset = reset ? 0 : historyLogs.length;
      const response = await subscriptionService.getCreditHistory(10, offset);
      if (reset) {
        setHistoryLogs(response.logs);
      } else {
        setHistoryLogs(prev => [...prev, ...response.logs]);
      }
      setHistoryTotal(response.total);
      setHistoryHasMore(response.has_more);
    } catch (error) {
      console.error('Failed to load credit history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleToggleHistory = () => {
    if (!showHistory && historyLogs.length === 0) {
      loadHistory(true);
    }
    setShowHistory(!showHistory);
  };

  const handleTemplateChange = async (template: TemplateType) => {
    setIsLoading(true);
    try {
      await authService.updatePreferredTemplate(template);
      setSelectedTemplate(template);
      await fetchUser();
      setMessage({ type: 'success', text: '기본 템플릿이 변경되었습니다' });
    } catch {
      setMessage({ type: 'error', text: '템플릿 변경 실패' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await authService.updateProfile({ nickname: formData.nickname });
      await fetchUser();
      setIsEditing(false);
      setMessage({ type: 'success', text: '프로필이 성공적으로 업데이트되었습니다' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message :
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '프로필 업데이트 실패';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsLoading(true);
    try {
      await authService.deleteAccount();
      navigate('/login');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message :
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '계정 삭제 실패';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">프로필</h1>

        {message.text && (
          <div
            className={`mb-6 rounded-md p-4 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile Info */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">계정 정보</h2>

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">

              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">
                  닉네임
                </label>
                <input
                  id="nickname"
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ nickname: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? '저장 중...' : '저장'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">이메일</label>
                <p className="mt-1 text-gray-900">{user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">닉네임</label>
                <p className="mt-1 text-gray-900">{user.nickname || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">가입일</label>
                <p className="mt-1 text-gray-900">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                프로필 수정
              </button>
            </div>
          )}
        </div>

        {/* 구독 & 사용량 */}
        {usage && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">구독 & 사용량</h2>
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-center gap-6 text-center">
                <div>
                  <span className="text-xs text-indigo-600">플랜</span>
                  <p className="text-lg font-bold text-indigo-900 capitalize">{usage.tier}</p>
                </div>
                <div className="h-8 w-px bg-indigo-200 hidden sm:block" />
                <div>
                  <span className="text-xs text-indigo-600">기본 분석</span>
                  <p className="text-lg font-bold text-indigo-900">
                    {usage.weekly_analysis_used}/{usage.weekly_analysis_limit === -1 ? '∞' : usage.weekly_analysis_limit}
                  </p>
                </div>
                <div className="h-8 w-px bg-indigo-200 hidden sm:block" />
                <div>
                  <span className="text-xs text-indigo-600">확장 분석</span>
                  <p className="text-lg font-bold text-indigo-900">
                    {usage.weekly_extended_used}/{usage.weekly_extended_limit === -1 ? '∞' : usage.weekly_extended_limit}
                  </p>
                </div>
                <div className="h-8 w-px bg-indigo-200 hidden sm:block" />
                <div>
                  <span className="text-xs text-indigo-600">크레딧</span>
                  <p className="text-lg font-bold text-indigo-900">{usage.credits}</p>
                </div>
              </div>
              <div className="text-center mt-3 pt-3 border-t border-indigo-200">
                <span className="text-xs text-indigo-500">
                  초기화까지 {getTimeUntilReset(usage.next_reset_at)}
                </span>
              </div>

              {/* 크레딧 내역 토글 */}
              <div className="text-center mt-3">
                <button
                  onClick={handleToggleHistory}
                  className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                >
                  {showHistory ? '크레딧 내역 접기 ▲' : '크레딧 내역 보기 ▼'}
                </button>
              </div>

              {/* 크레딧 내역 리스트 */}
              {showHistory && (
                <div className="mt-4 pt-4 border-t border-indigo-200">
                  {historyLoading && historyLogs.length === 0 ? (
                    <div className="text-center text-xs text-indigo-500 py-2">로딩 중...</div>
                  ) : historyLogs.length === 0 ? (
                    <div className="text-center text-xs text-indigo-500 py-2">크레딧 내역이 없습니다</div>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {historyLogs.map((log) => {
                          const config = ACTION_TYPE_CONFIG[log.action_type] || { label: log.action_type, color: 'bg-gray-100 text-gray-700' };
                          return (
                            <div key={log.id} className="flex items-center justify-between text-xs bg-white rounded px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${config.color}`}>
                                  {config.label}
                                </span>
                                <span className="text-gray-600">{log.description || '-'}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`font-bold ${log.change_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                                </span>
                                <span className="text-gray-400 w-20 text-right">{log.balance_after}크레딧</span>
                                <span className="text-gray-400 w-16 text-right">{formatDate(log.created_at)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {historyHasMore && (
                        <div className="text-center mt-3">
                          <button
                            onClick={() => loadHistory(false)}
                            disabled={historyLoading}
                            className="text-xs text-indigo-600 hover:text-indigo-800 underline disabled:text-indigo-300"
                          >
                            {historyLoading ? '로딩 중...' : `더 보기 (${historyLogs.length}/${historyTotal})`}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              분석 요청 시 1크레딧이 소모됩니다. (추후 변경될 수 있음)
            </p>
          </div>
        )}

        {/* Data Consent */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">데이터 활용</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">AI 개선 데이터 활용 동의</p>
              <p className="text-sm text-gray-500">
                분석 결과를 AI 성능 개선에 활용합니다. 개인정보는 익명화됩니다.
              </p>
              {(!usage || usage.tier === 'free') && (
                <p className="text-xs text-amber-600 mt-1">
                  무료 플랜 이용 시 데이터 활용에 자동 동의됩니다.
                </p>
              )}
            </div>
            <button
              onClick={async () => {
                if (!usage || usage.tier === 'free') return;
                setIsLoading(true);
                try {
                  await authService.updateProfile({ data_consent: !user.data_consent });
                  await fetchUser();
                  setMessage({ type: 'success', text: '설정이 변경되었습니다' });
                } catch {
                  setMessage({ type: 'error', text: '설정 변경 실패' });
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading || !usage || usage.tier === 'free'}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                (!usage || usage.tier === 'free')
                  ? 'bg-blue-600 cursor-not-allowed opacity-70'
                  : user.data_consent ? 'bg-blue-600 cursor-pointer' : 'bg-gray-200 cursor-pointer'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  (!usage || usage.tier === 'free' || user.data_consent) ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Template Settings */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">분석 결과 표시</h2>
          <p className="text-sm text-gray-500 mb-4">
            분석 결과를 표시할 기본 템플릿을 선택하세요.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEMPLATE_OPTIONS.map((option) => {
              const isAvailable = option.id === 'detailed';
              return (
                <button
                  key={option.id}
                  onClick={() => isAvailable && handleTemplateChange(option.id)}
                  disabled={isLoading || !isAvailable}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-colors text-left ${
                    selectedTemplate === option.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : !isAvailable
                        ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">{option.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        selectedTemplate === option.id ? 'text-indigo-700' :
                        !isAvailable ? 'text-gray-400' : 'text-gray-900'
                      }`}>
                        {option.name}
                      </span>
                      {selectedTemplate === option.id && (
                        <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">
                          기본
                        </span>
                      )}
                      {!isAvailable && (
                        <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                          준비중
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 ${!isAvailable ? 'text-gray-400' : 'text-gray-500'}`}>
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">계정 작업</h2>
          <div className="space-y-4">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              로그아웃
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              계정 삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
