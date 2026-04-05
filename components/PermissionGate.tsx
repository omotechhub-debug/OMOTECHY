"use client"

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { canViewPage, canEditPage, canDeletePage } from '@/lib/permissions';

interface PermissionGateProps {
  children: React.ReactNode;
  page?: string;
  action?: 'view' | 'edit' | 'delete';
  role?: 'admin' | 'superadmin';
  fallback?: React.ReactNode;
}

/**
 * Permission Gate component that conditionally renders children based on user permissions
 * 
 * @param page - The page to check permissions for
 * @param action - The action to check (view, edit, delete)
 * @param role - Minimum role required
 * @param fallback - Component to render if permission check fails
 */
export default function PermissionGate({ 
  children, 
  page, 
  action = 'view',
  role,
  fallback = null 
}: PermissionGateProps) {
  const { user } = useAuth();

  // No user - don't render
  if (!user) {
    return <>{fallback}</>;
  }

  // Role-based check
  if (role) {
    if (role === 'superadmin' && user.role !== 'superadmin') {
      return <>{fallback}</>;
    }
    if (role === 'admin' && user.role !== 'admin' && user.role !== 'superadmin') {
      return <>{fallback}</>;
    }
  }

  // Page permission check
  if (page) {
    let hasPermission = false;

    switch (action) {
      case 'view':
        hasPermission = canViewPage(user, page);
        break;
      case 'edit':
        hasPermission = canEditPage(user, page);
        break;
      case 'delete':
        hasPermission = canDeletePage(user, page);
        break;
      default:
        hasPermission = canViewPage(user, page);
    }

    if (!hasPermission) {
      return <>{fallback}</>;
    }
  }

  // Permission checks passed - render children
  return <>{children}</>;
}

/**
 * Hook to check permissions in components
 */
export function usePermissions() {
  const { user } = useAuth();

  return {
    canView: (page: string) => canViewPage(user, page),
    canEdit: (page: string) => canEditPage(user, page),
    canDelete: (page: string) => canDeletePage(user, page),
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    isSuperAdmin: user?.role === 'superadmin',
    user
  };
} 