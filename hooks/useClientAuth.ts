"use client"

import { useAuth } from '@/contexts/AuthContext'

export function useClientAuth() {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuth()

  return {
    user,
    isAuthenticated,
    isLoading,
    checkAuth
  }
}
