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
