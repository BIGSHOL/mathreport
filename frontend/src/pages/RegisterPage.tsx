/**
 * Registration page - redirects to Google OAuth login.
 * This application uses Google OAuth only for authentication.
 */
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

export function RegisterPage() {
  useEffect(() => {
    // Log for debugging
    console.log('RegisterPage: Redirecting to login (Google OAuth only)');
  }, []);

  // Redirect to login page since we use Google OAuth only
  return <Navigate to="/login" replace />;
}

export default RegisterPage;
