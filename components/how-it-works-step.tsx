"use client"

import { motion } from "framer-motion"

interface HowItWorksStepProps {
  step: {
    id: number
    title: string
    description: string
    icon: string
  }
}

export function HowItWorksStep({ step }: HowItWorksStepProps) {
  return (
    <motion.div className="relative" whileHover={{ scale: 1.03, y: -5 }}>
      <div className="bg-gradient-to-br from-white via-[#F0F2FE]/30 to-[#E8EBF7]/20 rounded-2xl p-8 luxury-shadow h-full border border-[#263C7C]/10 hover:shadow-xl transition-all duration-300">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#263C7C]/10 to-[#8B99B9]/20 flex items-center justify-center mb-6">
          <span className="font-bold text-2xl text-[#263C7C]">{step.icon}</span>
        </div>
        <h3 className="text-xl font-semibold mb-3 text-[#263C7C]">{step.title}</h3>
        <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
      </div>

      {step.id < 4 && (
        <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
          <div className="w-6 h-6 rounded-full bg-[#263C7C]/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 5L16 12L9 19" stroke="#263C7C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}
    </motion.div>
  )
}
