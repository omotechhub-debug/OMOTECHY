"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface IPagePermission {
  page: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'manager' | 'user';
  isActive: boolean;
  approved: boolean;
  pagePermissions: IPagePermission[];
  stationId?: string;
  managedStations?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; pendingApproval?: boolean; message?: string }>;
  loginWithGoogle: (idToken: string) => Promise<{ success: boolean; error?: string; pendingApproval?: boolean; message?: string; code?: string; email?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUserData: () => Promise<boolean>;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored auth data:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update state immediately
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authUser', JSON.stringify(data.user));
        
        // Add a small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return { 
          success: true, 
          user: data.user,
          message: data.message || 'Login successful! Redirecting to admin panel...'
        };
      } else {
        if (data.code === 'PENDING_APPROVAL' || data.error === 'Admin account is pending approval') {
          return { success: false, pendingApproval: true, error: data.error };
        }
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    try {
      console.log('Calling Google login API...')
      
      const response = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      console.log('Google login API response status:', response.status)
      console.log('Response Content-Type:', response.headers.get('content-type'))

      // Check content type first
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        // Response is not JSON, likely an HTML error page
        const text = await response.text()
        console.error('Non-JSON response received:', text.substring(0, 200))
        
        if (response.status === 404) {
          return { 
            success: false, 
            error: 'API endpoint not found. Please check server configuration.',
            code: 'ENDPOINT_NOT_FOUND'
          }
        }
        
        return { 
          success: false, 
          error: `Server error (${response.status}). Please check server logs.`,
          code: 'SERVER_ERROR'
        }
      }

      // Parse JSON response
      let data;
      try {
        data = await response.json();
      } catch (parseError: any) {
        console.error('Failed to parse JSON response:', parseError)
        return { 
          success: false, 
          error: 'Invalid server response format. Please try again.',
          code: 'PARSE_ERROR'
        };
      }

      console.log('Google login API response data:', data)

      if (response.ok && data.success) {
        // Update state immediately (same as regular login)
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authUser', JSON.stringify(data.user));
        
        // Add a small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return { 
          success: true, 
          user: data.user,
          message: data.message || 'Login successful! Redirecting to admin panel...'
        };
      } else {
        if (data.code === 'PENDING_APPROVAL' || data.error === 'Admin account is pending approval') {
          return { 
            success: false, 
            pendingApproval: true, 
            error: data.error,
            email: data.email 
          };
        }
        return { 
          success: false, 
          error: data.error || 'Login failed',
          code: data.code,
          email: data.email 
        };
      }
    } catch (error: any) {
      console.error('Google login fetch error:', error)
      console.error('Error details:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack
      })
      
      // More specific error messages
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        return { 
          success: false, 
          error: 'Network error. Please check your connection and try again.' 
        };
      }
      
      return { 
        success: false, 
        error: error?.message || 'Network error. Please check your connection.' 
      };
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  };

  const refreshUserData = async () => {
    try {
      const response = await fetch('/api/auth/client-me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('authUser', JSON.stringify(data.user));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return false;
    }
  };

  const logout = () => {
    // Clear state immediately
    setUser(null);
    setToken(null);
    
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    
    // Dispatch a custom event to notify all components about logout
    window.dispatchEvent(new CustomEvent('auth:logout'));
    
    // Force immediate redirect to login page
    // Using window.location.href ensures immediate navigation without React router delays
    window.location.href = '/admin/login';
  };

  // Add global logout event listener
  useEffect(() => {
    const handleGlobalLogout = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    };

    window.addEventListener('auth:logout', handleGlobalLogout);
    
    return () => {
      window.removeEventListener('auth:logout', handleGlobalLogout);
    };
  }, []);

  const value = {
    user,
    token,
    login,
    loginWithGoogle,
    signup,
    logout,
    refreshUserData,
    isLoading,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager',
    isSuperAdmin: user?.role === 'superadmin',
    isManager: user?.role === 'manager',
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 