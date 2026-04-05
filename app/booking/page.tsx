"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, Clock, MapPin, User, Phone, Mail, CreditCard, Check, ArrowLeft, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function BookingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    service: "",
    date: "",
    time: "",
    address: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    instructions: "",
    paymentMethod: "",
    promoCode: "",
    selectedShop: "kutus",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const totalSteps = 4

  // Shop options
  const shopOptions = [
    { value: 'kutus', label: 'Kutus Shop', address: 'Kutus Town Center' },
    { value: 'ku', label: 'KU (Kenyatta University) Shop', address: 'Kenyatta University Campus' },
    { value: 'kagio', label: 'Kagio Shop', address: 'Kagio Town Center' }
  ]

  const services = [
    { id: "dry-cleaning", name: "Premium Dry Cleaning", price: "$12.99" },
    { id: "wash-fold", name: "Express Wash & Fold", price: "$4.99" },
    { id: "luxury", name: "Luxury Garment Care", price: "$24.99" },
    { id: "business", name: "Business Attire Service", price: "$14.99" },
  ]

  const timeSlots = [
    "8:00 AM - 10:00 AM",
    "10:00 AM - 12:00 PM",
    "12:00 PM - 2:00 PM",
    "2:00 PM - 4:00 PM",
    "4:00 PM - 6:00 PM",
    "6:00 PM - 8:00 PM",
  ]

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsSubmitting(false)
    setIsSuccess(true)
  }

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-24 pb-20">
          <div className="container px-4 md:px-6">
            <motion.div
              className="max-w-2xl mx-auto text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-success" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">Booking Confirmed!</h1>
              <p className="text-text-light mb-8">
                Thank you for choosing Econuru laundry. We've received your booking and will send you a confirmation email
                shortly.
              </p>
              <div className="bg-secondary rounded-2xl p-6 mb-8">
                <h3 className="font-semibold mb-4">Booking Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Service:</span>
                    <span className="font-medium">{services.find((s) => s.id === formData.service)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="font-medium">{formData.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span className="font-medium">{formData.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Booking ID:</span>
                    <span className="font-medium">#DL{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-accent hover:bg-accent/90 text-white rounded-xl">Track Your Order</Button>
                <Button variant="outline" className="border-primary text-primary hover:bg-primary/5 rounded-xl">
                  Book Another Service
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="pt-24 pb-20">
        <div className="container px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                {Array.from({ length: totalSteps }).map((_, index) => (
                  <div key={index} className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        index + 1 <= currentStep ? "bg-primary text-white" : "bg-secondary text-text-light"
                      }`}
                    >
                      {index + 1 <= currentStep ? <Check className="w-5 h-5" /> : index + 1}
                    </div>
                    {index < totalSteps - 1 && (
                      <div className={`h-1 w-full mx-4 ${index + 1 < currentStep ? "bg-primary" : "bg-secondary"}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold">
                  {currentStep === 1 && "Select Service & Date"}
                  {currentStep === 2 && "Pickup Details"}
                  {currentStep === 3 && "Contact Information"}
                  {currentStep === 4 && "Payment & Confirmation"}
                </h2>
                <p className="text-text-light">
                  Step {currentStep} of {totalSteps}
                </p>
              </div>
            </div>

            {/* Form Steps */}
            <div className="luxury-card p-8">
              <AnimatePresence mode="wait">
                {/* Step 1: Service & Date */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div>
                      <Label className="text-base font-semibold mb-4 block">Select Service</Label>
                      <RadioGroup
                        value={formData.service}
                        onValueChange={(value) => updateFormData("service", value)}
                        className="grid md:grid-cols-2 gap-4"
                      >
                        {services.map((service) => (
                          <div key={service.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={service.id} id={service.id} />
                            <Label
                              htmlFor={service.id}
                              className="flex-1 p-4 border rounded-xl cursor-pointer hover:bg-secondary transition-colors"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{service.name}</span>
                                <span className="text-accent font-semibold">{service.price}</span>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="date" className="text-base font-semibold mb-2 block">
                          <Calendar className="w-4 h-4 inline mr-2" />
                          Pickup Date
                        </Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => updateFormData("date", e.target.value)}
                          className="luxury-input"
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>

                      <div>
                        <Label htmlFor="time" className="text-base font-semibold mb-2 block">
                          <Clock className="w-4 h-4 inline mr-2" />
                          Time Slot
                        </Label>
                        <Select value={formData.time} onValueChange={(value) => updateFormData("time", value)}>
                          <SelectTrigger className="luxury-input">
                            <SelectValue placeholder="Select time slot" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.map((slot) => (
                              <SelectItem key={slot} value={slot}>
                                {slot}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Pickup Details */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div>
                      <Label htmlFor="address" className="text-base font-semibold mb-2 block">
                        <MapPin className="w-4 h-4 inline mr-2" />
                        Pickup Address
                      </Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => updateFormData("address", e.target.value)}
                        placeholder="Enter your complete pickup address..."
                        className="luxury-input min-h-[100px]"
                      />
                    </div>

                    <div>
                      <Label htmlFor="instructions" className="text-base font-semibold mb-2 block">
                        Special Instructions (Optional)
                      </Label>
                      <Textarea
                        id="instructions"
                        value={formData.instructions}
                        onChange={(e) => updateFormData("instructions", e.target.value)}
                        placeholder="Any special instructions for pickup or cleaning..."
                        className="luxury-input"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Contact Information */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="firstName" className="text-base font-semibold mb-2 block">
                          <User className="w-4 h-4 inline mr-2" />
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => updateFormData("firstName", e.target.value)}
                          placeholder="Enter your first name"
                          className="luxury-input"
                        />
                      </div>

                      <div>
                        <Label htmlFor="lastName" className="text-base font-semibold mb-2 block">
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => updateFormData("lastName", e.target.value)}
                          placeholder="Enter your last name"
                          className="luxury-input"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="email" className="text-base font-semibold mb-2 block">
                          <Mail className="w-4 h-4 inline mr-2" />
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => updateFormData("email", e.target.value)}
                          placeholder="Enter your email"
                          className="luxury-input"
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone" className="text-base font-semibold mb-2 block">
                          <Phone className="w-4 h-4 inline mr-2" />
                          Phone Number
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => updateFormData("phone", e.target.value)}
                          placeholder="Enter your phone number"
                          className="luxury-input"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Payment & Confirmation */}
                {currentStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div>
                      <Label className="text-base font-semibold mb-4 block">
                        <CreditCard className="w-4 h-4 inline mr-2" />
                        Payment Method
                      </Label>
                      <RadioGroup
                        value={formData.paymentMethod}
                        onValueChange={(value) => updateFormData("paymentMethod", value)}
                        className="space-y-3"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="cash" id="cash" />
                          <Label
                            htmlFor="cash"
                            className="flex-1 p-4 border rounded-xl cursor-pointer hover:bg-secondary transition-colors"
                          >
                            Collect from Shop
                          </Label>
                        </div>
                        
                        {/* Shop Selection - Only show when cash payment is selected */}
                        {formData.paymentMethod === "cash" && (
                          <div className="ml-6 mt-3 p-4 bg-gray-50 rounded-lg">
                            <Label className="text-sm font-medium mb-3 block">Select Collection Shop:</Label>
                            <RadioGroup
                              value={formData.selectedShop}
                              onValueChange={(value) => updateFormData("selectedShop", value)}
                              className="space-y-2"
                            >
                              {shopOptions.map((shop) => (
                                <div key={shop.value} className="flex items-center space-x-2">
                                  <RadioGroupItem value={shop.value} id={`shop-${shop.value}`} />
                                  <Label
                                    htmlFor={`shop-${shop.value}`}
                                    className="flex-1 p-3 border rounded-lg cursor-pointer hover:bg-white transition-colors"
                                  >
                                    <div className="font-medium text-sm">{shop.label}</div>
                                    <div className="text-xs text-gray-600">{shop.address}</div>
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="card" id="card" />
                          <Label
                            htmlFor="card"
                            className="flex-1 p-4 border rounded-xl cursor-pointer hover:bg-secondary transition-colors"
                          >
                            Credit/Debit Card
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="digital" id="digital" />
                          <Label
                            htmlFor="digital"
                            className="flex-1 p-4 border rounded-xl cursor-pointer hover:bg-secondary transition-colors"
                          >
                            Digital Wallet
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label htmlFor="promoCode" className="text-base font-semibold mb-2 block">
                        Promo Code (Optional)
                      </Label>
                      <Input
                        id="promoCode"
                        value={formData.promoCode}
                        onChange={(e) => updateFormData("promoCode", e.target.value)}
                        placeholder="Enter promo code"
                        className="luxury-input"
                      />
                    </div>

                    {/* Order Summary */}
                    <div className="bg-secondary rounded-xl p-6">
                      <h3 className="font-semibold mb-4">Order Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Service:</span>
                          <span className="font-medium">{services.find((s) => s.id === formData.service)?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Date & Time:</span>
                          <span className="font-medium">
                            {formData.date} at {formData.time}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pickup Address:</span>
                          <span className="font-medium">{formData.address.substring(0, 30)}...</span>
                        </div>
                        <hr className="my-2" />
                        <div className="flex justify-between font-semibold">
                          <span>Total:</span>
                          <span>{services.find((s) => s.id === formData.service)?.price}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox id="terms" />
                      <Label htmlFor="terms" className="text-sm">
                        I agree to the{" "}
                        <a href="#" className="text-primary hover:underline">
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" className="text-primary hover:underline">
                          Privacy Policy
                        </a>
                      </Label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="border-primary text-primary hover:bg-primary/5 rounded-xl"
                >
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Previous
                </Button>

                {currentStep < totalSteps ? (
                  <Button
                    onClick={handleNext}
                    className="bg-accent hover:bg-accent/90 text-white rounded-xl"
                    disabled={
                      (currentStep === 1 && (!formData.service || !formData.date || !formData.time)) ||
                      (currentStep === 2 && !formData.address) ||
                      (currentStep === 3 &&
                        (!formData.firstName || !formData.lastName || !formData.email || !formData.phone))
                    }
                  >
                    Next
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={!formData.paymentMethod || isSubmitting}
                    className="bg-accent hover:bg-accent/90 text-white rounded-xl"
                  >
                    {isSubmitting ? "Processing..." : "Confirm Booking"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
