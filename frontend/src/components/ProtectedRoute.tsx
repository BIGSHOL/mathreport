import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export function ProtectedRoute() {
    const { token } = useAuthStore();
    const location = useLocation();

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // User info fetch failed or logged out
    // if (token && !user) { params... might need loading state check }

    return <Outlet />;
}

export function PublicRoute() {
    const { user } = useAuthStore();
    if (user) {
        return <Navigate to="/exams" replace />;
    }
    return <Outlet />;
}

/**
 * 관리자 전용 라우트
 * - admin 권한이 없으면 /exams로 리다이렉트
 */
export function AdminRoute() {
    const { user, token } = useAuthStore();
    const location = useLocation();

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user?.role !== 'admin') {
        return <Navigate to="/exams" replace />;
    }

    return <Outlet />;
}
