"use client"

import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function TermsOfServicePage() {
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
              <h1 className="text-4xl md:text-5xl font-bold mb-3 text-[#263C7C]">Terms of Service</h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                These terms govern your use of our services. Please read them carefully.
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
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">1. Acceptance of Terms</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      By accessing and using OMOTECH HUB's services, you accept and agree to be bound by 
                      the terms and provision of this agreement. If you do not agree to abide by the above, 
                      please do not use this service.
                    </p>
                  </div>
                </div>

                <div className="border-l-4 border-[#8B99B9] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">2. Services Description</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>OMOTECH HUB provides the following services:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Electronics Retail & Services:</strong> Sales, repairs, and maintenance of laptops, desktops, smartphones, tablets, printers, TVs, and home appliances</li>
                      <li><strong>Gas Refilling & Supply:</strong> Gas cylinder refilling, exchange, delivery, and safety inspections</li>
                      <li><strong>T-Shirt Printing & Branding:</strong> Custom printing, bulk orders, graphic design, and branded merchandise</li>
                      <li><strong>Technical Support:</strong> Software installation, system optimization, networking setup, and data recovery</li>
                    </ul>
                  </div>
                </div>

                <div className="border-l-4 border-[#263C7C] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">3. Service Terms</h2>
                  <div className="space-y-4 text-gray-600">
                    <h3 className="text-xl font-semibold mb-2">Electronics Services</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>All repairs are performed by certified technicians</li>
                      <li>Warranty terms vary by service and will be communicated before work begins</li>
                      <li>Data backup is recommended before any repair work</li>
                      <li>We are not responsible for data loss during repairs unless caused by our negligence</li>
                    </ul>
                    
                    <h3 className="text-xl font-semibold mb-2 mt-6">Gas Services</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>All gas cylinders are certified and safe for use</li>
                      <li>Delivery is subject to availability and location</li>
                      <li>Safety inspections are performed by qualified technicians</li>
                      <li>Customers must follow all safety guidelines provided</li>
                    </ul>
                    
                    <h3 className="text-xl font-semibold mb-2 mt-6">Printing Services</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Design approval is required before printing begins</li>
                      <li>Bulk orders may have extended delivery times</li>
                      <li>Color variations may occur due to different materials and printing methods</li>
                      <li>Custom designs are subject to copyright and trademark laws</li>
                    </ul>
                  </div>
                </div>

                <div className="border-l-4 border-[#8B99B9] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">4. Pricing and Payment</h2>
                  <div className="space-y-4 text-gray-600">
                    <ul className="list-disc pl-6 space-y-2">
                      <li>All prices are subject to change without notice</li>
                      <li>Quotes are valid for 7 days unless otherwise specified</li>
                      <li>Payment is due upon completion of services unless credit terms are agreed</li>
                      <li>We accept cash, mobile money, and bank transfers</li>
                      <li>Additional charges may apply for urgent services or special requirements</li>
                    </ul>
                  </div>
                </div>

                <div className="border-l-4 border-[#263C7C] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">5. Customer Responsibilities</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>Customers are responsible for:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Providing accurate information about service requirements</li>
                      <li>Backing up important data before electronics repairs</li>
                      <li>Following safety guidelines for gas services</li>
                      <li>Providing clear design specifications for printing services</li>
                      <li>Making payments on time as agreed</li>
                      <li>Picking up completed items within 30 days or storage fees may apply</li>
                    </ul>
                  </div>
                </div>

                <div className="border-l-4 border-[#8B99B9] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">6. Warranty and Guarantees</h2>
                  <div className="space-y-4 text-gray-600">
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Electronics repairs come with a 90-day warranty on workmanship</li>
                      <li>Warranty does not cover damage caused by misuse or accidents</li>
                      <li>Gas cylinders are guaranteed to be safe and properly filled</li>
                      <li>Printing services are guaranteed to match approved designs</li>
                      <li>Warranty claims must be made within the specified time period</li>
                    </ul>
                  </div>
                </div>

                <div className="border-l-4 border-[#263C7C] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">7. Limitation of Liability</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      OMOTECH HUB's liability is limited to the cost of the service provided. We are not 
                      liable for any indirect, incidental, or consequential damages. Our total liability 
                      shall not exceed the amount paid for the specific service.
                    </p>
                  </div>
                </div>

                <div className="border-l-4 border-[#8B99B9] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">8. Cancellation and Refunds</h2>
                  <div className="space-y-4 text-gray-600">
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Services may be cancelled before work begins with full refund</li>
                      <li>Partial refunds may be available if work is partially completed</li>
                      <li>No refunds for completed services unless there is a breach of warranty</li>
                      <li>Refund requests must be made within 7 days of service completion</li>
                    </ul>
                  </div>
                </div>

                <div className="border-l-4 border-[#263C7C] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">9. Intellectual Property</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      All designs, logos, and content created by OMOTECH HUB remain our intellectual property. 
                      Customers retain rights to their own designs and content provided to us.
                    </p>
                  </div>
                </div>

                <div className="border-l-4 border-[#8B99B9] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">10. Privacy</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      Your privacy is important to us. Please review our Privacy Policy to understand 
                      how we collect, use, and protect your information.
                    </p>
                  </div>
                </div>

                <div className="border-l-4 border-[#263C7C] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">11. Governing Law</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      These terms are governed by the laws of Kenya. Any disputes will be resolved 
                      through the courts of Kenya.
                    </p>
                  </div>
                </div>

                <div className="border-l-4 border-[#8B99B9] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">12. Changes to Terms</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      We reserve the right to modify these terms at any time. Changes will be posted 
                      on this page and will become effective immediately upon posting.
                    </p>
                  </div>
                </div>

                <div className="border-l-4 border-[#263C7C] pl-6">
                  <h2 className="text-2xl font-bold mb-4 text-[#263C7C]">13. Contact Information</h2>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      If you have any questions about these Terms of Service, please contact us:
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
