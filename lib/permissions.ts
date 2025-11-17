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
  role: 'superadmin' | 'admin' | 'manager' | 'user';
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

  // Superadmin has access to all pages
  if (user.role === 'superadmin') {
    return true;
  }

  // Regular users should not access admin pages at all
  if (user.role === 'user') {
    return false;
  }

  // Core pages that all admins should have access to by default
  const coreAdminPages = ['dashboard', 'orders', 'pos', 'customers', 'services', 'expenses', 'stations'];
  if (user.role === 'admin' && coreAdminPages.includes(page)) {
    return true;
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

  // Superadmin has view-only access (no editing)
  if (user.role === 'superadmin') {
    return false;
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

  // Superadmin has view-only access (no deleting)
  if (user.role === 'superadmin') {
    return false;
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

  // Superadmin has access to all pages
  if (user.role === 'superadmin') {
    return [
      'dashboard', 'orders', 'pos', 'customers', 'services', 'reports', 
      'mpesa-transactions', 'users', 'expenses', 'gallery', 'testimonials', 
      'promotions', 'inventory', 'inventory-management', 'stations', 'settings', 'social-media'
    ];
  }

  // Manager has very limited access - only POS, Orders, and Expenses
  if (user.role === 'manager') {
    return ['dashboard', 'orders', 'pos', 'expenses'];
  }

  // Regular users should not access admin pages at all
  if (user.role === 'user') {
    return [];
  }

  // Core pages that all admins should have access to by default
  const coreAdminPages = ['dashboard', 'orders', 'pos', 'customers', 'services', 'expenses', 'stations'];
  
  // Return pages that admin user can view
  if (user.pagePermissions && Array.isArray(user.pagePermissions)) {
    const permissionPages = user.pagePermissions
      .filter(p => p.canView)
      .map(p => p.page);
    
    // Merge with core pages and remove duplicates
    return [...new Set([...coreAdminPages, ...permissionPages])];
  }

  // If no pagePermissions, return core pages
  return coreAdminPages;
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
 * Check if user is manager
 */
export function isManagerUser(user: IUser | null): boolean {
  if (!user || !user.isActive || !user.approved) {
    return false;
  }
  
  return user.role === 'manager';
}

/**
 * Check if user is admin, manager, or superadmin
 */
export function isAdminOrManagerUser(user: IUser | null): boolean {
  if (!user || !user.isActive || !user.approved) {
    return false;
  }
  
  return ['admin', 'manager', 'superadmin'].includes(user.role);
}

/**
 * Check if user can add orders (POS functionality)
 */
export function canAddOrders(user: IUser | null): boolean {
  if (!user || !user.isActive || !user.approved) {
    return false;
  }

  // Superadmin can add orders (with station selection)
  if (user.role === 'superadmin') {
    return true;
  }

  // Managers can add orders
  if (user.role === 'manager') {
    return true;
  }

  // Regular admins cannot add orders (view only)
  if (user.role === 'admin') {
    return false;
  }

  return false;
}

/**
 * Check if user can add expenses
 */
export function canAddExpenses(user: IUser | null): boolean {
  if (!user || !user.isActive || !user.approved) {
    return false;
  }

  // Superadmin has view-only access (cannot add expenses)
  if (user.role === 'superadmin') {
    return false;
  }

  // Managers can add expenses
  if (user.role === 'manager') {
    return true;
  }

  // Regular admins cannot add expenses (view only)
  if (user.role === 'admin') {
    return false;
  }

  return false;
}

/**
 * Check if user can add inventory (based on superadmin permission)
 */
export function canAddInventory(user: IUser | null): boolean {
  if (!user || !user.isActive || !user.approved) {
    return false;
  }

  // Superadmin can add inventory
  if (user.role === 'superadmin') {
    return true;
  }

  // Check if admin has inventory add permission
  if (user.role === 'admin') {
    if (user.pagePermissions && Array.isArray(user.pagePermissions)) {
      const inventoryPermission = user.pagePermissions.find(p => p.page === 'inventory');
      return inventoryPermission ? inventoryPermission.canEdit : false;
    }
    return false;
  }

  // Managers cannot add inventory
  if (user.role === 'manager') {
    return false;
  }

  return false;
}

/**
 * Check if user can view all orders from different stations
 */
export function canViewAllOrders(user: IUser | null): boolean {
  if (!user || !user.isActive || !user.approved) {
    return false;
  }

  // Superadmin and admin can view all orders
  if (user.role === 'superadmin' || user.role === 'admin') {
    return true;
  }

  // Managers can only view their station's orders
  if (user.role === 'manager') {
    return false;
  }

  return false;
}

/**
 * Check if user can view all expenses from different stations
 */
export function canViewAllExpenses(user: IUser | null): boolean {
  if (!user || !user.isActive || !user.approved) {
    return false;
  }

  // Superadmin and admin can view all expenses
  if (user.role === 'superadmin' || user.role === 'admin') {
    return true;
  }

  // Managers can only view their station's expenses
  if (user.role === 'manager') {
    return false;
  }

  return false;
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
  stations: { label: 'Stations', icon: 'Building', path: '/admin/stations' },
  'social-media': { label: 'Social Media', icon: 'MessageSquare', path: '/admin/social-media' },
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