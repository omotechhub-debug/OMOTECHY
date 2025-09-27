"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Filter,
  Shirt,
  Timer,
  Sparkles,
  TrendingUp,
  Shield,
  Truck,
  FolderOpen,
  Tag,
  Home,
  Building,
  Loader2,
  ShoppingCart,
  User,
  Phone,
  Mail,
  MapPin as MapPinIcon,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  CheckCircle,
  X,
  ArrowRight,
  Plus as PlusIcon,
  Package,
  MessageSquare,
  UserPlus,
  UserCheck,
  Gift,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import UserStationInfo from "@/components/UserStationInfo";

interface Service {
  _id: string;
  name: string;
  description: string;
  category: string;
  price: string;
  unit?: string;
  turnaround: string;
  turnaroundUnit?: string;
  active: boolean;
  featured: boolean;
  image: string;
  features: string[];
  createdAt: string;
  updatedAt: string;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  brand?: string;
  model?: string;
  images: string[];
  status: 'active' | 'inactive' | 'discontinued';
  tags: string[];
  supplier?: string;
  warranty?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Category {
  _id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  image?: string;
  active: boolean;
}

interface CartItem {
  item: Service | Product;
  type: 'service' | 'product';
  quantity: number;
  price: string | number;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  pickupDate: string;
  pickupTime: string;
  notes: string;
  pickDropAmount: string;
  discount: string;
  paymentStatus: 'unpaid' | 'paid' | 'partial';
  partialAmount: string; // Amount paid for partial payments
}

const locations = [
  { id: "main-branch", name: "Main Branch", address: "Westlands, Nairobi" },
  { id: "karen-branch", name: "Karen Branch", address: "Karen, Nairobi" },
  { id: "kilimani-branch", name: "Kilimani Branch", address: "Kilimani, Nairobi" },
  { id: "lavington-branch", name: "Lavington Branch", address: "Lavington, Nairobi" },
];

const timeSlots = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
];

const iconMap: { [key: string]: React.ComponentType<any> } = {
  Shirt,
  Timer,
  Sparkles,
  TrendingUp,
  Shield,
  Truck,
  FolderOpen,
  Tag,
  Home,
  Building,
};

export default function POSPage() {
  const { token, user, refreshUserData } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("main-branch");
  const [sortBy, setSortBy] = useState("name");
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  
  // Cart and Order State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
    address: '',
    pickupDate: '',
    pickupTime: '',
    notes: '',
    pickDropAmount: '',
    discount: '',
    paymentStatus: 'unpaid',
    partialAmount: '',
  });
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  // Order Editing State
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Add a loading state for order editing
  const [orderLoading, setOrderLoading] = useState(false);

  // SMS State
  const [sendSMS, setSendSMS] = useState(true);
  const [sendSimplifiedSMS, setSendSimplifiedSMS] = useState(false);
  const [previousPaymentStatus, setPreviousPaymentStatus] = useState<string>('unpaid');

  // Promo Code State
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState("");
  const [lockedPromotion, setLockedPromotion] = useState<any>(null); // Store locked-in promotion details

  // Add promo validation state
  const [promoValid, setPromoValid] = useState<boolean | null>(null);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionDropdownRef = useRef<HTMLDivElement | null>(null);

  // Customer search functions
  const searchCustomers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      if (data.success) {
        const suggestions = data.customers.slice(0, 8); // Limit to 8 suggestions
        setCustomerSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      setCustomerSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setSearchLoading(false);
    }
  }, [token]);

  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearch(value);
    setCustomerInfo(prev => ({ ...prev, name: value }));
    
    // Clear existing customer selection if user is typing
    if (isExistingCustomer) {
      setIsExistingCustomer(false);
      setSelectedCustomerId(null);
      setCustomerInfo(prev => ({ 
        ...prev, 
        phone: '', 
        email: '', 
        address: '' 
      }));
    }

    // Debounce the search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchCustomers(value);
    }, 300) as NodeJS.Timeout;
  };

  const selectCustomer = (customer: any) => {
    setCustomerSearch(customer.name);
    setCustomerInfo({
      ...customerInfo,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
    });
    setIsExistingCustomer(true);
    setSelectedCustomerId(customer._id);
    setShowSuggestions(false);
    setCustomerSuggestions([]);
  };

  const handlePhoneChange = async (phone: string) => {
    setCustomerInfo(prev => ({ ...prev, phone }));
    
    // If user is typing a phone number, search for existing customer
    if (phone.length >= 8) { // Search when phone has at least 8 digits
      try {
        const response = await fetch(`/api/customers?phone=${encodeURIComponent(phone)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();

        if (data.success && data.customers.length > 0) {
          const customer = data.customers[0];
          // Only auto-fill if name field is empty or matches
          if (!customerInfo.name || customerInfo.name === customer.name) {
            setCustomerInfo({
              ...customerInfo,
              name: customer.name,
              phone: customer.phone,
              email: customer.email || '',
              address: customer.address || '',
            });
            setCustomerSearch(customer.name);
            setIsExistingCustomer(true);
            setSelectedCustomerId(customer._id);
          }
        }
      } catch (error) {
        console.error('Error searching by phone:', error);
      }
    }
  };

  const clearCustomerSearch = () => {
    setCustomerSearch("");
    setCustomerSuggestions([]);
    setShowSuggestions(false);
    setIsExistingCustomer(false);
    setSelectedCustomerId(null);
    setCustomerInfo({
      ...customerInfo,
      name: '',
      phone: '',
      email: '',
      address: '',
    });
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionDropdownRef.current && !suggestionDropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch services, products and categories
  useEffect(() => {
    if (token && user) {
      fetchServices();
      fetchProducts();
      fetchCategories();
    }
  }, [token, user]);

  // Filter services based on search and category
  useEffect(() => {
    let filtered = services.filter(service => service.active);

    if (searchQuery) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter(service => service.category === selectedCategory);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price-low":
          return parseFloat(a.price.replace(/[^\d.]/g, '')) - parseFloat(b.price.replace(/[^\d.]/g, ''));
        case "price-high":
          return parseFloat(b.price.replace(/[^\d.]/g, '')) - parseFloat(a.price.replace(/[^\d.]/g, ''));
        case "featured":
          return b.featured ? 1 : -1;
        default:
          return 0;
      }
    });

    setFilteredServices(filtered);
  }, [services, searchQuery, selectedCategory, sortBy]);

  // Filter products based on search and category
  useEffect(() => {
    let filtered = products.filter(product => product.status === 'active');

    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "stock":
          return b.stock - a.stock;
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory, sortBy]);

  const fetchServices = async () => {
    try {
      // Get station ID for filtering
      let stationId = null;
      if (user?.role === 'manager') {
        // For managers, get their assigned station
        const stationRes = await fetch('/api/stations/my-station', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (stationRes.ok) {
          const stationData = await stationRes.json();
          if (stationData.success && stationData.station) {
            stationId = stationData.station._id;
          }
        }
      } else if (user?.stationId || (user?.managedStations && user.managedStations.length > 0)) {
        // For admins/superadmins, use their station
        stationId = user.stationId || user.managedStations?.[0];
      }

      // Build URL with station filter
      let url = '/api/services?limit=50';
      if (stationId) {
        url += `&stationId=${stationId}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('📋 Services fetched for POS:', data.services?.map((s: any) => ({ name: s.name, unit: s.unit, turnaroundUnit: s.turnaroundUnit })) || 'No services');
        setServices(data.services || data.data || []);
      } else {
        console.error('Failed to fetch services:', data.error);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      // Get station ID for filtering
      let stationId = null;
      if (user?.role === 'manager') {
        // For managers, get their assigned station
        const stationRes = await fetch('/api/stations/my-station', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (stationRes.ok) {
          const stationData = await stationRes.json();
          if (stationData.success && stationData.station) {
            stationId = stationData.station._id;
          }
        }
      } else if (user?.stationId || (user?.managedStations && user.managedStations.length > 0)) {
        // For admins/superadmins, use their station
        stationId = user.stationId || user.managedStations?.[0];
      }

      // Build URL with station filter
      let url = '/api/inventory?limit=50';
      if (stationId) {
        url += `&stationId=${stationId}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find(cat => cat._id === categoryId);
    
    if (category) {
      return category;
    }

    // Fallback colors for categories not found in database
    const fallbackColors: { [key: string]: { name: string; color: string } } = {
      'dry-cleaning': { name: 'Dry Cleaning', color: '#3B82F6' }, // Blue
      'wash-fold': { name: 'Wash & Fold', color: '#10B981' }, // Green
      'luxury': { name: 'Luxury', color: '#8B5CF6' }, // Purple
      'business': { name: 'Business', color: '#F59E0B' }, // Amber
      'home-cleaning': { name: 'Home Cleaning', color: '#EF4444' }, // Red
      'business-cleaning': { name: 'Business Cleaning', color: '#06B6D4' }, // Cyan
    };

    const fallback = fallbackColors[categoryId] || { name: categoryId, color: '#6B7280' };
    
    return {
      name: fallback.name,
      icon: "Shirt",
      color: fallback.color
    };
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Shirt;
    return <IconComponent className="w-4 h-4" />;
  };

  // Cart Functions
  const addToCart = (item: Service | Product, type: 'service' | 'product', quantity: number) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => 
        cartItem.item._id === item._id && cartItem.type === type
      );
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.item._id === item._id && cartItem.type === type
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      }
      const price = type === 'service' ? (item as Service).price : (item as Product).price;
      return [...prevCart, { item, type, quantity, price }];
    });
  };

  const removeFromCart = (itemId: string, type: 'service' | 'product') => {
    setCart(prevCart => prevCart.filter(cartItem => 
      !(cartItem.item._id === itemId && cartItem.type === type)
    ));
  };

  const updateQuantity = (itemId: string, type: 'service' | 'product', quantity: number) => {
    if (quantity < 0.1) {
      removeFromCart(itemId, type);
      return;
    }
    setCart(prevCart =>
      prevCart.map(cartItem =>
        cartItem.item._id === itemId && cartItem.type === type
          ? { ...cartItem, quantity: Math.round(quantity * 10) / 10 } // Round to 1 decimal place
          : cartItem
      )
    );
  };

  const getCartTotal = () => {
    return cart.reduce((total, cartItem) => {
      console.log('Processing cart item for total:', cartItem);
      
      let price = 0;
      if (typeof cartItem.price === 'string') {
        // Handle various string formats like "From Ksh 5,000", "Ksh 1,000", "1000", etc.
        const cleanPrice = cartItem.price.replace(/[^\d.]/g, '');
        price = parseFloat(cleanPrice) || 0;
      } else if (typeof cartItem.price === 'number') {
        price = isNaN(cartItem.price) ? 0 : cartItem.price;
      }
      
      // Ensure we never have NaN
      if (isNaN(price)) {
        price = 0;
      }
      
      console.log('Extracted price:', price);
      console.log('Quantity:', cartItem.quantity);
      console.log('Item total:', price * cartItem.quantity);
      
      return total + (price * cartItem.quantity);
    }, 0);
  };

  const calculateFinalTotal = () => {
    let total = getCartTotal();
    
    // Add pick & drop amount if provided
    if (customerInfo.pickDropAmount && parseFloat(customerInfo.pickDropAmount) > 0) {
      total += parseFloat(customerInfo.pickDropAmount);
    }
    
    // Subtract discount if provided
    if (customerInfo.discount && parseFloat(customerInfo.discount) > 0) {
      total -= parseFloat(customerInfo.discount);
    }
    
    // Subtract promo discount if provided
    if (promoDiscount > 0) {
      total -= promoDiscount;
    }
    
    return Math.max(0, total); // Ensure total is not negative
  };

  const clearCart = () => {
    setCart([]);
    setCustomerInfo({
      name: '',
      phone: '',
      email: '',
      address: '',
      pickupDate: '',
      pickupTime: '',
      notes: '',
      pickDropAmount: '',
      discount: '',
      paymentStatus: 'unpaid',
      partialAmount: '',
    });
    // Clear promotion data
    setPromoCode("");
    setPromoDiscount(0);
    setLockedPromotion(null);
    setPromoValid(null);
    setPromoMessage("");
    
    // Clear customer search data
    setCustomerSearch("");
    setCustomerSuggestions([]);
    setShowSuggestions(false);
    setIsExistingCustomer(false);
    setSelectedCustomerId(null);
  };

  // SMS Functions
  const sendOrderUpdateSMS = async (orderData: any, isNewOrder: boolean = false) => {
    if (!sendSMS || !customerInfo.phone) return;

    // Only send order update SMS for new orders or when explicitly requested
    if (!isNewOrder && !sendSimplifiedSMS) return;

    try {
      let message = '';
      
      if (sendSimplifiedSMS) {
        // Simplified message with just services and amount
        const servicesList = cart.map(item => 
          `${item.item.name} (${item.quantity}x)`
        ).join(', ');

        message = `*** Order Update - Econuru Services ***

Dear ${customerInfo.name || 'Valued Customer'},

${isNewOrder ? 'New Order Created!' : 'Order Updated!'}

Order #${orderData.orderNumber || 'N/A'}

Services: ${servicesList}
Total Amount: Ksh ${calculateFinalTotal().toLocaleString()}

Payment Status: ${customerInfo.paymentStatus.toUpperCase()}

Thank you for choosing Econuru Services!

Need help? Call us at +254 757 883 799`;
      } else {
        // Detailed message with full breakdown (only for new orders)
        const servicesList = cart.map(item => 
          `${item.item.name} (${item.quantity}x @ Ksh${item.price})`
        ).join('\n');

        message = `*** Order Update - Econuru Services ***

Dear ${customerInfo.name || 'Valued Customer'},

New Order Created!

Order #${orderData.orderNumber || 'N/A'}

Services:
${servicesList}

Subtotal: Ksh ${getCartTotal().toLocaleString()}
${promoDiscount > 0 ? `Promo Discount: -Ksh ${promoDiscount.toLocaleString()}\n` : ''}Total: Ksh ${calculateFinalTotal().toLocaleString()}

Payment Status: ${customerInfo.paymentStatus.toUpperCase()}

Thank you for choosing Econuru Services!

Need help? Call us at +254 757 883 799`;
      }

      const response = await fetch('/api/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile: customerInfo.phone,
          message,
          type: 'custom'
        }),
      });

      const data = await response.json();
      if (data.success) {
        console.log('SMS sent successfully:', data);
      } else {
        console.error('SMS sending failed:', data);
      }
    } catch (error) {
      console.error('SMS sending error:', error);
    }
  };

  const sendStatusUpdateSMS = async (statusType: 'payment' | 'laundry', newStatus: string) => {
    console.log('sendStatusUpdateSMS called with:', { statusType, newStatus });
    console.log('sendSMS:', sendSMS, 'customerInfo.phone:', customerInfo.phone);
    
    if (!sendSMS || !customerInfo.phone) {
      console.log('SMS not sent - sendSMS:', sendSMS, 'phone:', customerInfo.phone);
      return;
    }

    try {
      let message = '';
      
      if (statusType === 'payment') {
        console.log('Creating payment status SMS...');
        // Check if order has been delivered (laundry status removed, so always false for now)
        const isDelivered = false;
        console.log('Is delivered:', isDelivered);
        
        if (newStatus === 'paid') {
          if (isDelivered) {
            message = `*** Payment Confirmation - Econuru Services ***

Dear ${customerInfo.name || 'Valued Customer'},

Thank you for your payment!

Order Total: Ksh ${calculateFinalTotal().toLocaleString()}
Payment Status: PAID

Your order has been successfully completed and delivered.

We appreciate your business and hope you're satisfied with our service!

Thank you for choosing Econuru Services!

Need help? Call us at +254 757 883 799`;
          } else {
            message = `*** Payment Confirmation - Econuru Services ***

Dear ${customerInfo.name || 'Valued Customer'},

Thank you for your payment!

Order Total: Ksh ${calculateFinalTotal().toLocaleString()}
Payment Status: PAID

Your order is now confirmed and will be processed.

We'll keep you updated on your order progress.

Thank you for choosing Econuru Services!

Need help? Call us at +254 757 883 799`;
          }
        } else if (newStatus === 'unpaid') {
          message = `*** Payment Status Update - Econuru Services ***

Dear ${customerInfo.name || 'Valued Customer'},

Order #${editingOrderId || 'N/A'}

Payment Status: UNPAID

Please complete your payment to proceed with your order.

Total Amount: Ksh ${calculateFinalTotal().toLocaleString()}

Thank you for choosing Econuru Services!

Need help? Call us at +254 757 883 799`;
        } else if (newStatus === 'partial') {
          message = `*** Payment Status Update - Econuru Services ***

Dear ${customerInfo.name || 'Valued Customer'},

Order #${editingOrderId || 'N/A'}

Payment Status: PARTIAL PAYMENT

Partial payment received. Please complete the remaining balance.

Total Amount: Ksh ${calculateFinalTotal().toLocaleString()}

Thank you for choosing Econuru Services!

Need help? Call us at +254 757 883 799`;
        }
      } else if (statusType === 'laundry') {
        const statusMessages = {
          'picked': `Dear ${customerInfo.name || 'Valued Customer'}, your laundry has been picked up and is now in our care!`,
          'in-progress': `Dear ${customerInfo.name || 'Valued Customer'}, your laundry is now being processed with our premium care!`,
          'ready': `Dear ${customerInfo.name || 'Valued Customer'}, great news! Your laundry is ready for delivery!`,
          'delivered': `Dear ${customerInfo.name || 'Valued Customer'}, your order has been successfully delivered!`
        };

        message = `*** Status Update - Econuru Services ***

${statusMessages[newStatus as keyof typeof statusMessages]}

Order #${editingOrderId || 'N/A'}

Current Status: ${newStatus.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}

${newStatus === 'ready' ? 'We\'ll contact you shortly to arrange delivery.' : ''}
${newStatus === 'delivered' ? 'Thank you for choosing Econuru Services! We hope you\'re satisfied with our service.' : ''}

Need help? Call us at +254 757 883 799`;
      }

      if (message) {
        console.log('Sending SMS with message:', message);
        const response = await fetch('/api/sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mobile: customerInfo.phone,
            message,
            type: 'custom'
          }),
        });

        const data = await response.json();
        if (data.success) {
          console.log('Status update SMS sent successfully:', data);
        } else {
          console.error('Status update SMS sending failed:', data);
        }
      }
    } catch (error) {
      console.error('Status update SMS sending error:', error);
    }
  };

  // Inventory reduction function
  const reduceInventory = async (cartItems: any[], stationId: string) => {
    try {
      console.log('Reducing inventory for station:', stationId);
      
      // Filter cart items to only include products (not services)
      const productItems = cartItems.filter(item => item.type === 'product');
      
      if (productItems.length === 0) {
        console.log('No products in cart, skipping inventory reduction');
        return;
      }

      // Reduce inventory for each product
      for (const item of productItems) {
        const productId = item.item._id;
        const quantity = item.quantity;
        
        console.log(`Reducing inventory for product ${productId} by ${quantity}`);
        
        const response = await fetch(`/api/inventory/${productId}/reduce-stock`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quantity: quantity,
            stationId: stationId
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Inventory reduced for ${item.item.name}:`, data);
        } else {
          console.error(`❌ Failed to reduce inventory for ${item.item.name}`);
        }
      }
    } catch (error) {
      console.error('Error reducing inventory:', error);
    }
  };

  // Order Processing
  const handleCreateOrder = async () => {
    // Prevent multiple simultaneous order creation
    if (isProcessingOrder) {
      console.log('Order already being processed, ignoring click');
      return;
    }
    
    console.log('=== HANDLE CREATE ORDER CALLED ===');
    console.log('Cart length:', cart.length);
    console.log('Cart items:', cart);
    console.log('Customer phone:', customerInfo.phone);
    
    if (cart.length === 0) {
      console.log('Cart is empty, returning');
      return;
    }
    if (!customerInfo.phone) {
      alert("Please fill in customer phone number");
      return;
    }
    
    // Ensure user data is available and refreshed
    // Validating user data...
    
    if (!user) {
      alert('User data not available. Please refresh the page and try again.');
      return;
    }
    
    // Check if user has station assignment
    if (!user.stationId && (!user.managedStations || user.managedStations.length === 0)) {
      alert('You must be assigned to a station to create orders. Please contact your administrator.');
      return;
    }
    
    // User data validation passed
    
    // Set processing state immediately to prevent multiple clicks
    setIsProcessingOrder(true);
    setPromoError("");
    try {
      // Creating order...
      
      const orderData = {
        customer: {
          name: customerInfo.name,
          phone: customerInfo.phone,
        },
        services: cart.map(item => {
          console.log('Mapping cart item:', item);
          return {
            serviceId: item.item._id,
            serviceName: item.item.name,
            quantity: item.quantity,
            price: item.price,
          };
        }),
        location: selectedLocation,
        totalAmount: calculateFinalTotal(),
        paymentStatus: customerInfo.paymentStatus,
        partialAmount: customerInfo.paymentStatus === 'partial' ? (parseInt(customerInfo.partialAmount) || 0) : 0,
        remainingAmount: customerInfo.paymentStatus === 'partial' ? Math.max(0, calculateFinalTotal() - (parseInt(customerInfo.partialAmount) || 0)) : 0,
        status: isEditing ? "confirmed" : "pending",
        promoCode: promoCode.trim() || undefined,
        promotionDetails: lockedPromotion || undefined,
        // Add current user's station information if available
        stationId: user?.stationId || user?.managedStations?.[0] || null,
      };
      const url = isEditing ? `/api/orders/${editingOrderId}` : '/api/orders';
      const method = isEditing ? 'PATCH' : 'POST';
      
      // Sending order request...
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const data = await response.json();
      console.log('Response data:', data);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (data.success) {
        console.log('✅ Order created successfully:', data.order?.orderNumber);
        setPromoDiscount(data.order.promoDiscount || 0);
        setPromoCode(data.order.promoCode || "");
        setPromoError("");
        // Send SMS notifications
        if (sendSMS) {
          try {
            console.log('SMS is enabled, checking for status updates...');
            console.log('Current payment status:', customerInfo.paymentStatus);
            console.log('Previous payment status:', previousPaymentStatus);
            console.log('Is editing:', isEditing);
            
            // Send order update SMS only for new orders or when simplified is checked
            if (!isEditing || sendSimplifiedSMS) {
              console.log('Sending order update SMS...');
              await sendOrderUpdateSMS(data.order, !isEditing);
            }
            
            // Send status update SMS if status changed
            if (isEditing) {
              console.log('Checking payment status change...');
              if (customerInfo.paymentStatus !== previousPaymentStatus) {
                console.log('Payment status changed, sending SMS...');
                await sendStatusUpdateSMS('payment', customerInfo.paymentStatus);
              }
              
              // Laundry status removed from POS form, so no laundry status SMS needed
            }
          } catch (smsError) {
            console.error('SMS sending failed:', smsError);
            // Don't fail the order creation if SMS fails
          }
        }

        // Reduce inventory for products in the cart
        const currentStationId = user?.stationId || user?.managedStations?.[0];
        if (currentStationId) {
          await reduceInventory(cart, currentStationId);
        }

        setOrderSuccess(true);
        if (!isEditing) {
          clearCart(); // This now also clears promotion data
        }
        setSuccessDialogOpen(true);
      } else {
        console.error('❌ Order creation failed:', data);
        console.error('Response status:', response.status);
        if (data.error && data.error.toLowerCase().includes("promo")) {
          setPromoError(data.error);
        }
        alert(`Failed to ${isEditing ? 'update' : 'create'} order: ${data.error || 'Unknown error'}`);
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} order`);
      }
    } catch (error) {
      console.error('Order creation error:', error);
      setPromoError((error as Error).message || "Promo code error");
      alert(`Failed to ${isEditing ? 'update' : 'create'} order. Please try again.`);
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const selectedLocationInfo = locations.find(loc => loc.id === selectedLocation);

  // Load order for editing after services and products are loaded
  useEffect(() => {
    if (services.length > 0 && products.length > 0 && isEditing && editingOrderId) {
      setOrderLoading(true);
      (async () => {
        try {
          console.log('Loading order for editing:', editingOrderId);
          const response = await fetch(`/api/orders/${editingOrderId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          console.log('Order fetch response:', response.status, response.ok);
          
          if (response.ok) {
            const data = await response.json();
            const order = data.order;
            
            console.log('Order data loaded:', order);
            console.log('Order services:', order.services);
            console.log('Available services:', services.length);
            console.log('Available products:', products.length);
            
            // Store previous statuses for SMS comparison
            setPreviousPaymentStatus(order.paymentStatus || 'unpaid');
            
            setCustomerInfo({
              name: order.customer.name,
              phone: order.customer.phone,
              email: order.customer.email || '',
              address: order.customer.address || '',
              pickupDate: '',
              pickupTime: '',
              notes: '',
              pickDropAmount: '',
              discount: '',
              paymentStatus: order.paymentStatus || 'unpaid',
              partialAmount: order.partialAmount?.toString() || '',
            });
            
            const cartItems = order.services.map((service: any) => {
              console.log('Processing service:', service);
              
              // First try to find in services
              const serviceObj = services.find(s => s._id === service.serviceId);
              if (serviceObj) {
                console.log('Found service:', serviceObj.name);
                return {
                  item: serviceObj,
                  type: 'service' as const,
                  quantity: service.quantity,
                  price: String(service.price),
                };
              }
              
              // If not found in services, try to find in products
              const productObj = products.find(p => p._id === service.serviceId);
              if (productObj) {
                console.log('Found product:', productObj.name);
                return {
                  item: productObj,
                  type: 'product' as const,
                  quantity: service.quantity,
                  price: service.price,
                };
              }
              
              console.log('Service/Product not found for ID:', service.serviceId);
              return null;
            }).filter(Boolean);
            
            console.log('Cart items created:', cartItems);
            setCart(cartItems);
            setSelectedLocation(order.location || 'main-branch');
            setPromoCode(order.promoCode || "");
            setPromoDiscount(order.promoDiscount || 0);
            setLockedPromotion(order.promotionDetails || null);
            
            // If there's a locked promotion, mark it as valid
            if (order.promotionDetails && order.promotionDetails.lockedIn) {
              setPromoValid(true);
              setPromoMessage(`Locked-in promotion: ${order.promotionDetails.promoCode}`);
            }
          } else {
            console.error('Failed to fetch order:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('Error loading order for editing:', error);
        } finally {
          setOrderLoading(false);
        }
      })();
    }
  }, [services, products, isEditing, editingOrderId, token]);

  // Add this useEffect at the top of the component
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const editOrderId = urlParams.get('editOrder');
        console.log('URL params check - editOrderId:', editOrderId);
        if (editOrderId) {
          console.log('Setting editing order ID:', editOrderId);
          setEditingOrderId(editOrderId);
          setIsEditing(true);
        }
      } catch (error) {
        console.error('Error parsing URL parameters:', error);
      }
    }
  }, []);

  // Lock in promotion function (called when promo is successfully validated)
  const lockInPromotion = async (code: string, orderAmount: number) => {
    try {
      const response = await fetch('/api/promotions/lock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promoCode: code.trim(),
          orderAmount: orderAmount
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.promotion) {
        setLockedPromotion(data.promotion);
        setPromoDiscount(data.promotion.calculatedDiscount);
        setPromoValid(true);
        setPromoMessage(`🔒 Promotion locked in! ${data.promotion.discountType === 'percentage' ? `${data.promotion.discount}% off` : `Ksh ${data.promotion.discount} off`} - Valid until order completion`);
        console.log(`🔒 Locked in promotion: ${data.promotion.promoCode}`);
        return data.promotion;
      } else {
        setLockedPromotion(null);
        setPromoDiscount(0);
        setPromoValid(false);
        setPromoMessage(data.error || "Failed to lock in promotion");
        return null;
      }
    } catch (error) {
      console.error('Error locking in promotion:', error);
      setLockedPromotion(null);
      setPromoDiscount(0);
      setPromoValid(false);
      setPromoMessage("Error locking in promotion");
      return null;
    }
  };

  // Promo code validation function
  const validatePromoCode = async (code: string) => {
    if (!code.trim()) {
      setPromoValid(null);
      setPromoMessage("");
      setPromoDiscount(0);
      setLockedPromotion(null);
      return;
    }
    
    setPromoLoading(true);
    try {
      // If we already have a locked promotion for this code, keep it
      if (lockedPromotion && lockedPromotion.promoCode.toLowerCase() === code.trim().toLowerCase()) {
        setPromoValid(true);
        setPromoMessage(`🔒 Promotion already locked in! ${lockedPromotion.discountType === 'percentage' ? `${lockedPromotion.discount}% off` : `Ksh ${lockedPromotion.discount} off`} - Valid until order completion`);
        setPromoLoading(false);
        return;
      }
      
      // First validate the promo code normally
      const response = await fetch(`/api/promotions/validate?code=${encodeURIComponent(code.trim())}`);
      const data = await response.json();
      
      if (data.success && data.promotion) {
        // If validation succeeds, immediately lock it in
        const orderAmount = getCartTotal();
        await lockInPromotion(code, orderAmount);
      } else {
        setPromoValid(false);
        setPromoDiscount(0);
        setLockedPromotion(null);
        setPromoMessage(data.error || "Invalid or expired promo code");
      }
    } catch (error) {
      setPromoValid(false);
      setPromoDiscount(0);
      setLockedPromotion(null);
      setPromoMessage("Error validating promo code");
    } finally {
      setPromoLoading(false);
    }
  };

  // Debounced promo code validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (promoCode.trim()) {
        validatePromoCode(promoCode);
      } else {
        setPromoValid(null);
        setPromoMessage("");
        setPromoDiscount(0);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [promoCode, cart]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Loading POS system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditing ? 'Edit Order' : 'Point of Sale'}
                </h1>
                <p className="text-gray-600">
                  {isEditing ? 'Update order details and services' : 'Create and manage customer orders'}
                </p>
                {isEditing && (
                  <p className="text-sm text-blue-600 mt-1">
                    Editing Order ID: {editingOrderId}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {isEditing && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditingOrderId(null);
                      clearCart();
                      router.push('/admin/pos');
                    }}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel Edit
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => router.push('/admin/orders')}
                  className="flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  View Orders
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* User and Station Info */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <UserStationInfo />
          </div>
        </div>

        <div className="flex-1 p-4 lg:p-6">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main-branch">Main Branch</SelectItem>
                  <SelectItem value="west-branch">West Branch</SelectItem>
                  <SelectItem value="east-branch">East Branch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('services')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'services'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Services ({filteredServices.length})
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'products'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Products ({filteredProducts.length})
            </button>
          </div>

          {/* Services Grid */}
          {activeTab === 'services' && (
            <>
              {filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
              <p className="text-gray-600">
                {searchQuery || selectedCategory !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "No active services available at this location."
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((service, index) => {
                const categoryInfo = getCategoryInfo(service.category);
                return (
                  <motion.div
                    key={service._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="h-full hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-base mb-2 line-clamp-2">
                              {service.name}
                            </h3>
                            <div className="flex items-center gap-2 mb-3">
                              <Badge 
                                variant="outline" 
                                className="text-xs"
                                style={{ borderColor: categoryInfo.color, color: categoryInfo.color }}
                              >
                                {categoryInfo.name}
                              </Badge>
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="text-lg font-bold text-primary mb-1">
                              {service.price}
                            </div>
                            <div className="text-xs text-gray-500">
                              {service.unit ? `per ${service.unit}` : (service.category === 'printing' ? 'per piece' : service.category === 'gas' ? 'per cylinder' : service.category === 'electronics' ? 'per unit' : 'per piece')}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`quantity-${service._id}`} className="text-sm font-medium">
                                Quantity:
                              </Label>
                              <Input
                                id={`quantity-${service._id}`}
                                type="number"
                                min="0.1"
                                step="0.1"
                                placeholder="1.0"
                                defaultValue="1"
                                className="w-20 h-8 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const input = e.target as HTMLInputElement;
                                    const quantity = parseFloat(input.value) || 1;
                                    addToCart(service, 'service', quantity);
                                    input.value = "1";
                                  }
                                }}
                              />
                            </div>
                            <Button
                              onClick={() => {
                                const input = document.getElementById(`quantity-${service._id}`) as HTMLInputElement;
                                const quantity = parseFloat(input.value) || 1;
                                addToCart(service, 'service', quantity);
                                input.value = "1";
                              }}
                              className="w-full bg-primary hover:bg-primary/90 text-white"
                              size="sm"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add to Cart
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
            </>
          )}

          {/* Products Grid */}
          {activeTab === 'products' && (
            <>
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-600">
                    {searchQuery || selectedCategory !== "all"
                      ? "Try adjusting your search or filter criteria."
                      : "No active products available at this location."
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map((product, index) => (
                    <motion.div
                      key={product._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="h-full hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div>
                              <h3 className="font-semibold text-gray-900 text-base mb-2 line-clamp-2">
                                {product.name}
                              </h3>
                              <div className="flex items-center gap-2 mb-3">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs"
                                >
                                  {product.category}
                                </Badge>
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs"
                                >
                                  {product.sku}
                                </Badge>
                                <Badge 
                                  variant={product.stock > 0 ? "default" : "destructive"}
                                  className="text-xs"
                                >
                                  {product.stock > 0 ? `Stock: ${product.stock}` : 'Out of Stock'}
                                </Badge>
                              </div>
                            </div>

                            <div className="text-center">
                              <div className="text-lg font-bold text-primary mb-1">
                                Ksh {product.price.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                per {product.unit}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`quantity-${product._id}`} className="text-sm font-medium">
                                  Quantity:
                                </Label>
                                <Input
                                  id={`quantity-${product._id}`}
                                  type="number"
                                  min="1"
                                  step="1"
                                  placeholder="1"
                                  defaultValue="1"
                                  max={product.stock}
                                  className="w-20 h-8 text-sm"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const input = e.target as HTMLInputElement;
                                      const quantity = parseInt(input.value) || 1;
                                      if (quantity <= product.stock) {
                                        addToCart(product, 'product', quantity);
                                        input.value = "1";
                                      }
                                    }
                                  }}
                                />
                              </div>
                              <Button
                                onClick={() => {
                                  const input = document.getElementById(`quantity-${product._id}`) as HTMLInputElement;
                                  const quantity = parseInt(input.value) || 1;
                                  if (quantity <= product.stock) {
                                    addToCart(product, 'product', quantity);
                                    input.value = "1";
                                  }
                                }}
                                disabled={product.stock === 0}
                                className="w-full bg-primary hover:bg-primary/90 text-white disabled:bg-gray-300"
                                size="sm"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-white border-l shadow-lg flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Order Cart</h2>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <Badge variant="secondary">{cart.length} items</Badge>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Cart Items */}
          {orderLoading ? (
            <div className="flex items-center justify-center h-32 text-primary">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading order data...
            </div>
          ) : cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Cart is empty</p>
              <p className="text-sm text-gray-400">Add services or products to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((cartItem, idx) => (
                <Card key={`${cartItem.type}-${cartItem.item._id}`} className="luxury-card p-2 rounded-xl shadow-md flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 w-full">
                    <Badge variant={cartItem.type === 'service' ? 'default' : 'secondary'} className="text-xs">
                      {cartItem.type === 'service' ? 'Service' : 'Product'}
                    </Badge>
                    <div className="font-semibold text-sm text-gray-900 text-center truncate flex-1">
                      {cartItem.item.name}
                    </div>
                  </div>
                  <div className="text-primary font-bold text-base">
                    Ksh {typeof cartItem.price === 'string' 
                      ? cartItem.price.replace(/[^\d.]/g, '')
                      : cartItem.price.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    {cartItem.type === 'service' 
                      ? (cartItem.item as Service).unit ? `per ${(cartItem.item as Service).unit}` : ((cartItem.item as Service).category === 'printing' ? 'per piece' : (cartItem.item as Service).category === 'gas' ? 'per cylinder' : (cartItem.item as Service).category === 'electronics' ? 'per unit' : 'per piece')
                      : `per ${(cartItem.item as Product).unit}`
                    }
                  </div>
                  {cartItem.type === 'product' && (
                    <div className="text-xs text-gray-500">
                      Stock: {(cartItem.item as Product).stock}
                    </div>
                  )}
                  <div className="flex items-center gap-2 justify-center w-full">
                    <label htmlFor={`cart-qty-${cartItem.type}-${cartItem.item._id}`} className="text-xs text-gray-600">Qty:</label>
                    <Input
                      id={`cart-qty-${cartItem.type}-${cartItem.item._id}`}
                      type="number"
                      min={cartItem.type === 'service' ? 0.1 : 1}
                      step={cartItem.type === 'service' ? 0.1 : 1}
                      value={cartItem.quantity}
                      onChange={e => {
                        let qty = cartItem.type === 'service' 
                          ? parseFloat(e.target.value) || 0.1
                          : parseInt(e.target.value) || 1;
                        if (cartItem.type === 'service' && qty < 0.1) qty = 0.1;
                        if (cartItem.type === 'product' && qty < 1) qty = 1;
                        if (cartItem.type === 'product' && qty > (cartItem.item as Product).stock) {
                          qty = (cartItem.item as Product).stock;
                        }
                        setCart(cart => cart.map((c, i) => i === idx ? { ...c, quantity: qty } : c));
                      }}
                      className="w-14 text-center text-xs py-1 px-2 border rounded-md"
                      placeholder="Qty"
                    />
                    <Button size="icon" variant="ghost" onClick={() => setCart(cart => cart.filter((_, i) => i !== idx))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Customer Information */}
          {cart.length > 0 && (
            <Card className="overflow-hidden border-2 border-gray-100 shadow-lg">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <CardTitle className="text-xl flex items-center gap-3 text-gray-800">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  Customer Information
                  {isExistingCustomer && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-sm px-3 py-1 rounded-full">
                      <UserCheck className="w-3 h-3 mr-1" />
                      Existing Customer
                    </Badge>
                  )}
                  {!isExistingCustomer && customerInfo.name && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-sm px-3 py-1 rounded-full">
                      <UserPlus className="w-3 h-3 mr-1" />
                      New Customer
                    </Badge>
                  )}
                </CardTitle>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {/* Customer Details */}
                  <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Customer Details
                    </h3>
                    
                    {/* Customer Name Search */}
                    <div className="relative mb-4" ref={suggestionDropdownRef}>
                      <Label htmlFor="name" className="text-sm font-medium text-gray-600 mb-2 block">
                        Customer Name <span className="text-gray-400">(Optional)</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="name"
                          value={customerSearch}
                          onChange={(e) => handleCustomerSearchChange(e.target.value)}
                          placeholder="Start typing customer name..."
                          className={`h-11 ${isExistingCustomer ? 'border-emerald-500 bg-emerald-50 focus:border-emerald-500 focus:ring-emerald-200' : 'focus:border-blue-500 focus:ring-blue-200'}`}
                        />
                      {searchLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        </div>
                      )}
                      {isExistingCustomer && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <UserCheck className="h-4 w-4 text-emerald-600" />
                        </div>
                      )}
                      {customerInfo.name && !isExistingCustomer && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={clearCustomerSearch}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-gray-100"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  
                  {/* Customer Suggestions Dropdown */}
                  {showSuggestions && customerSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {customerSuggestions.map((customer) => (
                        <div
                          key={customer._id}
                          onClick={() => selectCustomer(customer)}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-600 flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {customer.phone}
                                </span>
                                {customer.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {customer.email}
                                  </span>
                                )}
                              </div>
                              {customer.address && (
                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                  <MapPinIcon className="w-3 h-3" />
                                  {customer.address}
                                </div>
                              )}
                            </div>
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* No results message */}
                  {showSuggestions && customerSuggestions.length === 0 && !searchLoading && customerSearch.length >= 2 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                      <div className="text-center text-gray-500">
                        <UserPlus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <div className="text-sm">No existing customers found</div>
                        <div className="text-xs text-gray-400">Will create new customer</div>
                      </div>
                    </div>
                  )}
                </div>

                    {/* Phone Number */}
                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium text-gray-600 mb-2 block">
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="phone"
                          value={customerInfo.phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          placeholder="Enter phone number"
                          className={`h-11 ${isExistingCustomer ? 'border-emerald-500 bg-emerald-50 focus:border-emerald-500 focus:ring-emerald-200' : 'focus:border-blue-500 focus:ring-blue-200'}`}
                        />
                        {isExistingCustomer && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <UserCheck className="h-4 w-4 text-emerald-600" />
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        Phone numbers are used to identify existing customers
                      </div>
                    </div>
                  </div>
                  </div>

                  {/* Promo Code Section */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      Promo Code
                      {lockedPromotion && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs ml-auto">
                          🔒 Locked In
                        </Badge>
                      )}
                    </h3>
                    <div className="relative">
                      <Input
                        id="promoCode"
                        value={promoCode}
                        onChange={e => setPromoCode(e.target.value)}
                        placeholder="Enter promo code (e.g. SAVE20)"
                        className={`h-11 ${lockedPromotion ? 'border-emerald-500 bg-emerald-50 focus:border-emerald-500 focus:ring-emerald-200' : promoValid === true ? 'border-emerald-500 bg-emerald-50 focus:border-emerald-500 focus:ring-emerald-200' : promoValid === false ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-200' : 'focus:border-purple-500 focus:ring-purple-200'}`}
                        autoComplete="off"
                        disabled={promoLoading}
                      />
                      {promoLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-[#2E7D32]" />
                        </div>
                      )}
                      {lockedPromotion && !promoLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <span className="text-emerald-600 text-lg">🔒</span>
                        </div>
                      )}
                    </div>
                    {promoMessage && (
                      <div className={`text-xs mt-1 p-2 rounded-md ${lockedPromotion ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : promoValid === true ? 'text-emerald-600' : 'text-red-600'}`}>
                        {promoMessage}
                        {lockedPromotion && (
                          <div className="mt-1 text-xs text-emerald-600">
                            This promotion is locked in and will be honored even if it expires before order completion.
                          </div>
                        )}
                      </div>
                    )}
                    {lockedPromotion && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPromoCode("");
                          setPromoDiscount(0);
                          setLockedPromotion(null);
                          setPromoValid(null);
                          setPromoMessage("");
                        }}
                        className="mt-2 text-xs h-7"
                      >
                        Clear Promo
                      </Button>
                    )}
                  </div>

                  {/* Payment Status Section */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Payment Status
                    </h3>
                    <Select value={customerInfo.paymentStatus} onValueChange={(value) => setCustomerInfo(prev => ({ ...prev, paymentStatus: value as 'unpaid' | 'paid' | 'partial' }))}>
                      <SelectTrigger className="h-11 focus:border-green-500 focus:ring-green-200">
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">💳 Unpaid</SelectItem>
                        <SelectItem value="paid">✅ Paid</SelectItem>
                        <SelectItem value="partial">💰 Partial Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* SMS Notifications Section */}
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      SMS Notifications
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="sendSMS"
                          checked={sendSMS}
                          onCheckedChange={(checked) => setSendSMS(checked as boolean)}
                          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <Label htmlFor="sendSMS" className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                          <MessageSquare className="h-4 w-4" />
                          Send SMS notification to customer
                        </Label>
                      </div>

                      {sendSMS && (
                        <div className="flex items-center space-x-3 ml-6">
                          <Checkbox
                            id="sendSimplifiedSMS"
                            checked={sendSimplifiedSMS}
                            onCheckedChange={(checked) => setSendSimplifiedSMS(checked as boolean)}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <Label htmlFor="sendSimplifiedSMS" className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer">
                            Send simplified message (services + amount only)
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Full-width sections */}
              <div className="mt-6 space-y-4">
                {/* Partial Payment Amount */}
                {customerInfo.paymentStatus === 'partial' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <Label htmlFor="partialAmount" className="text-sm font-medium text-yellow-800">Amount Paid</Label>
                    <Input
                      id="partialAmount"
                      type="number"
                      min={0}
                      max={calculateFinalTotal()}
                      step={1}
                      value={customerInfo.partialAmount}
                      onChange={(e) => {
                        const value = Math.max(0, Math.min(calculateFinalTotal(), parseInt(e.target.value) || 0));
                        setCustomerInfo(prev => ({ ...prev, partialAmount: value.toString() }));
                      }}
                      placeholder={`Max: Ksh ${calculateFinalTotal().toLocaleString()}`}
                      className="mt-1"
                    />
                    <div className="text-xs text-yellow-700 mt-1">
                      Remaining: Ksh {Math.max(0, calculateFinalTotal() - (parseInt(customerInfo.partialAmount) || 0)).toLocaleString()}
                    </div>
                  </div>
                )}

              </div>
            </Card>
          )}

          {/* Order Summary and Actions - Moved here to reduce scrolling */}
          {cart.length > 0 && (
            <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Summary
              </h3>
              <div className="space-y-3">
                {/* Subtotal */}
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-gray-700">Subtotal:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    Ksh {getCartTotal().toLocaleString()}
                  </span>
                </div>

                {/* Promo Discount */}
                {promoDiscount > 0 && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Promo Discount:</span>
                      {lockedPromotion && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                          🔒 Locked
                        </Badge>
                      )}
                    </div>
                    <span className="text-lg font-semibold text-emerald-600">
                      -Ksh {promoDiscount.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Services */}
                <div className="space-y-2">
                  <span className="font-medium text-gray-700">Services:</span>
                  <div className="space-y-1">
                    {cart.map((cartItem, index) => {
                      let unitPrice = 0;
                      if (typeof cartItem.price === 'string') {
                        const cleanPrice = cartItem.price.replace(/[^\d.]/g, '');
                        unitPrice = parseFloat(cleanPrice) || 0;
                      } else if (typeof cartItem.price === 'number') {
                        unitPrice = isNaN(cartItem.price) ? 0 : cartItem.price;
                      }
                      
                      // Ensure we never have NaN
                      if (isNaN(unitPrice)) {
                        unitPrice = 0;
                      }
                      
                      const totalPrice = unitPrice * cartItem.quantity;
                      
                      return (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <div className="flex flex-col">
                            <span className="text-gray-600">
                              {cartItem.quantity} × {cartItem.item.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              @ Ksh {unitPrice.toLocaleString()} each
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">
                            Ksh {totalPrice.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Payment Status */}
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Payment Status:</span>
                  <Badge 
                    variant="outline" 
                    className={`${
                      customerInfo.paymentStatus === 'paid' 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                        : customerInfo.paymentStatus === 'partial'
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        : 'bg-red-100 text-red-800 border-red-200'
                    }`}
                  >
                    {customerInfo.paymentStatus.charAt(0).toUpperCase() + customerInfo.paymentStatus.slice(1)}
                  </Badge>
                </div>

                {/* Partial Payment Breakdown */}
                {customerInfo.paymentStatus === 'partial' && customerInfo.partialAmount && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">Amount Paid:</span>
                      <span className="text-lg font-semibold text-green-600">
                        Ksh {parseInt(customerInfo.partialAmount).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">Remaining Balance:</span>
                      <span className="text-lg font-semibold text-red-600">
                        Ksh {Math.max(0, calculateFinalTotal() - parseInt(customerInfo.partialAmount)).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}

                {/* Final Total */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="font-bold text-lg text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-primary">
                    Ksh {calculateFinalTotal().toLocaleString()}
                  </span>
                </div>

                {/* SMS Notification Status */}
                {sendSMS && customerInfo.phone && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-700 font-medium">
                      {sendSimplifiedSMS ? 'Simplified SMS' : 'Detailed SMS'} will be sent to {customerInfo.phone}
                    </span>
                  </div>
                )}

                {!sendSMS && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <X className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600 font-medium">
                      SMS notifications disabled
                    </span>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="mt-6 pt-4 border-t border-gray-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={clearCart}
                      className="flex items-center justify-center gap-2 h-12"
                    >
                      <X className="w-4 h-4" />
                      Clear Cart
                    </Button>
                    <Button
                      onClick={handleCreateOrder}
                      disabled={isProcessingOrder || !customerInfo.phone}
                      className={`flex items-center justify-center gap-2 h-12 text-white ${
                        isProcessingOrder 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-primary hover:bg-primary/90'
                      }`}
                    >
                      {isProcessingOrder ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Package className="w-4 h-4" />
                      )}
                      {isProcessingOrder ? 'Processing...' : (isEditing ? 'Update Order' : 'Create Order')}
                    </Button>
                  </div>
                  
                  {/* Initiate Payment Button - Will work after M-Pesa integration */}
                  <Button
                    onClick={() => {
                      // TODO: Implement M-Pesa payment initiation
                      alert('M-Pesa payment initiation will be implemented after M-Pesa integration');
                    }}
                    disabled={isProcessingOrder || !customerInfo.phone || customerInfo.paymentStatus === 'paid'}
                    className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white h-12 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Initiate Payment (M-Pesa)
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="w-6 h-6" />
              {isEditing ? 'Order Updated Successfully!' : 'Order Created Successfully!'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Your order has been updated in the database. What would you like to do next?'
                : 'Your order has been saved to the database. What would you like to do next?'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              onClick={() => {
                setSuccessDialogOpen(false);
                router.push('/admin/orders');
              }}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Proceed to Orders Page
            </Button>
            {!isEditing && (
              <Button 
                variant="outline"
                onClick={() => {
                  setSuccessDialogOpen(false);
                  setOrderSuccess(false);
                  // Reset form for new order
                  setCustomerInfo({
                    name: '',
                    phone: '',
                    email: '',
                    address: '',
                    pickupDate: '',
                    pickupTime: '',
                    notes: '',
                    pickDropAmount: '',
                    discount: '',
                    paymentStatus: 'unpaid',
                    partialAmount: '',
                  });
                }}
                className="w-full"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Continue Adding Orders
              </Button>
            )}
            {isEditing && (
              <Button 
                variant="outline"
                onClick={() => {
                  setSuccessDialogOpen(false);
                  setOrderSuccess(false);
                  setIsEditing(false);
                  setEditingOrderId(null);
                  clearCart();
                  router.push('/admin/pos');
                }}
                className="w-full"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create New Order
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
