"use client"

import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HowItWorksStep } from "@/components/how-it-works-step"
import { Clock, Shield, Truck, Star, Check, ArrowRight, Calendar, Package, Sparkles, Heart } from "lucide-react"

export default function HowItWorksPage() {
  const [heroRef, heroInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const [stepsRef, stepsInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const [featuresRef, featuresInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const [ctaRef, ctaInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const howItWorksSteps = [
    {
      id: 1,
      title: "Choose Service",
      description: "Select from electronics, gas refilling, or T-shirt printing services. Contact us for a free consultation.",
      icon: "01",
    },
    {
      id: 2,
      title: "Get Quote",
      description: "Contact us for pricing and availability of your required service. We provide instant quotes and expert advice.",
      icon: "02",
    },
    {
      id: 3,
      title: "Expert Service",
      description: "Our professionals handle your needs with quality and precision. Certified technicians ensure excellent results.",
      icon: "03",
    },
    {
      id: 4,
      title: "Delivery/Collection",
      description: "We deliver products or provide on-site service as needed. Professional installation and ongoing support included.",
      icon: "04",
    },
  ]

  const detailedSteps = [
    {
      iconName: "Calendar",
      title: "Free Consultation",
      description: "Contact us via phone, WhatsApp, or visit our shop for a free consultation. We assess your electronics, gas, or printing needs and provide expert recommendations.",
      features: ["Free assessment", "Expert recommendations", "Multiple contact options", "Flexible scheduling"]
    },
    {
      iconName: "Package",
      title: "Professional Service",
      description: "Our certified technicians handle electronics repairs, gas cylinder refilling, and custom printing with professional equipment and quality materials.",
      features: ["Certified technicians", "Professional equipment", "Quality materials", "Safe installations"]
    },
    {
      iconName: "Sparkles",
      title: "Quality Guarantee",
      description: "Every service comes with our quality guarantee. We ensure your electronics work perfectly, gas is safely delivered, and printing meets your exact specifications.",
      features: ["100% satisfaction guarantee", "Safety compliance", "Quality testing", "Customer satisfaction"]
    },
    {
      iconName: "Truck",
      title: "Delivery & Support",
      description: "We provide home delivery for gas cylinders, electronics, and printed items. Plus ongoing maintenance and support for all our services.",
      features: ["Home delivery", "Installation service", "Ongoing maintenance", "Customer support"]
    }
  ]

  const benefits = [
    {
      iconName: "Clock",
      title: "One-Stop Solution",
      description: "Electronics, gas supply, and printing all in one place"
    },
    {
      iconName: "Shield",
      title: "Certified Quality",
      description: "All services meet safety and quality standards"
    },
    {
      iconName: "Star",
      title: "Expert Technicians",
      description: "Trained professionals with years of experience"
    },
    {
      iconName: "Heart",
      title: "Customer Focused",
      description: "Personalized service and ongoing support"
    }
  ]

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "Calendar":
        return <Calendar className="w-8 h-8 icon-primary" />
      case "Package":
        return <Package className="w-8 h-8 icon-primary" />
      case "Sparkles":
        return <Sparkles className="w-8 h-8 icon-primary" />
      case "Truck":
        return <Truck className="w-8 h-8 icon-primary" />
      case "Clock":
        return <Clock className="w-6 h-6 icon-primary" />
      case "Shield":
        return <Shield className="w-6 h-6 icon-primary" />
      case "Star":
        return <Star className="w-6 h-6 icon-primary" />
      case "Heart":
        return <Heart className="w-6 h-6 icon-primary" />
      default:
        return <Calendar className="w-8 h-8 icon-primary" />
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        className="relative pt-32 pb-20 bg-gradient-to-br from-[#F0F2FE] via-[#E8EBF7] to-[#DDE2F0] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={heroInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
      >
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-10 left-10 w-32 h-32 bg-[#263C7C]/10 rounded-full blur-2xl"></div>
          <div className="absolute top-20 right-20 w-24 h-24 bg-[#8B99B9]/15 rounded-full blur-2xl"></div>
          <div className="absolute bottom-10 left-1/4 w-40 h-40 bg-[#1FC77A]/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-[#263C7C]/8 rounded-full blur-2xl"></div>
        </div>

        <div className="container px-4 md:px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full shadow-sm mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <div className="w-2 h-2 bg-[#263C7C] rounded-full"></div>
              <span className="text-sm font-medium text-[#263C7C]">How We Serve You</span>
            </motion.div>
            <motion.h1
              className="text-4xl md:text-5xl font-bold mb-6 text-[#263C7C]"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              How We Serve You
            </motion.h1>
            <motion.p
              className="text-lg text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Simple steps to get the products and services you need, with professional support every step of the way. From electronics to gas supply and printing - we've got you covered.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Link href="/contact">
                <Button size="lg" className="bg-[#263C7C] hover:bg-[#1e2f5f] text-white rounded-xl px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                  Get Free Quote
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-[#263C7C] text-[#263C7C] hover:bg-[#263C7C]/5 rounded-xl px-8 py-3 font-semibold"
              >
                View Our Services
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Simple Steps Section */}
      <section ref={stepsRef} className="py-20 bg-white">
        <div className="container px-4 md:px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={stepsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#263C7C]/10 rounded-full shadow-sm mb-6">
              <div className="w-2 h-2 bg-[#263C7C] rounded-full"></div>
              <span className="text-sm font-medium text-[#263C7C]">Simple 4-Step Process</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#263C7C]">Simple 4-Step Process</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              From consultation to delivery, we've streamlined every step for your technology and service needs.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorksSteps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                animate={stepsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <HowItWorksStep step={step} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Process Section */}
      <section ref={featuresRef} className="py-20 bg-gradient-to-br from-[#F0F2FE] via-[#E8EBF7] to-[#DDE2F0] relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-10 right-10 w-32 h-32 bg-[#1FC77A]/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-10 left-10 w-24 h-24 bg-[#8B99B9]/15 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-[#263C7C]/8 rounded-full blur-2xl"></div>
        </div>

        <div className="container px-4 md:px-6 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full shadow-sm mb-6">
              <div className="w-2 h-2 bg-[#1FC77A] rounded-full"></div>
              <span className="text-sm font-medium text-[#263C7C]">What Makes Us Different</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#263C7C]">What Makes Us Different</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Every step of our process is designed with your technology needs and service excellence in mind.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {detailedSteps.map((step, index) => (
              <motion.div
                key={index}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 luxury-shadow border border-[#263C7C]/10 hover:shadow-xl transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                whileHover={{ y: -5 }}
              >
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#263C7C]/10 to-[#8B99B9]/20 flex items-center justify-center">
                      {getIconComponent(step.iconName)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-3 text-[#263C7C]">{step.title}</h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">{step.description}</p>
                    <ul className="space-y-2">
                      {step.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-[#1FC77A]" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="container px-4 md:px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1FC77A]/10 rounded-full shadow-sm mb-6">
              <div className="w-2 h-2 bg-[#1FC77A] rounded-full"></div>
              <span className="text-sm font-medium text-[#263C7C]">Why Choose Our Service</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#263C7C]">Why Choose Our Service</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Experience the benefits of professional technology and service solutions tailored to your needs.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="bg-gradient-to-br from-white via-[#F0F2FE]/30 to-[#E8EBF7]/20 rounded-2xl p-8 luxury-shadow text-center border border-[#263C7C]/10 hover:shadow-xl transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                whileHover={{ y: -5 }}
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#263C7C]/10 to-[#8B99B9]/20 flex items-center justify-center mx-auto mb-6">
                  {getIconComponent(benefit.iconName)}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-[#263C7C]">{benefit.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="py-20 bg-gradient-to-br from-[#F0F2FE] via-[#E8EBF7] to-[#DDE2F0] relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-10 left-10 w-32 h-32 bg-[#263C7C]/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-10 right-10 w-24 h-24 bg-[#1FC77A]/15 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-[#8B99B9]/10 rounded-full blur-2xl"></div>
        </div>

        <div className="container px-4 md:px-6 relative z-10">
          <motion.div
            className="p-8 bg-white/90 backdrop-blur-sm rounded-2xl luxury-shadow border border-[#263C7C]/10"
            initial={{ opacity: 0, y: 20 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#263C7C]/10 rounded-full shadow-sm mb-6">
                  <div className="w-2 h-2 bg-[#263C7C] rounded-full"></div>
                  <span className="text-sm font-medium text-[#263C7C]">Ready to Get Started?</span>
                </div>
                <h3 className="text-3xl font-bold mb-4 text-[#263C7C]">Ready to Experience Professional Technology Services?</h3>
                <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                  Contact us today for a free consultation and get expert solutions for your electronics, gas, and printing needs.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/contact">
                    <Button size="lg" className="bg-[#263C7C] hover:bg-[#1e2f5f] text-white rounded-xl px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                      Get Free Quote <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/services">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-[#263C7C] text-[#263C7C] hover:bg-[#263C7C]/5 rounded-xl px-8 py-3 font-semibold"
                    >
                      View Services
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative h-[200px] lg:h-[250px] rounded-xl overflow-hidden border border-[#263C7C]/10">
                <Image
                  src="/placeholder.svg?height=250&width=500&text=Technology+Services"
                  alt="Professional Technology Services"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
} 