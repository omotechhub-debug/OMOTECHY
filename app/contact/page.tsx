"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Send, 
  CheckCircle,
  MessageSquare,
  User,
  Building
} from "lucide-react"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const [heroRef, heroInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const [formRef, formInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const [infoRef, infoInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false)
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: ""
      })
    }, 3000)
  }

  const contactInfo = [
    {
      iconName: "Phone",
      title: "Phone",
      details: ["+254 740 802 704", "+254 745 755 707"],
      description: "Call us for immediate assistance"
    },
    {
      iconName: "Mail",
      title: "Email",
      details: ["omotechhub@gmail.com"],
      description: "Send us an email anytime"
    },
    {
      iconName: "MapPin",
      title: "Location",
      details: ["OMOTECH HUB", "Computers & Services"],
      description: "Visit our facility"
    },
    {
      iconName: "Clock",
      title: "Business Hours",
      details: ["Mon - Fri: 8:00 AM - 6:00 PM", "Sat: 9:00 AM - 4:00 PM"],
      description: "We're here when you need us"
    }
  ]

  const faqs = [
    {
      question: "What electronics do you repair?",
      answer: "We repair laptops, desktops, smartphones, tablets, printers, TVs, audio systems, and home appliances. We also provide data recovery and system optimization services."
    },
    {
      question: "Do you offer gas cylinder delivery?",
      answer: "Yes, we provide gas cylinder refilling, exchange, and home delivery services. We also offer safe installation and safety inspections."
    },
    {
      question: "What printing services do you offer?",
      answer: "We offer custom T-shirt printing, bulk printing for events, branded merchandise, and graphic design services. We use heat transfer, vinyl, and sublimation techniques."
    },
    {
      question: "How long do repairs take?",
      answer: "Simple repairs can be done same-day, while complex issues may take 2-3 days. We provide loaner devices when possible for longer repairs."
    }
  ]

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "Phone":
        return <Phone className="w-6 h-6 icon-primary" />
      case "Mail":
        return <Mail className="w-6 h-6 icon-primary" />
      case "MapPin":
        return <MapPin className="w-6 h-6 icon-primary" />
      case "Clock":
        return <Clock className="w-6 h-6 icon-primary" />
      default:
        return <Phone className="w-6 h-6 icon-primary" />
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        className="relative pt-32 pb-20 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={heroInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
      >
        <div className="container px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="text-center bg-gradient-to-r from-[#F0F2FE] to-white rounded-2xl px-4 py-6 md:py-8 md:px-8 mb-4 shadow-lg border border-[#8B99B9]/20"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-3 text-[#263C7C]">Get in Touch</h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Have questions about our technology services? Need electronics repair, gas refilling, or custom printing? We're here to help with all your technology and service needs.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/4 left-0 w-64 h-64 bg-[#263C7C]/5 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-[#8B99B9]/5 rounded-full blur-3xl -z-10"></div>
      </motion.section>

      {/* Contact Form & Info Section */}
      <section className="py-20">
        <div className="container px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              ref={formRef}
              className="bg-white rounded-2xl p-8 luxury-shadow"
              initial={{ opacity: 0, x: -20 }}
              animate={formInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 icon-primary" />
                </div>
                <h2 className="text-2xl font-bold">Send us a Message</h2>
              </div>

              {isSubmitted ? (
                <motion.div
                  className="text-center py-8"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Message Sent Successfully!</h3>
                  <p className="text-text-light">We'll get back to you within 24 hours.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Full Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-light" />
                        <input
                          type="text"
                          placeholder="Your full name"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-light" />
                        <input
                          type="email"
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-light" />
                        <input
                          type="tel"
                          placeholder="+254 740 802 704"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Subject *</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-light" />
                        <input
                          type="text"
                          placeholder="Electronics/Gas/Printing inquiry"
                          value={formData.subject}
                          onChange={(e) => handleInputChange("subject", e.target.value)}
                          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Message *</label>
                    <textarea
                      placeholder="Tell us about your electronics, gas, or printing needs..."
                      value={formData.message}
                      onChange={(e) => handleInputChange("message", e.target.value)}
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full btn-primary rounded-xl py-3"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Send Message
                      </div>
                    )}
                  </Button>
                </form>
              )}
            </motion.div>

            {/* Contact Information */}
            <motion.div
              ref={infoRef}
              className="space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={infoInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <div>
                <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
                <p className="text-text-light mb-8">
                  We're here to help with all your technology and service needs. Reach out to us through any of the channels below.
                </p>
              </div>

              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <motion.div
                    key={index}
                    className="flex gap-4 p-4 bg-gradient-to-r from-[#F0F2FE] to-white rounded-xl border border-[#8B99B9]/20 shadow-md"
                    initial={{ opacity: 0, y: 20 }}
                    animate={infoInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[#263C7C]/10 flex items-center justify-center">
                        {getIconComponent(info.iconName)}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{info.title}</h3>
                      <div className="space-y-1">
                        {info.details.map((detail, detailIndex) => (
                          <p key={detailIndex} className="text-sm text-text-light">
                            {info.title === "Phone" ? (
                              <a 
                                href={`tel:${detail}`} 
                                className="text-primary hover:text-primary/80 hover:underline transition-colors cursor-pointer"
                              >
                                {detail}
                              </a>
                            ) : (
                              detail
                            )}
                          </p>
                        ))}
                      </div>
                      <p className="text-xs text-text-light mt-2">{info.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Maps Section */}
      <section className="py-20 bg-secondary">
        <div className="container px-4 md:px-6">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Find Us</h2>
            <p className="text-text-light max-w-2xl mx-auto">
              Visit our facilities for electronics repairs, gas refilling, or printing services. We have multiple locations to serve you better.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* First Map */}
            <motion.div
              className="bg-white rounded-2xl overflow-hidden luxury-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative h-[400px] w-full">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.8198!2d36.8177!3d-1.2921!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMcKwMTcnMzEuNiJTIDM2wrA0OScwMy43IkU!5e0!3m2!1sen!2ske!4v1234567890"
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="OMOTECH HUB Kutus Branch"
                  className="rounded-2xl"
                ></iframe>
                <div className="absolute bottom-4 left-4 bg-white p-4 rounded-xl shadow-lg">
                  <h3 className="font-semibold">OMOTECH HUB - Kutus Branch</h3>
                  <p className="text-sm text-text-light">Computers & Services</p>
                  <a 
                    href="https://maps.app.goo.gl/9uVQ3LHb5m6CwUF98?g_st=ipc" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary text-sm hover:underline mt-1 inline-block"
                  >
                    View on Google Maps →
                  </a>
                </div>
              </div>
            </motion.div>

            {/* Second Map */}
            <motion.div
              className="bg-white rounded-2xl overflow-hidden luxury-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="relative h-[400px] w-full">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.8198!2d36.8177!3d-1.2921!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMcKwMTcnMzEuNiJTIDM2wrA0OScwMy43IkU!5e0!3m2!1sen!2ske!4v1234567890"
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="OMOTECH HUB Kenyatta University Branch"
                  className="rounded-2xl"
                ></iframe>
                <div className="absolute bottom-4 left-4 bg-white p-4 rounded-xl shadow-lg">
                  <h3 className="font-semibold">OMOTECH HUB - Kenyatta University</h3>
                  <p className="text-sm text-text-light">Nairobi Campus Location</p>
                  <a 
                    href="https://maps.app.goo.gl/abcQcU8Sh8hqCfcp6?g_st=ipc" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary text-sm hover:underline mt-1 inline-block"
                  >
                    View on Google Maps →
                  </a>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Map Information */}
          <motion.div
            className="mt-12 grid md:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div className="bg-white rounded-xl p-6 luxury-shadow">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Kutus Branch
              </h3>
              <p className="text-text-light mb-4">
                Our Kutus location offering full electronics repair, gas refilling, and printing services in the heart of Kutus town.
              </p>
              <div className="space-y-2 text-sm">
                <p><strong>Services:</strong> Electronics Repair, Gas Supply, Printing</p>
                <p><strong>Hours:</strong> Mon-Fri: 8AM-6PM, Sat: 9AM-4PM</p>
                <p><strong>Phone:</strong> +254 740 802 704</p>
                <p><strong>Location:</strong> Kutus Town Center</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 luxury-shadow">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Kenyatta University Branch
              </h3>
              <p className="text-text-light mb-4">
                Our Nairobi location near Kenyatta University, serving students and the surrounding community with electronics and gas services.
              </p>
              <div className="space-y-2 text-sm">
                <p><strong>Services:</strong> Electronics Sales, Gas Refilling, Student Discounts</p>
                <p><strong>Hours:</strong> Mon-Fri: 9AM-5PM, Sat: 10AM-3PM</p>
                <p><strong>Phone:</strong> +254 745 755 707</p>
                <p><strong>Location:</strong> Near Kenyatta University, Nairobi</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container px-4 md:px-6">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-text-light max-w-2xl mx-auto">
              Find answers to common questions about our services and processes.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-xl p-6 luxury-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <h3 className="font-semibold mb-3">{faq.question}</h3>
                <p className="text-text-light text-sm">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
} 