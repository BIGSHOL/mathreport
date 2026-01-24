/**
 * Subscription and credits API service.
 */
import api from './api';

export type SubscriptionTier = 'free' | 'basic' | 'pro';

export interface UsageStatus {
    tier: SubscriptionTier;
    subscription_expires_at: string | null;
    monthly_analysis_used: number;
    monthly_analysis_limit: number;  // -1 = 무제한
    monthly_extended_used: number;
    monthly_extended_limit: number;  // -1 = 무제한
    credits: number;
    credits_expires_at: string | null;
    can_analyze: boolean;
    can_use_extended: boolean;
    is_master: boolean;  // MASTER 계정 여부
}

export interface Plan {
    tier: SubscriptionTier;
    name: string;
    price: number;
    monthly_analysis: number;
    monthly_extended: number;
    features: string[];
}

export interface CreditPackage {
    id: string;
    credits: number;
    price: number;
    unit_price: number;
}

export interface PurchaseCreditsResponse {
    success: boolean;
    credits_added: number;
    total_credits: number;
    message: string;
}

export interface SubscribeResponse {
    success: boolean;
    tier: SubscriptionTier;
    expires_at: string;
    message: string;
}

export const subscriptionService = {
    /**
     * Get current usage status.
     */
    async getUsage(): Promise<UsageStatus> {
        const response = await api.get<UsageStatus>('/api/v1/subscription/usage');
        return response.data;
    },

    /**
     * Get available plans.
     */
    async getPlans(): Promise<Plan[]> {
        const response = await api.get<{ plans: Plan[] }>('/api/v1/subscription/plans');
        return response.data.plans;
    },

    /**
     * Get available credit packages.
     */
    async getCreditPackages(): Promise<CreditPackage[]> {
        const response = await api.get<{ packages: CreditPackage[] }>('/api/v1/subscription/credit-packages');
        return response.data.packages;
    },

    /**
     * Subscribe to a plan (Mock).
     */
    async subscribe(tier: SubscriptionTier): Promise<SubscribeResponse> {
        const response = await api.post<SubscribeResponse>('/api/v1/subscription/subscribe', { tier });
        return response.data;
    },

    /**
     * Cancel subscription.
     */
    async cancelSubscription(): Promise<{ message: string; expires_at: string }> {
        const response = await api.post<{ message: string; expires_at: string }>('/api/v1/subscription/cancel');
        return response.data;
    },

    /**
     * Purchase credits (Mock).
     */
    async purchaseCredits(packageId: string): Promise<PurchaseCreditsResponse> {
        const response = await api.post<PurchaseCreditsResponse>('/api/v1/subscription/credits/purchase', {
            package: packageId,
        });
        return response.data;
    },
};

export default subscriptionService;
