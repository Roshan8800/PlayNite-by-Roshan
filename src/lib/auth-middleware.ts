import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export interface AuthMiddlewareOptions {
  redirectTo?: string;
  requireAuth?: boolean;
  allowedRoles?: string[];
  requireEmailVerification?: boolean;
}

/**
 * Higher-order component for authentication middleware
 */
export function withAuthMiddleware<P extends object>(
  Component: React.ComponentType<P>,
  options: AuthMiddlewareOptions = {}
) {
  const {
    redirectTo = '/login',
    requireAuth = true,
    allowedRoles = [],
    requireEmailVerification = false,
  } = options;

  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (loading) return;

      // If authentication is required but user is not authenticated
      if (requireAuth && !user) {
        router.push(redirectTo);
        return;
      }

      // If user is authenticated but authentication is not required, redirect to home
      if (!requireAuth && user) {
        router.push('/home');
        return;
      }

      // Check email verification if required
      if (requireEmailVerification && user && !user.emailVerified) {
        router.push('/verify-email');
        return;
      }

      // Check role-based access if specified
      if (allowedRoles.length > 0 && user) {
        const userRole = (user as any).role || 'user';
        if (!allowedRoles.includes(userRole)) {
          router.push('/unauthorized');
          return;
        }
      }
    }, [user, loading, router, requireAuth, redirectTo, requireEmailVerification, allowedRoles]);

    if (loading) {
      return React.createElement(
        'div',
        { className: 'flex items-center justify-center min-h-screen' },
        React.createElement(
          'div',
          { className: 'animate-spin rounded-full h-32 w-32 border-b-2 border-primary' }
        )
      );
    }

    // If authentication is required but user is not authenticated, don't render
    if (requireAuth && !user) {
      return null;
    }

    // If user is authenticated but authentication is not required, don't render
    if (!requireAuth && user) {
      return null;
    }

    return React.createElement(Component, props);
  };
}

/**
 * Hook for checking authentication status in components
 */
export function useAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const {
      redirectTo = '/login',
      requireAuth = true,
      requireEmailVerification = false,
    } = options;

    if (requireAuth && !user) {
      router.push(redirectTo);
      return;
    }

    if (requireEmailVerification && user && !user.emailVerified) {
      router.push('/verify-email');
      return;
    }
  }, [user, loading, router, options]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
  };
}