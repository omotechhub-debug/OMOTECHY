"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  approved: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  loginWithGoogle: (idToken: string) => Promise<{ success: boolean; error?: string; message?: string }>
  logout: () => void
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastAuthCheck, setLastAuthCheck] = useState(0)

  const isAuthenticated = !!user && user.isActive && user.approved
  const isAdmin = isAuthenticated && (user?.role === 'admin' || user?.role === 'superadmin')
  const isSuperAdmin = isAuthenticated && user?.role === 'superadmin'

  const checkAuth = useCallback(async () => {
    // Debounce auth checks - only allow one check per 2 seconds
    const now = Date.now()
    if (now - lastAuthCheck < 2000) {
      return
    }
    setLastAuthCheck(now)

    try {
      setIsLoading(true)
      const token = localStorage.getItem('clientAuthToken')
      
      if (!token) {
        setUser(null)
        setIsLoading(false)
        return
      }

      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      try {
        const response = await fetch('/api/auth/client-me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const userData = await response.json()
          if (userData.success && userData.user) {
            setUser(userData.user)
          } else {
            // Invalid response format
            console.warn('Invalid response format from auth API:', userData)
            localStorage.removeItem('clientAuthToken')
            setUser(null)
          }
        } else {
          // Token is invalid or expired
          console.warn('Auth API returned error:', response.status, response.statusText)
          localStorage.removeItem('clientAuthToken')
          setUser(null)
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        throw fetchError
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Auth check timed out, keeping existing state')
          return // Don't clear user state on timeout
        }
        
        if (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          // Network error - keep token but don't update user state
          console.log('Network error during auth check, keeping existing state')
          return
        }
      }
      
      // For other errors, clear the token
      localStorage.removeItem('clientAuthToken')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [lastAuthCheck])

  useEffect(() => {
    // Only check auth if we're in the browser and have a token
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('clientAuthToken')
      if (token) {
        checkAuth()
      } else {
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }, [checkAuth])

  // Add a listener for storage changes to sync auth state across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'clientAuthToken') {
        if (e.newValue === null) {
          // Token was removed, logout
          setUser(null)
        } else if (e.newValue && !user) {
          // Token was added in another tab, check auth
          checkAuth()
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [user, checkAuth])

  // Re-check auth when the component becomes visible (user switches back to tab)
  // But only if we don't have a user and there's a token
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !isLoading && !user) {
        const token = localStorage.getItem('clientAuthToken')
        if (token) {
          checkAuth()
        }
      }
    }

    // Only add listener if we're in the browser
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isLoading, user, checkAuth])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/client-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('clientAuthToken', data.token)
        setUser(data.user)
        return true
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  const signup = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/client-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('clientAuthToken', data.token)
        setUser(data.user)
        return { success: true }
      } else {
        const errorData = await response.json()
        return { success: false, error: errorData.message || 'Signup failed' }
      }
    } catch (error) {
      console.error('Signup failed:', error)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const loginWithGoogle = async (idToken: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      console.log('Calling client Google login API...')
      const response = await fetch('/api/auth/client-google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      console.log('Client Google login API response status:', response.status)
      const contentType = response.headers.get('content-type')
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response received:', text.substring(0, 200))
        if (response.status === 404) {
          return { success: false, error: 'API endpoint not found. Please check server configuration.' }
        }
        return { success: false, error: `Server error (${response.status}). Please check server logs.` }
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError: any) {
        console.error('Failed to parse JSON response:', parseError)
        return { success: false, error: 'Invalid server response format. Please try again.' };
      }

      console.log('Client Google login API response data:', data)

      if (response.ok && data.success) {
        setUser(data.user);
        localStorage.setItem('clientAuthToken', data.token);
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true, message: data.message || 'Login successful! Redirecting...' };
      } else {
        if (data.code === 'ADMIN_ACCOUNT') {
          return { success: false, error: data.error || 'This is an admin account. Please use the admin login page.' };
        }
        return { success: false, error: data.error || 'Google sign-in failed. Please try again.' };
      }
    } catch (error: any) {
      console.error('Client Google login fetch error:', error)
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        return { success: false, error: 'Network error. Please check your connection and try again.' };
      }
      return { success: false, error: error?.message || 'Network error. Please check your connection.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('clientAuthToken')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated,
      isAdmin,
      isSuperAdmin,
      login,
      signup,
      loginWithGoogle,
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
