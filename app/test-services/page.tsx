"use client"

import { useState, useEffect } from "react"

export default function TestServicesPage() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      console.log('Testing API...')
      const response = await fetch('/api/services?limit=50')
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)
      
      if (data.success) {
        console.log('Services found:', data.data.length)
        setServices(data.data)
      } else {
        setError(data.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Failed to fetch services')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Services Test Page</h1>
      <p className="mb-4">Found {services.length} services</p>
      
      {services.map((service: any) => (
        <div key={service._id} className="border p-4 mb-4 rounded">
          <h3 className="font-bold">{service.name}</h3>
          <p>{service.description}</p>
          <p>Category: {service.category}</p>
          <p>Price: {service.price}</p>
          <p>Active: {service.active ? 'Yes' : 'No'}</p>
        </div>
      ))}
    </div>
  )
} 