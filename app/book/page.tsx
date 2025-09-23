"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaTshirt, FaShoppingBag, FaHashtag, FaCalendarAlt, FaClock, FaInfoCircle } from "react-icons/fa";
import Select from 'react-select';
import { Loader2 } from "lucide-react";

const SERVICES = [
  "Wash & Fold",
  "Dry Cleaning",
  "Ironing",
  "Bedding & Linens",
  "Express Service",
  "Other"
];

const LAUNDRY_BAGS = [
  "I have my own laundry bag",
  "I need small laundry bag",
  "I need medium laundry bag",
  "I need large laundry bag"
];

const SPECIAL_ITEMS = [
  "Mats",
  "Carpet",
  "Duvet",
  "Blanket"
];

export default function BookPage() {
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [errors, setErrors] = useState({});
  const [isBooking, setIsBooking] = useState(false);
  
  // Promo code validation state
  const [promoValid, setPromoValid] = useState(null);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    services: [],
    date: "",
    time: "",
    notes: "",
    laundryBag: "",
    baskets: 0,
    specialItems: [],
    moreInfo: "",
    dontKnowService: false,
    promoCode: "",
  });

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch('/api/services?limit=50');
        const data = await res.json();
        if (data.success) {
          setServices(data.data.filter((s) => s.active));
        }
      } catch (e) {
        setServices([]);
      } finally {
        setLoadingServices(false);
      }
    }
    fetchServices();
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    if (name === "services") {
      setForm((prev) => {
        let updated = prev.services.includes(value)
          ? prev.services.filter((s) => s !== value)
          : [...prev.services, value];
        return { ...prev, services: updated, dontKnowService: false };
      });
    } else if (name === "dontKnowService") {
      setForm((prev) => ({ ...prev, dontKnowService: checked, services: checked ? [] : prev.services }));
    } else if (type === "checkbox" && name === "specialItems") {
      setForm((prev) => {
        const items = prev.specialItems.includes(value)
          ? prev.specialItems.filter((item) => item !== value)
          : [...prev.specialItems, value];
        return { ...prev, specialItems: items };
      });
    } else if (type === "number") {
      setForm((prev) => ({ ...prev, [name]: Number(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  // Promo code validation function
  const validatePromoCode = async (code) => {
    if (!code.trim()) {
      setPromoValid(null);
      setPromoMessage("");
      return;
    }

    setPromoLoading(true);
    try {
      const response = await fetch(`/api/promotions/validate?code=${encodeURIComponent(code.trim())}`);
      const data = await response.json();
      
      if (data.success && data.promotion) {
        setPromoValid(true);
        setPromoMessage(`Valid promo code! ${data.promotion.discountType === 'percentage' ? `${data.promotion.discount}% off` : `Ksh ${data.promotion.discount} off`}`);
      } else {
        setPromoValid(false);
        setPromoMessage(data.error || "Invalid or expired promo code");
      }
    } catch (error) {
      setPromoValid(false);
      setPromoMessage("Error validating promo code");
    } finally {
      setPromoLoading(false);
    }
  };

  // Debounced promo code validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (form.promoCode.trim()) {
        validatePromoCode(form.promoCode);
      } else {
        setPromoValid(null);
        setPromoMessage("");
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [form.promoCode]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (isBooking) return; // Prevent double submit
    setIsBooking(true);
    // Validate step 3 before submitting
    if (!validateStep3()) {
      setIsBooking(false);
      return;
    }
    
    // Map selected services to order structure
    const selectedServices = (form.dontKnowService
      ? []
      : services.filter((s) => form.services.includes(s._id)).map((s) => ({
          serviceId: s._id,
          serviceName: s.name,
          quantity: 1,
          price: s.price,
        }))
    );
    const orderData = {
      customer: {
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
      },
      services: selectedServices,
      pickupDate: form.date,
      pickupTime: form.time,
      notes: form.moreInfo,
      location: 'main-branch',
      totalAmount: 0,
      pickDropAmount: 0,
      discount: 0,
      paymentStatus: 'unpaid',
      laundryStatus: 'to-be-picked',
      status: 'pending',
      promoCode: form.promoCode.trim() || undefined,
    };
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        alert(data.error || 'Failed to submit order.');
      }
    } catch (err) {
      alert('Failed to submit order. Please try again.');
    } finally {
      setIsBooking(false);
    }
  }

  // Validation functions for each step
  function validateStep1() {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.phone.trim()) newErrors.phone = "Phone is required";
    if (!form.address.trim()) newErrors.address = "Address is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validateStep2() {
    const newErrors = {};
    if (!form.dontKnowService && form.services.length === 0) {
      newErrors.services = "Please select at least one service or choose 'I don't know'";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validateStep3() {
    const newErrors = {};
    if (!form.date) newErrors.date = "Pickup date is required";
    if (!form.time) newErrors.time = "Pickup time is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function nextStep() {
    let isValid = false;
    if (step === 1) {
      isValid = validateStep1();
    } else if (step === 2) {
      isValid = validateStep2();
    }
    
    if (isValid) {
      setStep((s) => Math.min(s + 1, 3));
      setErrors({});
    }
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1));
    setErrors({});
  }

  // Helper: is any laundry service selected?
  const isLaundrySelected = form.services.some((s) => {
    const service = services.find((srv) => srv._id === s);
    return service && !service.category.includes('cleaning');
  });

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-[#eaf6f6] via-white to-[#f8fafc] flex flex-col items-center justify-center p-4 pt-32">
        <div className="w-full max-w-md mx-auto mb-8">
          <h1 className="text-3xl font-extrabold text-[#38a3a5] mb-2 text-center tracking-tight">Book Your Laundry Pickup</h1>
          <p className="text-gray-600 text-center mb-6">We make laundry easy. Schedule your pickup below and let us handle the rest!</p>
        </div>
        <div className="bg-white/90 border border-[#b2f2e9] rounded-3xl shadow-2xl p-8 w-full max-w-lg mx-auto backdrop-blur-md">
          {submitted ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-[#38a3a5] mb-2">Booking Received!</h2>
              <p className="text-gray-700">Thank you for booking with us. We'll contact you soon to confirm your order.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Stepper Progress Bar */}
              <div className="flex items-center mb-8">
                {["Personal Details", "What You Need", "Finish"].map((label, idx) => (
                  <div key={label} className="flex-1 flex flex-col items-center">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full border-2 ${step > idx ? 'bg-[#38a3a5] border-[#38a3a5] text-white' : step === idx+1 ? 'bg-white border-[#2E7D32] text-[#2E7D32]' : 'bg-white border-[#b2f2e9] text-[#b2f2e9]'} font-bold text-lg transition-all`}>{idx+1}</div>
                    <span className={`mt-2 text-xs font-semibold ${step === idx+1 ? 'text-[#38a3a5]' : 'text-gray-400'}`}>{label}</span>
                  </div>
                ))}
                <div className="absolute left-0 right-0 top-4 h-1 bg-[#b2f2e9] z-0" style={{zIndex:-1}} />
              </div>
              {/* Step 1: Personal Details */}
              {step === 1 && (
                <div>
                  <h2 className="text-xl font-bold text-[#38a3a5] mb-4 flex items-center gap-2"><FaUser /> Personal Details</h2>
                  <div className="space-y-4">
                    <div className="relative">
                      <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-[#38a3a5] text-lg" />
                      <input
                        type="text"
                        name="name"
                        required
                        value={form.name}
                        onChange={handleChange}
                        className="w-full pl-10 rounded-2xl border border-[#38a3a5] bg-[#f6fffc] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] shadow-sm placeholder:text-[#7bbcb7]"
                        placeholder="Your Name"
                      />
                      {errors.name && <p className="text-red-500 text-sm mt-1 ml-2">{errors.name}</p>}
                    </div>
                    <div className="relative">
                      <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#38a3a5] text-lg" />
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={form.phone}
                        onChange={handleChange}
                        className="w-full pl-10 rounded-2xl border border-[#38a3a5] bg-[#f6fffc] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] shadow-sm placeholder:text-[#7bbcb7]"
                        placeholder="e.g. 0712 345 678"
                      />
                      {errors.phone && <p className="text-red-500 text-sm mt-1 ml-2">{errors.phone}</p>}
                    </div>
                    <div className="relative">
                      <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-[#38a3a5] text-lg" />
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        className="w-full pl-10 rounded-2xl border border-[#38a3a5] bg-[#f6fffc] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] shadow-sm placeholder:text-[#7bbcb7]"
                        placeholder="you@email.com"
                      />
                    </div>
                    <div className="relative">
                      <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-[#38a3a5] text-lg" />
                      <input
                        type="text"
                        name="address"
                        required
                        value={form.address}
                        onChange={handleChange}
                        className="w-full pl-10 rounded-2xl border border-[#38a3a5] bg-[#f6fffc] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] shadow-sm placeholder:text-[#7bbcb7]"
                        placeholder="Where should we pick up?"
                      />
                      {errors.address && <p className="text-red-500 text-sm mt-1 ml-2">{errors.address}</p>}
                    </div>
                  </div>
                </div>
              )}
              {/* Step 2: What You Need */}
              {step === 2 && (
                <div>
                  <h2 className="text-xl font-bold text-[#38a3a5] mb-4 flex items-center gap-2"><FaTshirt /> What You Need</h2>
                  <div className="space-y-4">
                    {/* Tag-style multi-select for services */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 flex items-center gap-2"><FaTshirt className="text-[#38a3a5]" /> Select Services</label>
                      <Select
                        isMulti
                        isClearable={false}
                        isLoading={loadingServices}
                        options={[
                          ...services.map((service) => ({ value: service._id, label: service.name })),
                          { value: 'dontknow', label: "I don't know" },
                        ]}
                        value={
                          form.dontKnowService
                            ? [{ value: 'dontknow', label: "I don't know" }]
                            : services
                                .filter((s) => form.services.includes(s._id))
                                .map((s) => ({ value: s._id, label: s.name }))
                        }
                        onChange={(selected) => {
                          if (!selected) {
                            setForm((f) => ({ ...f, services: [], dontKnowService: false }));
                          } else if (Array.isArray(selected)) {
                            const hasDontKnow = selected.some((opt) => opt.value === 'dontknow');
                            setForm((f) => ({
                              ...f,
                              services: hasDontKnow ? [] : selected.map((opt) => opt.value),
                              dontKnowService: hasDontKnow,
                            }));
                          }
                        }}
                        classNamePrefix="luxury-select"
                        placeholder="Select one or more services..."
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderRadius: '1rem',
                            borderColor: errors.services ? '#ef4444' : '#38a3a5',
                            background: '#f6fffc',
                            minHeight: '48px',
                            boxShadow: 'none',
                          }),
                          multiValue: (base) => ({
                            ...base,
                            background: '#eaf6f6',
                            borderRadius: '0.75rem',
                            color: '#38a3a5',
                          }),
                          multiValueLabel: (base) => ({
                            ...base,
                            color: '#38a3a5',
                            fontWeight: 600,
                          }),
                          multiValueRemove: (base) => ({
                            ...base,
                            color: '#2E7D32',
                            ':hover': { background: '#E8F5E8', color: '#1B5E20' },
                          }),
                          option: (base, state) => ({
                            ...base,
                            background: state.isSelected ? '#2E7D32' : state.isFocused ? '#f6fffc' : '#fff',
                            color: state.isSelected ? '#fff' : '#222',
                          }),
                        }}
                      />
                      {errors.services && <p className="text-red-500 text-sm mt-1 ml-2">{errors.services}</p>}
                    </div>
                    {/* Laundry bag only if laundry service selected */}
                    {isLaundrySelected && (
                      <div className="relative">
                        <FaShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 text-[#38a3a5] text-lg" />
                        <select
                          name="laundryBag"
                          value={form.laundryBag}
                          onChange={handleChange}
                          className="w-full pl-10 rounded-2xl border border-[#38a3a5] bg-[#f6fffc] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] shadow-sm"
                        >
                          <option value="">Select laundry bag option</option>
                          <option value="I have my own laundry bag">I have my own laundry bag</option>
                          <option value="I need small laundry bag">I need small laundry bag</option>
                          <option value="I need medium laundry bag">I need medium laundry bag</option>
                          <option value="I need large laundry bag">I need large laundry bag</option>
                          <option value="I don't need a laundry bag">I don't need a laundry bag</option>
                        </select>
                      </div>
                    )}
                    {/* Number of Baskets with label */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 flex items-center gap-2"><FaHashtag className="text-[#38a3a5]" /> Number of Baskets</label>
                      <div className="relative">
                        <FaHashtag className="absolute left-3 top-1/2 -translate-y-1/2 text-[#38a3a5] text-lg" />
                        <input
                          type="number"
                          name="baskets"
                          min={0}
                          value={form.baskets}
                          onChange={handleChange}
                          className="w-full pl-10 rounded-2xl border border-[#38a3a5] bg-[#f6fffc] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] shadow-sm"
                          placeholder="Enter number of baskets"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 flex items-center gap-2"><FaInfoCircle className="text-[#38a3a5]" /> Does your laundry include any of these special items?</label>
                      <div className="flex flex-wrap gap-4">
                        {SPECIAL_ITEMS.map((item) => (
                          <label key={item} className="flex items-center gap-2 text-gray-700 bg-[#f8fafc] px-3 py-1 rounded-xl border border-[#eaf6f6]">
                            <input
                              type="checkbox"
                              name="specialItems"
                              value={item}
                              checked={form.specialItems.includes(item)}
                              onChange={handleChange}
                              className="accent-[#38a3a5]"
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Step 3: Remainder */}
              {step === 3 && (
                <div>
                  <h2 className="text-xl font-bold text-[#38a3a5] mb-4 flex items-center gap-2"><FaCalendarAlt /> Final Details</h2>
                  <div className="space-y-4">
                    <div className="relative">
                      <FaInfoCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-[#38a3a5] text-lg" />
                      <textarea
                        name="moreInfo"
                        value={form.moreInfo}
                        onChange={handleChange}
                        className="w-full pl-10 rounded-2xl border border-[#38a3a5] bg-[#f6fffc] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] shadow-sm"
                        placeholder="Any extra details about your laundry, access, etc."
                      />
                    </div>
                    {/* Promo Code Field */}
                    <div className="relative">
                      <FaHashtag className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2E7D32] text-lg" />
                      <input
                        type="text"
                        name="promoCode"
                        value={form.promoCode}
                        onChange={handleChange}
                        className={`w-full pl-10 rounded-2xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] shadow-sm ${
                          promoValid === true 
                            ? 'border-green-500 bg-green-50' 
                            : promoValid === false 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-[#2E7D32] bg-[#E8F5E8]'
                        }`}
                        placeholder="Promo code (optional)"
                        autoComplete="off"
                      />
                      {promoLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-[#2E7D32]" />
                        </div>
                      )}
                    </div>
                    {promoMessage && (
                      <p className={`text-sm mt-1 ml-2 ${
                        promoValid === true ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {promoMessage}
                      </p>
                    )}
                    {/* Date field with friendly label */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 flex items-center gap-2"><FaCalendarAlt className="text-[#38a3a5]" /> When would you like us to pick up your laundry?</label>
                      <div className="relative">
                        <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-[#38a3a5] text-lg" />
                        <input
                          type="date"
                          name="date"
                          required
                          value={form.date}
                          onChange={handleChange}
                          className="w-full pl-10 rounded-2xl border border-[#38a3a5] bg-[#f6fffc] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] shadow-sm"
                        />
                        {errors.date && <p className="text-red-500 text-sm mt-1 ml-2">{errors.date}</p>}
                      </div>
                    </div>
                    {/* Time field with friendly label */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 flex items-center gap-2"><FaClock className="text-[#38a3a5]" /> What time works best for you?</label>
                      <div className="relative">
                        <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#38a3a5] text-lg" />
                        <input
                          type="time"
                          name="time"
                          required
                          value={form.time}
                          onChange={handleChange}
                          className="w-full pl-10 rounded-2xl border border-[#38a3a5] bg-[#f6fffc] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] shadow-sm"
                        />
                        {errors.time && <p className="text-red-500 text-sm mt-1 ml-2">{errors.time}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Navigation Buttons */}
              <div className="flex justify-between mt-10">
                {step > 1 ? (
                  <button type="button" onClick={prevStep} className="px-8 py-3 rounded-2xl border-2 border-[#2E7D32] text-[#2E7D32] font-bold bg-white shadow hover:bg-[#E8F5E8] transition-colors">Back</button>
                ) : <div />}
                {step < 3 ? (
                  <button type="button" onClick={nextStep} className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#2E7D32] to-[#4CAF50] text-white font-bold shadow hover:from-[#4CAF50] hover:to-[#2E7D32] hover:text-white transition-colors">Next</button>
                ) : (
                  <button type="submit" className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#2E7D32] to-[#4CAF50] text-white font-bold shadow hover:from-[#4CAF50] hover:to-[#2E7D32] hover:text-white transition-colors flex items-center justify-center" disabled={isBooking}>
                    {isBooking && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
                    {isBooking ? 'Booking...' : 'Book Now'}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
} 