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
} from '../services/subscription';

export function PricingPage() {
    const { user } = useAuthStore();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [packages, setPackages] = useState<CreditPackage[]>([]);
    const [usage, setUsage] = useState<UsageStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, _setMessage] = useState({ type: '', text: '' });
    void _setMessage; // TODO: 구독/결제 기능 구현 시 사용

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

    // TODO: 구독/결제 기능 구현 시 활성화
    // const handleSubscribe = async (tier: SubscriptionTier) => { ... };
    // const handlePurchaseCredits = async (packageId: string) => { ... };

    if (isLoading) {
        return <div className="p-8 text-center">로딩 중...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">요금제</h1>
                <p className="text-xl text-gray-600">
                    필요에 맞는 요금제를 선택하세요
                </p>
                {/* 베타 서비스 안내 */}
                <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
                    <span className="mr-2">🚀</span>
                    현재 베타 서비스 기간으로 무료 플랜만 이용 가능합니다
                </div>
                {usage?.is_master && (
                    <div className="mt-2 inline-flex items-center px-4 py-2 rounded-full bg-purple-100 text-purple-800 text-sm font-medium">
                        <span className="mr-2">👑</span>
                        MASTER 계정 - 모든 기능 무제한
                    </div>
                )}
            </div>

            {message.text && (
                <div
                    className={`mb-8 p-4 rounded-lg text-center ${
                        message.type === 'success'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                    }`}
                >
                    {message.text}
                </div>
            )}

            {/* Current Usage */}
            {usage && (
                <div className="bg-indigo-50 rounded-lg p-6 mb-12">
                    <h2 className="text-lg font-semibold text-indigo-900 mb-4">현재 사용량</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-indigo-600">현재 플랜</p>
                            <p className="text-2xl font-bold text-indigo-900 capitalize">{usage.tier}</p>
                        </div>
                        <div>
                            <p className="text-sm text-indigo-600">기본 분석</p>
                            <p className="text-2xl font-bold text-indigo-900">
                                {usage.monthly_analysis_used} / {usage.monthly_analysis_limit === -1 ? '∞' : usage.monthly_analysis_limit}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-indigo-600">확장 분석</p>
                            <p className="text-2xl font-bold text-indigo-900">
                                {usage.monthly_extended_used} / {usage.monthly_extended_limit === -1 ? '∞' : usage.monthly_extended_limit}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-indigo-600">보유 크레딧</p>
                            <p className="text-2xl font-bold text-indigo-900">{usage.credits}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Subscription Plans */}
            <div className="mb-16">
                <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">구독 플랜</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <div
                            key={plan.tier}
                            className={`rounded-2xl p-8 ${
                                plan.tier === 'basic'
                                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-600 ring-offset-2'
                                    : 'bg-white border-2 border-gray-200'
                            }`}
                        >
                            <h3 className={`text-xl font-bold mb-2 ${plan.tier === 'basic' ? 'text-white' : 'text-gray-900'}`}>
                                {plan.name}
                            </h3>
                            <div className="mb-6">
                                <span className={`text-4xl font-bold ${plan.tier === 'basic' ? 'text-white' : 'text-gray-900'}`}>
                                    {plan.price === 0 ? '무료' : `₩${plan.price.toLocaleString()}`}
                                </span>
                                {plan.price > 0 && (
                                    <span className={plan.tier === 'basic' ? 'text-indigo-200' : 'text-gray-500'}>/월</span>
                                )}
                            </div>
                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start">
                                        <svg
                                            className={`w-5 h-5 mr-2 flex-shrink-0 ${
                                                plan.tier === 'basic' ? 'text-indigo-200' : 'text-indigo-600'
                                            }`}
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span className={plan.tier === 'basic' ? 'text-indigo-100' : 'text-gray-600'}>
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            {plan.tier !== 'free' && (
                                usage?.is_master ? (
                                    // MASTER 계정은 구독 버튼 대신 무제한 표시
                                    <div className="w-full py-3 px-4 rounded-lg font-semibold text-center bg-purple-100 text-purple-700">
                                        👑 MASTER 무제한
                                    </div>
                                ) : (
                                    // 베타 기간 - 구독 불가
                                    <div className={`w-full py-3 px-4 rounded-lg font-semibold text-center ${
                                        plan.tier === 'basic'
                                            ? 'bg-indigo-100 text-indigo-400'
                                            : 'bg-gray-100 text-gray-400'
                                    }`}>
                                        준비 중
                                    </div>
                                )
                            )}
                            {plan.tier === 'free' && !user && (
                                <Link
                                    to="/register"
                                    className="block w-full py-3 px-4 rounded-lg font-semibold text-center bg-gray-100 text-gray-700 hover:bg-gray-200"
                                >
                                    무료로 시작하기
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Credit Packages */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">크레딧 구매</h2>
                <p className="text-gray-600 text-center mb-8">
                    구독 없이 필요한 만큼만 구매하세요. 기본 분석 1회 = 1크레딧, 확장 분석 1회 = 2크레딧
                </p>
                <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                    {packages.map((pkg) => (
                        <div
                            key={pkg.id}
                            className="bg-white border-2 border-gray-200 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors"
                        >
                            <div className="text-3xl font-bold text-indigo-600 mb-2">{pkg.credits}회</div>
                            <div className="text-2xl font-bold text-gray-900 mb-1">
                                ₩{pkg.price.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500 mb-4">
                                (회당 ₩{pkg.unit_price})
                            </div>
                            {usage?.is_master ? (
                                <div className="w-full py-2 px-4 rounded-lg font-semibold text-center bg-purple-100 text-purple-700">
                                    👑 무제한
                                </div>
                            ) : (
                                <div className="w-full py-2 px-4 rounded-lg font-semibold text-center bg-gray-100 text-gray-400">
                                    준비 중
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <p className="text-sm text-gray-500 text-center mt-4">
                    * 크레딧 유효기간: 구매일로부터 6개월
                </p>
            </div>
        </div>
    );
}

export default PricingPage;
