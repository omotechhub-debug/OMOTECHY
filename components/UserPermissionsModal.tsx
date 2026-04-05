"use client"

import React, { useState, useEffect } from 'react';
import { X, Save, Shield, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PagePermission {
  page: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  pagePermissions?: PagePermission[];
}

interface UserPermissionsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, permissions: PagePermission[]) => Promise<void>;
}

const PAGE_LABELS: { [key: string]: string } = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  pos: 'POS System',
  customers: 'Customers',
  services: 'Services',
  categories: 'Categories',
  reports: 'Reports',
  users: 'User Management',
  expenses: 'Expenses',
  gallery: 'Gallery',
  testimonials: 'Testimonials',
  promotions: 'Promotions',
  'mpesa-transactions': 'M-Pesa Transactions',
  settings: 'Settings',
  'social-media': 'Social Media'
};

const PAGE_DESCRIPTIONS: { [key: string]: string } = {
  dashboard: 'View dashboard statistics and overview',
  orders: 'Manage customer orders and track status',
  pos: 'Point of sale system for creating orders',
  customers: 'Manage customer information and data',
  services: 'Configure laundry services and pricing',
  categories: 'Manage service categories',
  reports: 'View business reports and analytics',
  users: 'Manage user accounts and permissions',
  expenses: 'Track business expenses',
  gallery: 'Manage image gallery',
  testimonials: 'Manage customer testimonials',
  promotions: 'Configure promotional offers',
  'mpesa-transactions': 'Manage M-Pesa payment transactions',
  settings: 'System configuration and settings',
  'social-media': 'Manage social media links for website footer'
};

// Default permissions for all pages
const DEFAULT_PERMISSIONS: PagePermission[] = [
  { page: 'dashboard', canView: true, canEdit: false, canDelete: false },
  { page: 'orders', canView: true, canEdit: true, canDelete: false },
  { page: 'pos', canView: true, canEdit: true, canDelete: false },
  { page: 'customers', canView: true, canEdit: true, canDelete: false },
  { page: 'services', canView: true, canEdit: false, canDelete: false },
  { page: 'categories', canView: true, canEdit: false, canDelete: false },
  { page: 'reports', canView: true, canEdit: false, canDelete: false },
  { page: 'users', canView: false, canEdit: false, canDelete: false },
  { page: 'expenses', canView: true, canEdit: false, canDelete: false },
  { page: 'gallery', canView: true, canEdit: false, canDelete: false },
  { page: 'testimonials', canView: true, canEdit: false, canDelete: false },
  { page: 'promotions', canView: true, canEdit: false, canDelete: false },
  { page: 'mpesa-transactions', canView: true, canEdit: true, canDelete: false },
  { page: 'settings', canView: false, canEdit: false, canDelete: false },
  { page: 'social-media', canView: true, canEdit: true, canDelete: false }
];

export default function UserPermissionsModal({ user, isOpen, onClose, onSave }: UserPermissionsModalProps) {
  const [permissions, setPermissions] = useState<PagePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && isOpen) {
      // Merge user's permissions with all possible pages
      let userPermissions: PagePermission[] = [];
      const userPermMap = new Map<string, PagePermission>();
      if (user.pagePermissions && Array.isArray(user.pagePermissions)) {
        for (const perm of user.pagePermissions) {
          userPermMap.set(perm.page, perm);
        }
      }
      userPermissions = DEFAULT_PERMISSIONS.map(defaultPerm => {
        const userPerm = userPermMap.get(defaultPerm.page);
        if (userPerm) {
          return { ...defaultPerm, ...userPerm };
        }
        return { ...defaultPerm };
      });
      setPermissions(userPermissions);
      setMessage('');
      setError('');
    }
  }, [user, isOpen]);

  const handlePermissionChange = (page: string, permission: 'canView' | 'canEdit' | 'canDelete', value: boolean) => {
    setPermissions(prev => prev.map(p => 
      p.page === page ? { ...p, [permission]: value } : p
    ));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      await onSave(user.id, permissions);
      setMessage('Permissions updated successfully!');
      setTimeout(() => {
        onClose();
        setMessage('');
      }, 2000);
    } catch (error) {
      setError('Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  const getPermissionIcon = (permission: 'canView' | 'canEdit' | 'canDelete') => {
    switch (permission) {
      case 'canView': return <Eye className="h-4 w-4" />;
      case 'canEdit': return <Edit className="h-4 w-4" />;
      case 'canDelete': return <Trash2 className="h-4 w-4" />;
      default: return null;
    }
  };

  const getPermissionLabel = (permission: 'canView' | 'canEdit' | 'canDelete') => {
    switch (permission) {
      case 'canView': return 'View';
      case 'canEdit': return 'Edit';
      case 'canDelete': return 'Delete';
      default: return '';
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">Manage Permissions</h2>
              <p className="text-sm text-gray-600">
                Configure page access for {user.name} ({user.email})
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {message && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <AlertDescription className="text-green-600">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-600">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {permissions.map((permission) => (
              <Card key={permission.page} className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center space-x-2">
                    <span>{PAGE_LABELS[permission.page]}</span>
                    <Badge variant="outline" className="text-xs">
                      {permission.page}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-gray-500">
                    {PAGE_DESCRIPTIONS[permission.page]}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(['canView', 'canEdit', 'canDelete'] as const).map((perm) => (
                    <div key={perm} className="flex items-center space-x-3">
                      <Checkbox
                        id={`${permission.page}-${perm}`}
                        checked={permission[perm]}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(permission.page, perm, checked as boolean)
                        }
                        disabled={loading}
                      />
                      <label 
                        htmlFor={`${permission.page}-${perm}`}
                        className="flex items-center space-x-2 text-sm cursor-pointer"
                      >
                        {getPermissionIcon(perm)}
                        <span>{getPermissionLabel(perm)}</span>
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            <strong>Role:</strong> {user.role}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Permissions'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 