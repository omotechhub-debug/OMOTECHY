"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Shirt, Timer, Sparkles, TrendingUp, Shield, Truck, Clock, Star, Check, ArrowRight, Loader2, Wrench, Settings, Hammer, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

interface Service {
  _id: string;
  name: string;
  description: string;
  category: string;
  price: string;
  turnaround: string;
  active: boolean;
  featured: boolean;
  image: string;
  features: string[];
  createdAt: string;
  updatedAt: string;
}

interface Category {
  _id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ServicesPage() {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Map category display names to enum values
  const mapCategoryNameToEnum = (categoryName: string): string => {
    const mapping: { [key: string]: string } = {
      // Database categories
      "Electronics": "electronics",
      "Gas & Supply": "gas",
      "Printing & Branding": "printing",
      "Accessories": "accessories",
      "Repair": "repair",
      "Maintenance": "maintenance",
      "Installation": "installation",
      "Consultation": "consultation",
      // Legacy categories (for backward compatibility)
      "Dry Cleaning": "dry-cleaning",
      "Wash & Fold": "wash-fold",
      "Luxury Care": "luxury",
      "Business": "business",
      "Home Cleaning": "home-cleaning",
      "Business Cleaning": "business-cleaning",
    }
    return mapping[categoryName] || categoryName.toLowerCase().replace(/\s+/g, '-')
  }

  const [heroRef, heroInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const [servicesRef, servicesInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })


  // Fetch services and categories from database
  useEffect(() => {
    fetchServices()
    fetchCategories()
  }, [])

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services?limit=50')
      const data = await response.json()
      
      if (data.success) {
        // Only show active services for client
        const activeServices = data.data.filter((service: Service) => service.active)
        setServices(activeServices)
      } else {
        console.error('API returned error:', data.error)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      
      if (data.success) {
        // Only show active categories for client
        const activeCategories = data.categories.filter((category: Category) => category.active)
        setCategories(activeCategories)
      } else {
        console.error('Categories API returned error:', data.error)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const filteredServices =
    selectedCategory === "all" 
      ? services 
      : services.filter((service) => {
          // Find the category by ID and check if service category matches the category name
          const category = categories.find(cat => cat._id === selectedCategory)
          if (!category) return false
          
          // Map category display name to enum value for comparison
          const categoryEnum = mapCategoryNameToEnum(category.name)
          return service.category === categoryEnum
        })


  const getIconForCategory = (category: string) => {
    // Find the category in the database categories by mapping enum to display name
    const categoryData = categories.find(cat => 
      mapCategoryNameToEnum(cat.name) === category
    )
    
    // Use the category icon if available, otherwise use a default
    if (categoryData?.icon) {
      // Map icon names to Lucide icons
      switch (categoryData.icon.toLowerCase()) {
        case 'shirt':
          return <Shirt className="w-8 h-8 text-accent" />
        case 'timer':
          return <Timer className="w-8 h-8 text-accent" />
        case 'sparkles':
          return <Sparkles className="w-8 h-8 text-accent" />
        case 'trending-up':
          return <TrendingUp className="w-8 h-8 text-accent" />
        case 'shield':
          return <Shield className="w-8 h-8 text-accent" />
        case 'truck':
          return <Truck className="w-8 h-8 text-accent" />
        default:
          return <Shirt className="w-8 h-8 text-accent" />
      }
    }
    
    // Fallback to category name matching
    switch (category.toLowerCase()) {
      case 'electronics':
        return <Shirt className="w-8 h-8 text-accent" />
      case 'gas':
      case 'gas & supply':
        return <Timer className="w-8 h-8 text-accent" />
      case 'printing':
      case 'printing & branding':
        return <Sparkles className="w-8 h-8 text-accent" />
      case 'accessories':
        return <TrendingUp className="w-8 h-8 text-accent" />
      case 'repair':
        return <Wrench className="w-8 h-8 text-accent" />
      case 'maintenance':
        return <Settings className="w-8 h-8 text-accent" />
      case 'installation':
        return <Hammer className="w-8 h-8 text-accent" />
      case 'consultation':
        return <Users className="w-8 h-8 text-accent" />
      case 'dry-cleaning':
        return <Shirt className="w-8 h-8 text-accent" />
      case 'wash-fold':
        return <Timer className="w-8 h-8 text-accent" />
      case 'luxury':
      case 'luxury care':
        return <Sparkles className="w-8 h-8 text-accent" />
      case 'business':
        return <TrendingUp className="w-8 h-8 text-accent" />
      case 'home-cleaning':
        return <Shield className="w-8 h-8 text-accent" />
      case 'business-cleaning':
        return <Truck className="w-8 h-8 text-accent" />
      default:
        return <Shirt className="w-8 h-8 text-accent" />
    }
  }

  const features = [
    {
      icon: <Clock className="w-6 h-6 text-primary" />,
      title: "Fast Service",
      description: "Quick repairs and same-day gas refills",
    },
    {
      icon: <Shield className="w-6 h-6 text-primary" />,
      title: "Quality Guarantee",
      description: "100% satisfaction or we'll make it right",
    },
    {
      icon: <Truck className="w-6 h-6 text-primary" />,
      title: "Reliable Supply",
      description: "Consistent gas supply and quality products",
    },
    {
      icon: <Star className="w-6 h-6 text-primary" />,
      title: "Expert Service",
      description: "Professional repairs and custom printing",
    },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <Footer />
      </div>
    )
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
          <div className="text-center max-w-4xl mx-auto">
            <motion.h1
              className="text-4xl md:text-5xl font-bold mb-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Our Services
            </motion.h1>
            <motion.p
              className="text-lg text-text-light max-w-2xl mx-auto mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Professional electronics repair, gas refilling, and custom printing services. Quality technology solutions and expert service for all your needs.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-white rounded-xl px-8">
                  Contact Us
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-primary text-primary hover:bg-primary/5 rounded-xl px-8"
              >
                Get Quote
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/4 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl -z-10"></div>
      </motion.section>

      {/* Features Section */}
      <section className="py-16 bg-secondary">
        <div className="container px-4 md:px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="text-center p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-text-light text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <motion.section
        ref={servicesRef}
        className="py-20"
        initial={{ opacity: 0 }}
        animate={servicesInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
      >
        <div className="container px-4 md:px-6">
          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {/* All Services Button */}
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              className={`rounded-full ${
                selectedCategory === "all"
                  ? "bg-accent hover:bg-accent/90 text-white"
                  : "border-primary text-primary hover:bg-primary/5"
              }`}
              onClick={() => setSelectedCategory("all")}
            >
              All Services
            </Button>
            
            {/* Dynamic Categories */}
            {categories.map((category) => (
              <Button
                key={category._id}
                variant={selectedCategory === category._id ? "default" : "outline"}
                className={`rounded-full ${
                  selectedCategory === category._id
                    ? "bg-accent hover:bg-accent/90 text-white"
                    : "border-primary text-primary hover:bg-primary/5"
                }`}
                onClick={() => setSelectedCategory(category._id)}
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Services Grid */}
          {filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-light text-lg">No services found for this category.</p>
            </div>
          ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredServices.map((service, index) => (
              <motion.div
                  key={service._id}
                  className="group relative"
                initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                  <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 group-hover:-translate-y-2">
                    {/* Service Image */}
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={service.image || "/placeholder.svg"}
                        alt={service.name}
                    fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                      {service.featured && (
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-accent text-white border-0">Featured</Badge>
                </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>

                    {/* Service Content */}
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {getIconForCategory(service.category)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{service.name}</h3>
                          <p className="text-text-light text-sm">{service.turnaround}</p>
                    </div>
                  </div>

                      <p className="text-text-light text-sm mb-4 line-clamp-2">{service.description}</p>

                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-2xl font-bold text-primary">{service.price}</span>
                          <span className="text-text-light text-sm ml-1">
                            {service.category === "gas" 
                              ? " per kg" 
                              : service.category === "printing"
                              ? " per item"
                              : service.category === "repair" || service.category === "maintenance"
                              ? " per service"
                              : service.category === "installation"
                              ? " per installation"
                              : service.category === "consultation"
                              ? " per hour"
                              : service.category === "dry-cleaning" || service.category === "wash-fold"
                              ? " per kg"
                              : service.category === "home-cleaning" || service.category === "business-cleaning"
                              ? " per sqm"
                              : " starting from"}
                          </span>
                        </div>
                        <Link href="/contact">
                          <Button size="sm" className="bg-accent hover:bg-accent/90 text-white rounded-xl">
                            Contact Us
                          </Button>
                        </Link>
                      </div>

                      {/* Features */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-text">Features:</h4>
                        <ul className="text-xs text-text-light space-y-1">
                          {service.features.slice(0, 3).map((feature, idx) => (
                            <li key={idx} className="flex items-center">
                              <Check className="w-3 h-3 text-accent mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                </div>
              </motion.div>
            ))}
            </div>
          )}
        </div>
      </motion.section>

      <Footer />
    </div>
  )
}
