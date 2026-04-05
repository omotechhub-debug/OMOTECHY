"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Star, User, UserCheck } from "lucide-react"

interface TestimonialCardProps {
  testimonial: {
    _id: string
    name: string
    role?: string
    content: string
    rating: number
    image?: string
    status?: string
    submittedAt?: string
    gender?: 'male' | 'female'
  }
}

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  // Gender-specific icon component
  const GenderIcon = ({ gender }: { gender?: 'male' | 'female' }) => {
    if (gender === 'male') {
      return (
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
          <User className="w-6 h-6 text-blue-600" />
        </div>
      )
    } else if (gender === 'female') {
      return (
        <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center border-2 border-pink-200">
          <UserCheck className="w-6 h-6 text-pink-600" />
        </div>
      )
    } else {
      // Fallback for testimonials without gender
      return (
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
          <User className="w-6 h-6 text-gray-600" />
        </div>
      )
    }
  }

  return (
    <motion.div className="bg-white rounded-2xl p-6 luxury-shadow h-full flex flex-col" whileHover={{ y: -5 }}>
      <div className="flex items-center gap-4 mb-4">
        <GenderIcon gender={testimonial.gender} />
        <div>
          <h4 className="font-semibold">{testimonial.name}</h4>
          <p className="text-text-light text-sm">{testimonial.role || "Client"}</p>
        </div>
      </div>

      <div className="flex mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < testimonial.rating ? "fill-accent text-accent" : "fill-muted text-muted"}`}
          />
        ))}
      </div>

      <p className="text-text-light text-sm flex-grow">{testimonial.content}</p>

      <div className="mt-4 flex justify-end">
        <div className="w-8 h-8">
          <svg viewBox="0 0 24 24" fill="none" className="text-accent opacity-20">
            <path
              d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.039 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
    </motion.div>
  )
}
