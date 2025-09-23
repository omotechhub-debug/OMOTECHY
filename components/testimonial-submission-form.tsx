"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Star, Send, CheckCircle, User, MessageSquare, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TestimonialSubmissionFormProps {
  onClose?: () => void
}

export function TestimonialSubmissionForm({ onClose }: TestimonialSubmissionFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    content: "",
    rating: 5,
    email: "",
    phone: "",
    gender: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user starts typing
    if (error) setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚀 Starting form submission...')
    setIsSubmitting(true)
    setError("")
    
    // Simple validation
    if (!formData.name || !formData.content || !formData.rating || !formData.gender) {
      setError('Please fill in all required fields')
      setIsSubmitting(false)
      return
    }
    
    if (formData.content.length < 10) {
      setError('Testimonial must be at least 10 characters long')
      setIsSubmitting(false)
      return
    }
    
    try {
      console.log('📤 Sending data to API:', formData)
      
      const response = await fetch('/api/testimonials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          content: formData.content,
          rating: formData.rating,
          email: formData.email,
          phone: formData.phone,
          gender: formData.gender,
        }),
      })
      
      console.log('📥 Response status:', response.status)
      
      if (response.status === 201 || response.status === 200) {
        const result = await response.json()
        console.log('✅ Success:', result)
        setIsSubmitted(true)
        
        // Reset form after 3 seconds
        setTimeout(() => {
          setIsSubmitted(false)
          setFormData({
            name: "",
            role: "",
            content: "",
            rating: 5,
            email: "",
            phone: "",
            gender: "",
          })
          if (onClose) onClose()
        }, 3000)
      } else {
        const errorText = await response.text()
        console.error('❌ Error response:', errorText)
        setError(`Submission failed: ${response.status} ${response.statusText}`)
      }
      
    } catch (err) {
      console.error('❌ Network error:', err)
      setError('Network error. Please check your connection and try again.')
    } finally {
      console.log('🏁 Submission process completed')
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <motion.div
        className="text-center py-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Testimonial Submitted!</h3>
        <p className="text-text-light">Thank you for your feedback. Your testimonial will be reviewed and published soon.</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="bg-white rounded-2xl p-6 luxury-shadow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Share Your Experience</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-light" />
              <Input
                type="text"
                placeholder="Your full name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Gender *</label>
            <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Role/Title</label>
            <Input
              type="text"
              placeholder="e.g., Business Owner, Executive"
              value={formData.role}
              onChange={(e) => handleInputChange("role", e.target.value)}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email (Optional)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-light" />
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Phone (Optional)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-light" />
              <Input
                type="tel"
                placeholder="Your phone number"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Rating *</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleInputChange("rating", star)}
                className="focus:outline-none"
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    star <= formData.rating
                      ? "fill-accent text-accent"
                      : "fill-muted text-muted hover:fill-accent/50 hover:text-accent/50"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-sm text-text-light mt-1">
            {formData.rating === 5 && "Excellent"}
            {formData.rating === 4 && "Very Good"}
            {formData.rating === 3 && "Good"}
            {formData.rating === 2 && "Fair"}
            {formData.rating === 1 && "Poor"}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Your Testimonial *</label>
          <Textarea
            placeholder="Tell us about your experience with our services..."
            value={formData.content}
            onChange={(e) => handleInputChange("content", e.target.value)}
            rows={5}
            className="resize-none"
            required
          />
          <p className="text-xs text-text-light mt-1">
            Minimum 10 characters, maximum 1000 characters. Your testimonial will be reviewed before publishing.
          </p>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit Testimonial
            </>
          )}
        </Button>
      </form>
    </motion.div>
  )
} 