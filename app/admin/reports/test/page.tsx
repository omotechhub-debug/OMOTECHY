"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function TestReportsPage() {
  const { token } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testAPI = async () => {
    if (!token) {
      setError('No token found')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/reports?range=30', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)
      
      if (response.ok) {
        const responseData = await response.json()
        console.log('Response data:', responseData)
        setData(responseData)
      } else {
        const errorData = await response.json()
        console.log('Error data:', errorData)
        setError(errorData.error || 'Failed to fetch data')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      testAPI()
    }
  }, [token])

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Reports API Test</h1>
      
      <div className="mb-4">
        <p>Token: {token ? 'Present' : 'Missing'}</p>
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
        {error && <p className="text-red-600">Error: {error}</p>}
      </div>

      <button 
        onClick={testAPI}
        className="bg-blue-500 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? 'Testing...' : 'Test API'}
      </button>

      {data && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-2">API Response:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
} 