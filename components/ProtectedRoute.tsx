"use client"

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle, Lock, Shield } from 'lucide-react';
import { canViewPage, isAdminUser, isSuperAdminUser } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  requiredPage?: string; // Specific page permission required
}

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireSuperAdmin = false,
  requiredPage 
}: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Auto-detect page from pathname if not specified
  const getPageKey = (path: string) => {
    if (path.startsWith('/admin/orders')) return 'orders';
    if (path.startsWith('/admin/pos')) return 'pos';
    if (path.startsWith('/admin/clients')) return 'customers';
    if (path.startsWith('/admin/services-updated')) return 'services';
    if (path.startsWith('/admin/services')) return 'services';
    if (path.startsWith('/admin/categories')) return 'services'; // Categories are now part of services
    if (path.startsWith('/admin/reports')) return 'reports';
    if (path.startsWith('/admin/users')) return 'users';
    if (path.startsWith('/admin/expenses')) return 'expenses';
    if (path.startsWith('/admin/gallery')) return 'gallery';
    if (path.startsWith('/admin/testimonials')) return 'testimonials';
    if (path.startsWith('/admin/promotions')) return 'promotions';
    if (path.startsWith('/admin/banners')) return 'settings';
    if (path.startsWith('/admin/sms')) return 'settings';
    if (path.startsWith('/admin/settings')) return 'settings';
    // Only map /admin/dashboard to 'dashboard', not /admin itself
    if (path === '/admin' || path === '/admin/') return '';
    if (path.startsWith('/admin/dashboard')) return 'dashboard';
    if (path.startsWith('/admin')) return 'dashboard';
    return '';
  };

  const currentPage = requiredPage || getPageKey(pathname || '');

  useEffect(() => {
    if (!isLoading) {
      setHasCheckedAuth(true);
      if (!isAuthenticated) {
        console.log('🚫 Not authenticated, redirecting to admin login');
        window.location.href = '/admin/login';
        return;
      }

      // Regular users should never access admin routes
      if (user && user.role === 'user') {
        console.log('🚫 Regular user attempted admin access, redirecting to user dashboard');
        router.push('/dashboard');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Debug logging
  useEffect(() => {
    if (hasCheckedAuth && user) {
      console.log('ProtectedRoute - Auth state:', {
        isAuthenticated,
        isAdmin,
        userRole: user?.role,
        requireAdmin,
        requireSuperAdmin,
        currentPage,
        pathname,
        canViewThisPage: canViewPage(user, currentPage),
        pagePermissions: user?.pagePermissions
      });
    }
  }, [hasCheckedAuth, isAuthenticated, isAdmin, user, requireAdmin, requireSuperAdmin, currentPage, pathname]);

  // Loading state
  if (isLoading || !hasCheckedAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Verifying access permissions...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Lock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Regular user trying to access admin
  if (user && user.role === 'user') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">This area is restricted to administrators only.</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Go to User Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Super admin requirement check
  if (requireSuperAdmin && !isSuperAdminUser(user)) {
    console.log('🚫 Access denied - Super admin required');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <Shield className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Super Admin Required</h2>
          <p className="text-gray-600 mb-4">This resource requires super administrator privileges.</p>
          <button 
            onClick={() => router.push('/admin')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Admin requirement check
  if (requireAdmin && !isAdminUser(user)) {
    console.log('🚫 Access denied - Admin privileges required');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <Lock className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Access Required</h2>
          <p className="text-gray-600 mb-4">You need administrator privileges to access this resource.</p>
          <button 
            onClick={() => router.push('/admin/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Login as Admin
          </button>
        </div>
      </div>
    );
  }

  // Superadmin has access to everything
  if (user?.role === 'superadmin') {
    console.log('✅ Superadmin access granted');
    return <>{children}</>;
  }

  // Page-specific permission check for admin users
  if (currentPage && !canViewPage(user, currentPage)) {
    console.log(`🚫 Access denied - No permission for page: ${currentPage}`);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <Lock className="h-16 w-16 mx-auto mb-4 text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Page Access Denied</h2>
          <p className="text-gray-600 mb-2">
            You don't have permission to view the <strong>{currentPage}</strong> page.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Contact your administrator to request access to this resource.
          </p>
          <div className="space-y-2">
            <button 
              onClick={() => router.push('/admin')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Back to Dashboard
            </button>
            <p className="text-xs text-gray-400">
              Current role: {user?.role} | User: {user?.email}
            </p>
          </div>
        </div>
      </div>
    );
  }

  console.log('✅ Access granted based on permissions');
  return <>{children}</>;
} 