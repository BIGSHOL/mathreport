/**
 * App root component.
 *
 * Implements Vercel React Best Practices:
 * - bundle-dynamic-imports: Lazy load pages for code splitting
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ProtectedRoute, PublicRoute, AdminRoute } from './components/ProtectedRoute';
import { useAuthStore } from './stores/auth';
import { supabase, isSupabaseConfigured } from './lib/supabase';

// Lazy load pages for code splitting (bundle-dynamic-imports)
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));
const ExamDashboardPage = lazy(() => import('./pages/ExamDashboardPage').then(m => ({ default: m.ExamDashboardPage })));
const AnalysisResultPage = lazy(() => import('./pages/AnalysisResultPage').then(m => ({ default: m.AnalysisResultPage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })));
const AdminPatternPage = lazy(() => import('./pages/AdminPatternPage').then(m => ({ default: m.AdminPatternPage })));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminSchoolTrendsPage = lazy(() => import('./pages/AdminSchoolTrendsPage').then(m => ({ default: m.AdminSchoolTrendsPage })));
const AdminSecurityLogsPage = lazy(() => import('./pages/AdminSecurityLogsPage').then(m => ({ default: m.AdminSecurityLogsPage })));
const TrendsPage = lazy(() => import('./pages/TrendsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));

// Loading fallback (rendering-hoist-jsx)
const PageLoading = <div className="flex items-center justify-center min-h-screen">로딩 중...</div>;

function App() {
  const { restoreSession, setToken, fetchUser, token } = useAuthStore();

  // 앱 시작 시 Supabase 세션 복원
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Supabase Auth 상태 변경 리스너
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.access_token) {
          setToken(session.access_token);
          fetchUser();
        } else if (event === 'SIGNED_OUT') {
          setToken(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.access_token) {
          // 토큰 자동 갱신 시 업데이트
          setToken(session.access_token);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setToken, fetchUser]);

  // 기존 토큰이 있으면 사용자 정보 가져오기
  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token, fetchUser]);

  return (
    <Suspense fallback={PageLoading}>
      <Routes>
        <Route element={<Layout />}>
          {/* Public Routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Route>

          {/* OAuth Callback (공개 라우트) */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Public - 가격 페이지 (로그인 없이도 접근 가능) */}
          <Route path="/pricing" element={<PricingPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/exams" element={<ExamDashboardPage />} />
            <Route path="/analysis/:id" element={<AnalysisResultPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Admin Only Routes - 관리자 전용 (출제 경향 등) */}
          <Route element={<AdminRoute />}>
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/admin/patterns" element={<AdminPatternPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/school-trends" element={<AdminSchoolTrendsPage />} />
            <Route path="/admin/security-logs" element={<AdminSecurityLogsPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
