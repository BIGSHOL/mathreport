/**
 * Upgrade modal shown when usage limit is exceeded.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import subscriptionService, { type CreditPackage, type SubscriptionTier } from '../services/subscription';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'analysis' | 'extended';
}

export function UpgradeModal({ isOpen, onClose, type }: UpgradeModalProps) {
    const [packages, setPackages] = useState<CreditPackage[]>([]);
    const [isLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadPackages();
        }
    }, [isOpen]);

    const loadPackages = async () => {
        try {
            const data = await subscriptionService.getCreditPackages();
            setPackages(data);
        } catch (error) {
            console.error('Failed to load packages:', error);
        }
    };

    const handlePurchase = async (_packageId: string) => {
        // 결제 시스템 준비 중
        setMessage('결제 시스템 준비 중입니다. 조금만 기다려주세요!');
    };

    const handleSubscribe = async (_tier: SubscriptionTier) => {
        // 결제 시스템 준비 중
        setMessage('결제 시스템 준비 중입니다. 조금만 기다려주세요!');
    };

    if (!isOpen) return null;

    const title = type === 'analysis' ? '분석 한도 초과' : '확장 분석 한도 초과';
    const description = type === 'analysis'
        ? '이번 달 무료 분석 횟수를 모두 사용했습니다.'
        : '이번 달 확장 분석 횟수를 모두 사용했습니다.';

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black/50" onClick={onClose} />

                {/* Modal */}
                <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="text-center mb-6">
                        <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                        <p className="text-gray-600 mt-2">{description}</p>
                    </div>

                    {message && (
                        <div className={`mb-4 p-3 rounded-lg text-center text-sm ${
                            message.includes('오류') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                        }`}>
                            {message}
                        </div>
                    )}

                    {/* Subscription Option */}
                    <div className="mb-6">
                        <button
                            onClick={() => handleSubscribe('basic')}
                            disabled={isLoading}
                            className="w-full py-4 px-6 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            <div className="text-lg">베이직 구독하기</div>
                            <div className="text-sm text-indigo-200">월 9,900원 · 주 10회 분석</div>
                        </button>
                    </div>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">또는 크레딧 구매</span>
                        </div>
                    </div>

                    {/* Credit Options */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {packages.map((pkg) => (
                            <button
                                key={pkg.id}
                                onClick={() => handlePurchase(pkg.id)}
                                disabled={isLoading}
                                className="py-3 px-2 border-2 border-gray-200 rounded-xl hover:border-indigo-300 disabled:opacity-50 transition-colors"
                            >
                                <div className="text-lg font-bold text-indigo-600">{pkg.credits}회</div>
                                <div className="text-sm text-gray-900">₩{pkg.price.toLocaleString()}</div>
                            </button>
                        ))}
                    </div>

                    <div className="text-center">
                        <Link
                            to="/pricing"
                            onClick={onClose}
                            className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                            모든 요금제 보기 →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UpgradeModal;
