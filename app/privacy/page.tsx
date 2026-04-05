"use client"

import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <motion.section
        className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-br from-[#F0F2FE] to-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="container px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="text-center bg-white rounded-2xl px-4 py-6 md:py-8 md:px-8 mb-4 shadow-lg border border-[#8B99B9]/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-3 text-[#263C7C]">Privacy Policy</h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Your privacy is important to us. This policy explains how we collect, use, and protect your information.
              </p>
              <p className="text-sm text-[#8B99B9] mt-2 font-medium">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </motion.div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-0 w-64 h-64 bg-[#263C7C]/5 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-[#8B99B9]/5 rounded-full blur-3xl -z-10"></div>
      </motion.section>

      {/* Content Section */}
      <section className="py-20 bg-gradient-to-br from-white to-[#F0F2FE]">
        <div className="container px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-[#8B99B9]/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="space-y-10">
                <div className="border-l-4 border-[#263C7C] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">1. Information We Collect</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      We collect information you provide directly to us, such as when you:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Contact us for services (electronics repair, gas refilling, printing)</li>
                      <li>Request quotes or consultations</li>
                      <li>Subscribe to our newsletter</li>
                      <li>Fill out contact forms</li>
                      <li>Communicate with us via phone, email, or WhatsApp</li>
                    </ul>
                    <p>
                      This information may include your name, email address, phone number, 
                      service requirements, and any other information you choose to provide.
                    </p>
                  </div>
                </div>

                <div className="border-l-4 border-[#263C7C] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">2. How We Use Your Information</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>We use the information we collect to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Provide and improve our services</li>
                      <li>Process your service requests and quotes</li>
                      <li>Communicate with you about your services</li>
                      <li>Send you technical information and updates</li>
                      <li>Respond to your inquiries and provide customer support</li>
                      <li>Send you marketing communications (with your consent)</li>
                      <li>Comply with legal obligations</li>
                    </ul>
                  </div>
                </div>

                <div className="border-l-4 border-[#8B99B9] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">3. Information Sharing</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      We do not sell, trade, or otherwise transfer your personal information to third parties, 
                      except in the following circumstances:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>With your explicit consent</li>
                      <li>To comply with legal requirements</li>
                      <li>To protect our rights and safety</li>
                      <li>With service providers who assist us in operating our business (under strict confidentiality agreements)</li>
                    </ul>
                  </div>
                </div>

                <div className="border-l-4 border-[#263C7C] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">4. Data Security</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      We implement appropriate security measures to protect your personal information against 
                      unauthorized access, alteration, disclosure, or destruction. However, no method of 
                      transmission over the internet is 100% secure.
                    </p>
                  </div>
                </div>

                <div className="border-l-4 border-[#8B99B9] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">5. Your Rights</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>You have the right to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Access your personal information</li>
                      <li>Correct inaccurate information</li>
                      <li>Request deletion of your information</li>
                      <li>Opt-out of marketing communications</li>
                      <li>Withdraw consent at any time</li>
                    </ul>
                  </div>
                </div>

                <div className="border-l-4 border-[#263C7C] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">6. Cookies and Tracking</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      We may use cookies and similar technologies to improve your experience on our website. 
                      You can control cookie settings through your browser preferences.
                    </p>
                  </div>
                </div>

                <div className="border-l-4 border-[#8B99B9] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">7. Third-Party Links</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      Our website may contain links to third-party websites. We are not responsible for 
                      the privacy practices of these external sites.
                    </p>
                  </div>
                </div>

                <div className="border-l-4 border-[#263C7C] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">8. Changes to This Policy</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      We may update this Privacy Policy from time to time. We will notify you of any 
                      changes by posting the new policy on this page and updating the "Last updated" date.
                    </p>
                  </div>
                </div>

                <div className="border-l-4 border-[#8B99B9] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">9. Contact Us</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      If you have any questions about this Privacy Policy or our data practices, 
                      please contact us:
                    </p>
                    <div className="bg-gradient-to-r from-[#F0F2FE] to-white p-6 rounded-xl border border-[#8B99B9]/20 shadow-md">
                      <p className="font-bold text-[#263C7C] text-lg mb-3">OMOTECH HUB Computers & Services</p>
                      <p className="mb-2">Phone: <a href="tel:+254740802704" className="text-[#263C7C] hover:text-[#8B99B9] hover:underline font-medium">+254 740 802 704</a></p>
                      <p>Email: <a href="mailto:omotechhub@gmail.com" className="text-[#263C7C] hover:text-[#8B99B9] hover:underline font-medium">omotechhub@gmail.com</a></p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
