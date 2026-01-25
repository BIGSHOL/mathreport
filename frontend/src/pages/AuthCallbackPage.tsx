/**
 * OAuth callback page for handling Supabase Auth redirects.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { handleAuthCallback, error, isLoading } = useAuthStore();

  useEffect(() => {
    const processCallback = async () => {
      try {
        await handleAuthCallback();
        // 성공 시 대시보드로 이동
        navigate('/exams', { replace: true });
      } catch {
        // 에러 시 로그인 페이지로 이동
        navigate('/login', { replace: true });
      }
    };

    processCallback();
  }, [handleAuthCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로그인 처리 중...</p>
          </>
        ) : error ? (
          <>
            <div className="text-red-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-gray-500 text-sm mt-2">로그인 페이지로 이동합니다...</p>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default AuthCallbackPage;
