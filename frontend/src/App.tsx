/**
 * App root component.
 *
 * Implements Vercel React Best Practices:
 * - bundle-dynamic-imports: Lazy load pages for code splitting
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { useAuthStore } from './stores/auth';

// Lazy load pages for code splitting (bundle-dynamic-imports)
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ExamDashboardPage = lazy(() => import('./pages/ExamDashboardPage').then(m => ({ default: m.ExamDashboardPage })));
const AnalysisResultPage = lazy(() => import('./pages/AnalysisResultPage').then(m => ({ default: m.AnalysisResultPage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })));
const AdminPatternPage = lazy(() => import('./pages/AdminPatternPage').then(m => ({ default: m.AdminPatternPage })));

// Loading fallback (rendering-hoist-jsx)
const PageLoading = <div className="flex items-center justify-center min-h-screen">로딩 중...</div>;

function App() {
  const { fetchUser, token } = useAuthStore();

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
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Route>

          {/* Public - 가격 페이지 (로그인 없이도 접근 가능) */}
          <Route path="/pricing" element={<PricingPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/exams" element={<ExamDashboardPage />} />
            <Route path="/analysis/:id" element={<AnalysisResultPage />} />
            <Route path="/admin/patterns" element={<AdminPatternPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
