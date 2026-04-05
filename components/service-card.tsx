"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"

interface ServiceCardProps {
  service: {
    id: string
    title: string
    description: string
    icon: React.ReactNode
    price: string
    perUnit: string
  }
}

export function ServiceCard({ service }: ServiceCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className="relative h-[320px] bg-gradient-to-br from-white via-[#F0F2FE]/50 to-[#E8EBF7]/30 rounded-2xl p-6 luxury-shadow overflow-hidden border border-[#263C7C]/10"
      whileHover={{ y: -5 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col h-full">
        <div className="mb-4 p-3 bg-gradient-to-br from-[#263C7C]/10 to-[#8B99B9]/20 rounded-xl w-fit">
          {service.icon}
        </div>
        <h3 className="text-xl font-semibold mb-2 text-[#263C7C]">{service.title}</h3>
        <p className="text-gray-600 text-sm flex-grow leading-relaxed">{service.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-[#263C7C]">{service.price}</span>
            <span className="text-gray-500 text-xs"> {service.perUnit}</span>
          </div>
          <Button variant="ghost" size="sm" className="rounded-full p-0 w-10 h-10 bg-[#263C7C]/10 hover:bg-[#263C7C]/20 text-[#263C7C]">
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-[#263C7C] via-[#1e2f5f] to-[#8B99B9] p-6 flex flex-col justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <div className="mb-4 p-3 bg-white/20 rounded-xl w-fit backdrop-blur-sm">
            <div className="text-white">{service.icon}</div>
          </div>
          <h3 className="text-xl font-semibold mb-2 text-white">{service.title}</h3>
          <p className="text-white/90 text-sm leading-relaxed">{service.description}</p>
        </div>
        <div className="mt-4">
          <Link href="/contact">
            <Button className="bg-white text-[#263C7C] hover:bg-white/90 rounded-xl w-full font-semibold shadow-lg">
              Contact Us
            </Button>
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}
