/**
 * Pricing page with subscription plans and credit packages.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import subscriptionService, {
    type Plan,
    type CreditPackage,
    type UsageStatus,
    type CreditLogItem,
} from '../services/subscription';

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
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
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

export function PricingPage() {
    const { user } = useAuthStore();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [packages, setPackages] = useState<CreditPackage[]>([]);
    const [usage, setUsage] = useState<UsageStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, _setMessage] = useState({ type: '', text: '' });
    void _setMessage; // TODO: 구독/결제 기능 구현 시 사용

    // 크레딧 내역 관련 상태
    const [showHistory, setShowHistory] = useState(false);
    const [historyLogs, setHistoryLogs] = useState<CreditLogItem[]>([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyHasMore, setHistoryHasMore] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [plansData, packagesData] = await Promise.all([
                subscriptionService.getPlans(),
                subscriptionService.getCreditPackages(),
            ]);
            setPlans(plansData);
            setPackages(packagesData);

            if (user) {
                const usageData = await subscriptionService.getUsage();
                setUsage(usageData);
            }
        } catch (error) {
            console.error('Failed to load pricing data:', error);
        } finally {
            setIsLoading(false);
        }
    };

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

    const handleLoadMore = () => {
        loadHistory(false);
    };

    // TODO: 구독/결제 기능 구현 시 활성화
    // const handleSubscribe = async (tier: SubscriptionTier) => { ... };
    // const handlePurchaseCredits = async (packageId: string) => { ... };

    if (isLoading) {
        return <div className="p-8 text-center">로딩 중...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-6">
            {/* 헤더 */}
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">요금제</h1>
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                    🚀 베타 기간 무료 이용
                </div>
                {usage?.is_master && (
                    <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">
                        👑 MASTER
                    </span>
                )}
            </div>

            {message.text && (
                <div className={`mb-4 p-3 rounded-lg text-center text-sm ${
                    message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                    {message.text}
                </div>
            )}

            {/* 현재 사용량 - 컴팩트 */}
            {usage && (
                <div className="bg-indigo-50 rounded-lg p-4 mb-6">
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
                    {/* 초기화 카운트다운 */}
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
                                                onClick={handleLoadMore}
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
            )}

            {/* 구독 플랜 - 컴팩트 */}
            <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">구독 플랜</h2>
                <div className="grid md:grid-cols-3 gap-4">
                    {plans.map((plan) => {
                        const isCurrentPlan = usage?.tier === plan.tier;
                        return (
                            <div
                                key={plan.tier}
                                className={`rounded-xl p-4 ${
                                    isCurrentPlan
                                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-600 ring-offset-1'
                                        : 'bg-white border border-gray-200'
                                }`}
                            >
                                <div className="flex items-baseline justify-between mb-3">
                                    <h3 className={`font-bold ${isCurrentPlan ? 'text-white' : 'text-gray-900'}`}>
                                        {plan.name}
                                        {isCurrentPlan && <span className="ml-1 text-xs font-normal">(현재)</span>}
                                    </h3>
                                    <div>
                                        <span className={`text-xl font-bold ${isCurrentPlan ? 'text-white' : 'text-gray-900'}`}>
                                            {plan.price === 0 ? '무료' : `₩${plan.price.toLocaleString()}`}
                                        </span>
                                        {plan.price > 0 && (
                                            <span className={`text-xs ${isCurrentPlan ? 'text-indigo-200' : 'text-gray-500'}`}>/월</span>
                                        )}
                                    </div>
                                </div>
                                <ul className="space-y-1.5 mb-4 text-sm">
                                    {plan.features.slice(0, 4).map((feature, idx) => (
                                        <li key={idx} className="flex items-start">
                                            <svg className={`w-4 h-4 mr-1.5 flex-shrink-0 ${isCurrentPlan ? 'text-indigo-200' : 'text-indigo-500'}`} fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            <span className={isCurrentPlan ? 'text-indigo-100' : 'text-gray-600'}>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                {plan.tier !== 'free' ? (
                                    usage?.is_master ? (
                                        <div className="w-full py-1.5 text-xs rounded font-medium text-center bg-purple-100 text-purple-700">👑 무제한</div>
                                    ) : isCurrentPlan ? (
                                        <div className="w-full py-1.5 text-xs rounded font-medium text-center bg-indigo-100 text-indigo-700">사용 중</div>
                                    ) : (
                                        <div className="w-full py-1.5 text-xs rounded font-medium text-center bg-gray-100 text-gray-400">준비 중</div>
                                    )
                                ) : isCurrentPlan ? (
                                    <div className="w-full py-1.5 text-xs rounded font-medium text-center bg-indigo-100 text-indigo-700">사용 중</div>
                                ) : !user ? (
                                    <Link to="/register" className="block w-full py-1.5 text-xs rounded font-medium text-center bg-gray-100 text-gray-700 hover:bg-gray-200">
                                        무료로 시작
                                    </Link>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 크레딧 구매 - 컴팩트 */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2 text-center">크레딧 구매</h2>
                <p className="text-xs text-gray-500 text-center mb-4">시험지 분석 = 1크레딧 | 학생용 분석 = 2크레딧 | 확장분석 = +1크레딧</p>
                <div className="flex justify-center gap-4 flex-wrap">
                    {packages.map((pkg) => (
                        <div key={pkg.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center min-w-[120px] hover:border-indigo-300 transition-colors">
                            <div className="text-xl font-bold text-indigo-600">{pkg.credits}회</div>
                            <div className="text-lg font-bold text-gray-900">₩{pkg.price.toLocaleString()}</div>
                            <div className="text-xs text-gray-400 mb-2">회당 ₩{pkg.unit_price}</div>
                            {usage?.is_master ? (
                                <div className="text-xs py-1 rounded bg-purple-100 text-purple-700">👑</div>
                            ) : (
                                <div className="text-xs py-1 rounded bg-gray-100 text-gray-400">준비 중</div>
                            )}
                        </div>
                    ))}
                </div>
                <p className="text-xs text-gray-400 text-center mt-3">* 유효기간: 구매일로부터 6개월</p>
            </div>
        </div>
    );
}

export default PricingPage;
