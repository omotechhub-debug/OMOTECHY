interface IPagePermission {
  page: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface IUser {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'user';
  isActive: boolean;
  approved: boolean;
  pagePermissions: IPagePermission[];
}

/**
 * Check if user has permission to view a specific page
 */
export function canViewPage(user: IUser | null, page: string): boolean {
  if (!user || !user.isActive || !user.approved) {
    return false;
  }

  // Superadmin has access to everything
  if (user.role === 'superadmin') {
    return true;
  }

  // Regular users should not access admin pages at all
  if (user.role === 'user') {
    return false;
  }

  // Check specific page permissions for admin users
  if (user.pagePermissions && Array.isArray(user.pagePermissions)) {
    const pagePermission = user.pagePermissions.find(p => p.page === page);
    return pagePermission ? pagePermission.canView : false;
  }

  return false;
}

/**
 * Check if user has permission to edit on a specific page
 */
export function canEditPage(user: IUser | null, page: string): boolean {
  if (!user || !user.isActive || !user.approved) {
    return false;
  }

  // Superadmin has access to everything
  if (user.role === 'superadmin') {
    return true;
  }

  // Regular users should not access admin pages at all
  if (user.role === 'user') {
    return false;
  }

  // Check specific page permissions for admin users
  if (user.pagePermissions && Array.isArray(user.pagePermissions)) {
    const pagePermission = user.pagePermissions.find(p => p.page === page);
    return pagePermission ? pagePermission.canEdit : false;
  }

  return false;
}

/**
 * Check if user has permission to delete on a specific page
 */
export function canDeletePage(user: IUser | null, page: string): boolean {
  if (!user || !user.isActive || !user.approved) {
    return false;
  }

  // Superadmin has access to everything
  if (user.role === 'superadmin') {
    return true;
  }

  // Regular users should not access admin pages at all
  if (user.role === 'user') {
    return false;
  }

  // Check specific page permissions for admin users
  if (user.pagePermissions && Array.isArray(user.pagePermissions)) {
    const pagePermission = user.pagePermissions.find(p => p.page === page);
    return pagePermission ? pagePermission.canDelete : false;
  }

  return false;
}

/**
 * Get all pages that user has view access to
 */
export function getAccessiblePages(user: IUser | null): string[] {
  if (!user || !user.isActive || !user.approved) {
    return [];
  }

  // Superadmin has access to everything
  if (user.role === 'superadmin') {
    return [
      'dashboard', 'orders', 'pos', 'customers', 'services', 'categories',
      'reports', 'mpesa-transactions', 'users', 'expenses', 'gallery', 'testimonials', 'promotions', 'inventory', 'inventory-management'
    ];
  }

  // Regular users should not access admin pages at all
  if (user.role === 'user') {
    return [];
  }

  // Return pages that admin user can view
  if (user.pagePermissions && Array.isArray(user.pagePermissions)) {
    return user.pagePermissions
      .filter(p => p.canView)
      .map(p => p.page);
  }

  return [];
}

/**
 * Check if user is admin or superadmin
 */
export function isAdminUser(user: IUser | null): boolean {
  if (!user || !user.isActive || !user.approved) {
    return false;
  }
  
  return user.role === 'admin' || user.role === 'superadmin';
}

/**
 * Check if user is superadmin
 */
export function isSuperAdminUser(user: IUser | null): boolean {
  if (!user || !user.isActive || !user.approved) {
    return false;
  }
  
  return user.role === 'superadmin';
}

/**
 * Page metadata for admin navigation
 */
export const ADMIN_PAGES = {
  dashboard: { label: 'Dashboard', icon: 'LayoutDashboard', path: '/admin' },
  orders: { label: 'Orders', icon: 'ShoppingBag', path: '/admin/orders' },
  pos: { label: 'POS', icon: 'CreditCard', path: '/admin/pos' },
  customers: { label: 'Customers', icon: 'Users', path: '/admin/clients' },
  services: { label: 'Services', icon: 'Settings', path: '/admin/services' },
  reports: { label: 'Reports', icon: 'BarChart', path: '/admin/reports' },
  'mpesa-transactions': { label: 'M-Pesa Transactions', icon: 'Smartphone', path: '/admin/mpesa-transactions' },
  users: { label: 'User Management', icon: 'UserCog', path: '/admin/users' },
  expenses: { label: 'Expenses', icon: 'Receipt', path: '/admin/expenses' },
  gallery: { label: 'Gallery', icon: 'Image', path: '/admin/gallery' },
  testimonials: { label: 'Testimonials', icon: 'MessageSquare', path: '/admin/testimonials' },
  promotions: { label: 'Promotions', icon: 'Tag', path: '/admin/promotions' },
  inventory: { label: 'Inventory', icon: 'Package', path: '/admin/inventory' },
  'inventory-management': { label: 'Inventory Management', icon: 'BarChart3', path: '/admin/inventory-management' },
} as const;

/**
 * Get navigation items that user has access to
 */
export function getAccessibleNavigation(user: IUser | null) {
  const accessiblePages = getAccessiblePages(user);
  
  return Object.entries(ADMIN_PAGES)
    .filter(([pageKey]) => accessiblePages.includes(pageKey))
    .map(([pageKey, pageData]) => ({
      key: pageKey,
      ...pageData
    }));
} 