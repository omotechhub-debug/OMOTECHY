"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { 
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Wrench,
  Flame,
  Shirt,
  CreditCard,
  Truck,
  Shield,
  Clock,
  Phone,
  Mail
} from "lucide-react"

interface FAQ {
  question: string
  answer: string
  category: string
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const [heroRef, heroInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const [faqRef, faqInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const faqs: FAQ[] = [
    // Electronics & Repair
    {
      category: "electronics",
      question: "What electronics do you repair?",
      answer: "We repair a wide range of electronics including laptops, desktops, smartphones, tablets, printers, TVs, audio systems, gaming consoles, and home appliances. We also provide data recovery, system optimization, and custom PC building services."
    },
    {
      category: "electronics",
      question: "How long do repairs take?",
      answer: "Simple repairs like screen replacements can be done same-day (2-3 hours). Complex issues such as motherboard repairs or data recovery may take 2-7 days depending on the problem. We always provide an estimated timeline when you bring in your device."
    },
    {
      category: "electronics",
      question: "Do you offer warranty on repairs?",
      answer: "Yes! We provide warranty on all our repairs. Screen replacements come with a 1-year warranty on parts, smartphone repairs have a 6-month warranty, and other repairs include a 3-month warranty. We also offer warranty on labor."
    },
    {
      category: "electronics",
      question: "Do you use original parts?",
      answer: "We use high-quality replacement parts. For some devices, we can source original manufacturer parts. We always discuss part options and pricing with you before proceeding with any repair."
    },
    {
      category: "electronics",
      question: "Can you recover data from damaged devices?",
      answer: "Yes, we offer professional data recovery services for hard drives, SSDs, memory cards, and damaged devices. Our success rate is over 90% and we handle all data securely and confidentially."
    },
    {
      category: "electronics",
      question: "Do you offer system optimization services?",
      answer: "Yes, we provide complete system optimization including virus and malware removal, software updates, disk cleanup, performance enhancement, and preventive maintenance to keep your devices running smoothly."
    },
    {
      category: "electronics",
      question: "Can you build custom PCs?",
      answer: "Absolutely! We build custom PCs tailored to your needs - whether for gaming, work, or general use. We help you choose the right components and provide assembly, installation, and setup services."
    },
    // Gas Services
    {
      category: "gas",
      question: "Do you offer gas cylinder delivery?",
      answer: "Yes, we provide gas cylinder refilling, exchange, and home delivery services. We deliver to your location and can also provide safe installation and safety inspections."
    },
    {
      category: "gas",
      question: "How do I order a gas cylinder?",
      answer: "You can order a gas cylinder by calling us at +254 740 802 704 or +254 745 755 707, or by placing an order through our website. We'll arrange delivery to your location at a convenient time."
    },
    {
      category: "gas",
      question: "Do you provide gas cylinder installation?",
      answer: "Yes, we offer professional gas cylinder installation and safety inspections to ensure your setup is safe and compliant with safety standards."
    },
    {
      category: "gas",
      question: "What areas do you deliver to?",
      answer: "We deliver gas cylinders to Kutus and surrounding areas. Please contact us to confirm if we deliver to your specific location."
    },
    // Printing Services
    {
      category: "printing",
      question: "What printing services do you offer?",
      answer: "We offer custom T-shirt printing, bulk printing for events, branded merchandise, and graphic design services. We use various techniques including heat transfer, vinyl printing, and sublimation to create high-quality prints."
    },
    {
      category: "printing",
      question: "Do you do bulk orders for events?",
      answer: "Yes, we handle bulk printing orders for events, corporate branding, team uniforms, and promotional merchandise. Contact us with your requirements and we'll provide a quote."
    },
    {
      category: "printing",
      question: "How long does printing take?",
      answer: "Small orders (1-5 items) can typically be ready within 24-48 hours. Bulk orders depend on quantity but we usually complete them within 3-7 business days. Rush orders can be accommodated with prior arrangement."
    },
    {
      category: "printing",
      question: "Can you create custom designs?",
      answer: "Yes, we offer graphic design services and can create custom designs based on your ideas and requirements. Our design team will work with you to bring your vision to life."
    },
    // Ordering & Payment
    {
      category: "ordering",
      question: "How do I place an order?",
      answer: "You can place an order by calling us, visiting our shop, or through our website. For repairs, you can book an appointment online or bring your device to our shop for assessment."
    },
    {
      category: "ordering",
      question: "What payment methods do you accept?",
      answer: "We accept cash, M-Pesa (M-Pesa STK and C2B), bank transfers, and card payments. Payment can be made in full or partially, with the balance due upon completion of service."
    },
    {
      category: "ordering",
      question: "Can I pay in installments?",
      answer: "Yes, we offer flexible payment options. You can make partial payments and pay the remaining balance when you collect your device or receive your order. We'll provide a receipt for all payments."
    },
    {
      category: "ordering",
      question: "Do you provide receipts?",
      answer: "Yes, we provide detailed receipts for all services and purchases. Receipts can be printed or emailed to you, and include order details, payment information, and warranty information."
    },
    // Delivery & Pickup
    {
      category: "delivery",
      question: "Do you offer pickup and delivery services?",
      answer: "Yes, we offer pickup and delivery services for repairs and orders. There may be a small fee for delivery depending on your location. Contact us to arrange pickup or delivery."
    },
    {
      category: "delivery",
      question: "What are your business hours?",
      answer: "We're open Monday to Friday from 8:00 AM to 6:00 PM, and Saturdays from 9:00 AM to 4:00 PM. We're closed on Sundays. Emergency repairs may be accommodated outside these hours by prior arrangement."
    },
    {
      category: "delivery",
      question: "Can I track my order?",
      answer: "Yes, once you place an order, we'll provide you with an order number. You can call us anytime to check on the status of your order or repair."
    },
    // General
    {
      category: "general",
      question: "Where are you located?",
      answer: "We're located in Kutus, Kenya. You can visit our shop during business hours or contact us for directions. We also provide home service for certain repairs and installations."
    },
    {
      category: "general",
      question: "How can I contact you?",
      answer: "You can reach us by phone at +254 740 802 704 or +254 745 755 707, by email at omotechhub@gmail.com, or by visiting our shop in Kutus. We're also available on WhatsApp for quick inquiries."
    },
    {
      category: "general",
      question: "Do you offer consultations?",
      answer: "Yes, we offer free consultations for all our services. Whether you need advice on electronics, gas services, or printing, our experts are happy to help you make the right decision."
    },
    {
      category: "general",
      question: "What makes OMOTECH-HUB different?",
      answer: "We're a one-stop shop offering electronics repair, gas refilling, and printing services all under one roof. We combine technology expertise, quality service, and customer care to provide comprehensive solutions for all your needs."
    }
  ]

  const categories = [
    { id: "all", name: "All Questions", icon: HelpCircle },
    { id: "electronics", name: "Electronics & Repair", icon: Wrench },
    { id: "gas", name: "Gas Services", icon: Flame },
    { id: "printing", name: "Printing", icon: Shirt },
    { id: "ordering", name: "Ordering & Payment", icon: CreditCard },
    { id: "delivery", name: "Delivery & Pickup", icon: Truck },
    { id: "general", name: "General", icon: Shield }
  ]

  const filteredFAQs = selectedCategory === "all" 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory)

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-br from-[#263C7C] via-[#1e2f5f] to-[#152041]"
        initial={{ opacity: 0 }}
        animate={heroInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
      >
        <div className="container px-4 md:px-6 relative z-10">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8">
              Find answers to common questions about our electronics repair, gas refilling, and printing services
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* FAQ Categories */}
      <section className="py-12 bg-gray-50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
                    selectedCategory === category.id
                      ? "bg-[#263C7C] text-white luxury-shadow"
                      : "bg-white text-gray-700 hover:bg-gray-100 luxury-shadow"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{category.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section ref={faqRef} className="py-20">
        <div className="container px-4 md:px-6">
          <motion.div
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0 }}
            animate={faqInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="space-y-4">
              {filteredFAQs.map((faq, index) => (
                <motion.div
                  key={index}
                  className="bg-white rounded-xl luxury-shadow overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={faqInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-lg pr-4">{faq.question}</span>
                    {openIndex === index ? (
                      <ChevronUp className="w-5 h-5 text-[#263C7C] flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#263C7C] flex-shrink-0" />
                    )}
                  </button>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 text-text-light">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-gradient-to-br from-[#263C7C] to-[#1e2f5f]">
        <div className="container px-4 md:px-6">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Still Have Questions?
            </h2>
            <p className="text-lg text-white/90 mb-8">
              Can't find what you're looking for? Our team is here to help!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="tel:+254740802704"
                className="flex items-center gap-2 px-6 py-3 bg-white text-[#263C7C] rounded-xl font-semibold hover:bg-gray-100 transition-colors luxury-shadow"
              >
                <Phone className="w-5 h-5" />
                +254 740 802 704
              </a>
              <a
                href="mailto:omotechhub@gmail.com"
                className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white border-2 border-white rounded-xl font-semibold hover:bg-white/20 transition-colors"
              >
                <Mail className="w-5 h-5" />
                omotechhub@gmail.com
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

