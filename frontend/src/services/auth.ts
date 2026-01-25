/**
 * Authentication API service using Supabase Auth (Google OAuth only).
 */
import { supabase } from '../lib/supabase';
import api from './api';
import type { User } from '../types/auth';

const TOKEN_KEY = 'access_token';

export const authService = {
  /**
   * Login with Google OAuth.
   */
  async loginWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Logout current user.
   */
  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } finally {
      this.removeToken();
    }
  },

  /**
   * Get current user profile from backend.
   */
  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/api/v1/users/me');
    return response.data;
  },

  /**
   * Update current user profile.
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.patch<User>('/api/v1/users/me', data);
    return response.data;
  },

  /**
   * Delete current user account.
   */
  async deleteAccount(): Promise<void> {
    await api.delete('/api/v1/users/me');
    await supabase.auth.signOut();
    this.removeToken();
  },

  /**
   * Restore session from Supabase.
   * Returns the access token if session exists.
   */
  async restoreSession(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      this.setToken(session.access_token);
      return session.access_token;
    }

    return null;
  },

  /**
   * Get stored token.
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Store token.
   */
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  /**
   * Remove stored token.
   */
  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  /**
   * Check if user is authenticated.
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

export default authService;
