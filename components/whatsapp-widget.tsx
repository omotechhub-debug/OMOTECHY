"use client"

import { useState, useEffect } from "react"
import { MessageCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function WhatsAppWidget() {
  const [isVisible, setIsVisible] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const phoneNumber = "+254740802704" // OMOTECH HUB WhatsApp number with + for display
  const waPhoneNumber = "254740802704" // wa.me format (no +)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed bottom-20 left-4 z-40">
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                className="mb-4 p-4 bg-white rounded-2xl luxury-shadow w-72"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center mr-3">
                    <MessageCircle className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">OMOTECH HUB</h4>
                    <p className="text-xs text-text-light">Typically replies within minutes</p>
                  </div>
                </div>
                <p className="text-sm mb-4">Hello! How can we help you with your technology and service needs today?</p>
                <a
                  href={`https://wa.me/${waPhoneNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-2.5 bg-[#25D366] text-white text-center rounded-xl font-medium text-sm hover:bg-[#20BD5A] transition-colors"
                >
                  Start Chat
                </a>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(!isOpen)}
            className="w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
          >
            <MessageCircle className="text-white w-7 h-7" />
          </motion.button>
        </div>
      )}
    </AnimatePresence>
  )
}
