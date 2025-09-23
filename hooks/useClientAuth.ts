"use client"

import { useAuth } from '@/contexts/AuthContext'

export function useClientAuth() {
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuth()

  return {
    user,
    isAuthenticated,
    isLoading,
    checkAuth,
    logout
  }
}
