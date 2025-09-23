"use client"

import { Poppins } from "next/font/google"
import { ShieldCheck } from "lucide-react"

const luxuryGreen = "#3A7D5D"
const luxuryBrown = "#BFA181"

export default function AdminEmployeesComingSoon() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 flex flex-col items-center max-w-lg w-full">
        <div className="mb-6 flex items-center justify-center">
          <ShieldCheck size={56} style={{ color: luxuryGreen }} />
        </div>
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-poppins font-bold text-center mb-4"
          style={{ color: luxuryGreen }}
        >
          Employees Management
        </h1>
        <p className="text-lg sm:text-xl text-center font-poppins mb-2" style={{ color: luxuryBrown }}>
          This feature is coming soon.
        </p>
        <p className="text-base text-gray-500 text-center font-poppins">
          You'll soon be able to manage your team, add new employees, and assign roles from this page.
        </p>
      </div>
      <style jsx global>{`
        .font-poppins {
          font-family: 'Poppins', sans-serif;
        }
      `}</style>
    </div>
  )
}
