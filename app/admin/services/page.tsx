"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import {
  Edit,
  Trash2,
  Plus,
  MoreHorizontal,
  Upload,
  CheckCircle2,
  Shirt,
  Timer,
  Sparkles,
  TrendingUp,
  Shield,
  Truck,
  Save,
  Loader2,
  FolderOpen,
  Tag,
  RotateCcw,
  Home,
  Building,
  AlertCircle,
  Star,
  Wrench,
  Settings,
  Hammer,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/useAuth"

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
  stationIds?: {
    _id: string;
    name: string;
    location: string;
  }[];
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
  createdAt: string;
  updatedAt: string;
}

interface Station {
  _id: string;
  name: string;
  location: string;
  isActive: boolean;
}

export default function ServicesPage() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState("services")
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [showFeaturedLimitAlert, setShowFeaturedLimitAlert] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [stationFilter, setStationFilter] = useState("all")
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [isImageUploading, setIsImageUploading] = useState(false)
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false)
  const [imageChangeService, setImageChangeService] = useState<Service | null>(null)
  const [selectedCategoryImage, setSelectedCategoryImage] = useState<File | null>(null)
  const [categoryImagePreview, setCategoryImagePreview] = useState<string>("")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    turnaround: "",
    features: "",
    featured: false,
    stationIds: [],
  })
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    icon: "Shirt",
    color: "#3B82F6",
    image: "",
  })

  const iconOptions = [
    { value: "Shirt", label: "Shirt" },
    { value: "Timer", label: "Timer" },
    { value: "Sparkles", label: "Sparkles" },
    { value: "TrendingUp", label: "Trending Up" },
    { value: "Shield", label: "Shield" },
    { value: "Truck", label: "Truck" },
    { value: "FolderOpen", label: "Folder" },
    { value: "Tag", label: "Tag" },
    { value: "Home", label: "Home" },
    { value: "Building", label: "Building" },
  ]

  const colorOptions = [
    { value: "#3B82F6", label: "Blue" },
    { value: "#10B981", label: "Green" },
    { value: "#F59E0B", label: "Amber" },
    { value: "#8B5CF6", label: "Purple" },
    { value: "#EF4444", label: "Red" },
    { value: "#06B6D4", label: "Cyan" },
    { value: "#84CC16", label: "Lime" },
    { value: "#F97316", label: "Orange" },
  ]

  // Fetch services and categories from database
  useEffect(() => {
    if (token) {
      fetchServices()
      fetchCategories()
      fetchStations()
    }
  }, [token])

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      
      if (data.success) {
        setServices(data.data)
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
      const response = await fetch('/api/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      
      if (data.success) {
        setCategories(data.categories)
      } else {
        console.error('Categories API returned error:', data.error)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/stations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      
      if (data.success) {
        setStations(data.stations || [])
      } else {
        console.error('Stations API returned error:', data.error)
      }
    } catch (error) {
      console.error('Error fetching stations:', error)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    // Check for featured limit when trying to mark as featured
    if (field === 'featured' && value === true) {
      const currentFeaturedCount = services?.filter(service => service.featured).length || 0
      const isCurrentlyFeatured = editingService?.featured || false
      
      // If this service is not currently featured and we're trying to mark it as featured
      if (!isCurrentlyFeatured && currentFeaturedCount >= 4) {
        setShowFeaturedLimitAlert(true)
        setTimeout(() => setShowFeaturedLimitAlert(false), 5000) // Hide after 5 seconds
        return // Don't update the form data
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCategoryInputChange = (field: string, value: string) => {
    setCategoryFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCategoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedCategoryImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCategoryImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleChangeImage = (service: Service) => {
    setImageChangeService(service)
    setImagePreview(service.image)
    setSelectedImage(null)
    setIsImageDialogOpen(true)
  }

  const handleUpdateImage = async () => {
    if (!imageChangeService || !selectedImage) return

    setIsImageUploading(true)
    try {
      const imageUrl = await uploadImage(selectedImage)
      
      const response = await fetch(`/api/services/${imageChangeService._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...imageChangeService,
          image: imageUrl,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage('Service image updated successfully!')
        setShowSuccess(true)
        setIsImageDialogOpen(false)
        setImageChangeService(null)
        setSelectedImage(null)
        setImagePreview("")
        fetchServices() // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to update image')
      }
    } catch (error) {
      console.error('Error updating image:', error)
      setSuccessMessage('Failed to update image. Please try again.')
      setShowSuccess(true)
    } finally {
      setIsImageUploading(false)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    const data = await response.json()
    if (data.success) {
      return data.url
    }
    throw new Error('Image upload failed')
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      let imageUrl = '/placeholder.svg'
      
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage)
      }

      const featuresArray = formData.features
        .split('\n')
        .map(feature => feature.trim())
        .filter(feature => feature.length > 0)

      const serviceData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: formData.price,
        turnaround: formData.turnaround,
        features: featuresArray,
        image: imageUrl,
        featured: formData.featured,
        stationIds: formData.stationIds,
      }


      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData),
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage('Service created successfully!')
        setShowSuccess(true)
        setIsDialogOpen(false)
        resetForm()
        fetchServices() // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to create service')
      }
    } catch (error) {
      console.error('Error creating service:', error)
      setSuccessMessage('Failed to create service. Please try again.')
      setShowSuccess(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCategorySubmit = async () => {
    setIsSubmitting(true)
    try {
      let imageUrl = ""
      
      if (selectedCategoryImage) {
        imageUrl = await uploadImage(selectedCategoryImage)
      }

      const categoryData = {
        name: categoryFormData.name,
        description: categoryFormData.description,
        icon: categoryFormData.icon,
        color: categoryFormData.color,
        image: imageUrl,
        active: true,
      }

      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage('Category created successfully!')
        setShowSuccess(true)
        setIsCategoryDialogOpen(false)
        resetCategoryForm()
        fetchCategories() // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to create category')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      setSuccessMessage('Failed to create category. Please try again.')
      setShowSuccess(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditService = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description,
      category: service.category,
      price: service.price,
      turnaround: service.turnaround,
      features: service.features.join('\n'),
      featured: service.featured,
      stationIds: service.stationIds?.map(station => station._id) || [],
    })
    setImagePreview(service.image)
    setIsDialogOpen(true)
  }

  const handleCreateCopyForStation = (service: Service) => {
    setEditingService(null) // Clear editing service for new creation
    setFormData({
      name: service.name,
      description: service.description,
      category: service.category,
      price: service.price,
      turnaround: service.turnaround,
      features: service.features.join('\n'),
      featured: service.featured,
      stationIds: [], // Start with no stations - user will select
    })
    setImagePreview(service.image)
    setIsDialogOpen(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryFormData({
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      image: category.image || "",
    })
    setCategoryImagePreview(category.image || "")
    setSelectedCategoryImage(null)
    setIsCategoryDialogOpen(true)
  }

  const handleUpdateService = async () => {
    if (!editingService) return

    setIsSubmitting(true)
    try {
      let imageUrl = editingService.image
      
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage)
      }

      const featuresArray = formData.features
        .split('\n')
        .map(feature => feature.trim())
        .filter(feature => feature.length > 0)

      const updateData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: formData.price,
        turnaround: formData.turnaround,
        features: featuresArray,
        image: imageUrl,
        featured: formData.featured,
        stationIds: formData.stationIds,
      }

      const response = await fetch(`/api/services/${editingService._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage('Service updated successfully!')
        setShowSuccess(true)
        setIsDialogOpen(false)
        resetForm()
        fetchServices() // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to update service')
      }
    } catch (error) {
      console.error('Error updating service:', error)
      setSuccessMessage('Failed to update service. Please try again.')
      setShowSuccess(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return

    setIsSubmitting(true)
    try {
      let imageUrl = editingCategory.image || ""
      
      if (selectedCategoryImage) {
        imageUrl = await uploadImage(selectedCategoryImage)
      }

      const updateData = {
        name: categoryFormData.name,
        description: categoryFormData.description,
        icon: categoryFormData.icon,
        color: categoryFormData.color,
        image: imageUrl,
      }

      const response = await fetch(`/api/categories/${editingCategory._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage('Category updated successfully!')
        setShowSuccess(true)
        setIsCategoryDialogOpen(false)
        resetCategoryForm()
        fetchCategories() // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to update category')
      }
    } catch (error) {
      console.error('Error updating category:', error)
      setSuccessMessage('Failed to update category. Please try again.')
      setShowSuccess(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return

    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage('Service deleted successfully!')
        setShowSuccess(true)
        fetchServices() // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to delete service')
      }
    } catch (error) {
      console.error('Error deleting service:', error)
      setSuccessMessage('Failed to delete service. Please try again.')
      setShowSuccess(true)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage('Category deleted successfully!')
        setShowSuccess(true)
        fetchCategories() // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to delete category')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      setSuccessMessage('Failed to delete category. Please try again.')
      setShowSuccess(true)
    }
  }

  const handleToggleActive = async (serviceId: string, currentActive: boolean) => {
    try {
      console.log('Toggling service:', serviceId, 'from', currentActive, 'to', !currentActive)
      
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !currentActive }),
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)
      
      if (data.success) {
        setSuccessMessage('Service status updated successfully!')
        setShowSuccess(true)
        fetchServices() // Refresh the list
      } else {
        console.error('API returned error:', data.error)
        throw new Error(data.error || 'Failed to update service status')
      }
    } catch (error) {
      console.error('Error updating service status:', error)
      setSuccessMessage('Failed to update service status. Please try again.')
      setShowSuccess(true)
    }
  }

  const handleToggleCategoryActive = async (categoryId: string, currentActive: boolean) => {
    try {
      // Find the category to get its name for service updates
      const category = categories.find(cat => cat._id === categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      // Update category status
      const categoryResponse = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !currentActive }),
      })

      const categoryData = await categoryResponse.json()
      
      if (!categoryData.success) {
        throw new Error(categoryData.error || 'Failed to update category status')
      }

      // Map category name to enum value for service updates

      const categoryEnum = mapCategoryNameToEnum(category.name);

      // Update all services in this category
      const servicesResponse = await fetch('/api/services/bulk-update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          category: categoryEnum, 
          active: !currentActive 
        }),
      })

      const servicesData = await servicesResponse.json()
      
      if (servicesData.success) {
        setSuccessMessage(
          `Category and ${servicesData.modifiedCount} services ${!currentActive ? 'activated' : 'deactivated'} successfully!`
        )
        setShowSuccess(true)
        fetchCategories() // Refresh categories
        fetchServices() // Refresh services
      } else {
        // Category was updated but services failed
        setSuccessMessage('Category updated but failed to update some services. Please check manually.')
        setShowSuccess(true)
        fetchCategories()
        fetchServices()
      }
    } catch (error) {
      console.error('Error updating category status:', error)
      setSuccessMessage('Failed to update category status. Please try again.')
      setShowSuccess(true)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      price: "",
      turnaround: "",
      features: "",
      featured: false,
      stationIds: [],
    })
    setSelectedImage(null)
    setImagePreview("")
    setEditingService(null)
  }

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: "",
      description: "",
      icon: "Shirt",
      color: "#3B82F6",
      image: "",
    })
    setSelectedCategoryImage(null)
    setCategoryImagePreview("")
    setEditingCategory(null)
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    resetForm()
  }

  const handleCategoryDialogClose = () => {
    setIsCategoryDialogOpen(false)
    resetCategoryForm()
  }

  // Function to get price placeholder based on category
  const getPricePlaceholder = (categoryId: string) => {
    if (categoryId === "home-cleaning" || categoryId === "business-cleaning") {
      return "e.g. Ksh 250 per sqm"
    }
    return "e.g. Ksh 1,299 per kg"
  }


  // Function to map enum value to category name
  const mapEnumToCategoryName = (enumValue: string): string => {
    const mapping: { [key: string]: string } = {
      // New business categories
      "electronics": "Electronics",
      "gas": "Gas & Supply",
      "printing": "Printing & Branding",
      "accessories": "Accessories",
      "repair": "Repair",
      "maintenance": "Maintenance",
      "installation": "Installation",
      "consultation": "Consultation",
      // Legacy categories (for backward compatibility)
      "dry-cleaning": "Dry Cleaning",
      "wash-fold": "Wash & Fold",
      "luxury": "Luxury Care",
      "business": "Business",
      "home-cleaning": "Home Cleaning",
      "business-cleaning": "Business Cleaning",
    }
    return mapping[enumValue] || enumValue
  }

  const getIconForCategory = (category: string) => {
    switch (category) {
      // New business categories
      case 'electronics':
        return <Shirt className="w-8 h-8 text-accent" />
      case 'gas':
        return <Timer className="w-8 h-8 text-accent" />
      case 'printing':
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
      // Legacy categories (for backward compatibility)
      case 'dry-cleaning':
        return <Shirt className="w-8 h-8 text-accent" />
      case 'wash-fold':
        return <Timer className="w-8 h-8 text-accent" />
      case 'luxury':
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

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Shirt':
        return <Shirt className="w-6 h-6" />
      case 'Timer':
        return <Timer className="w-6 h-6" />
      case 'Sparkles':
        return <Sparkles className="w-6 h-6" />
      case 'TrendingUp':
        return <TrendingUp className="w-6 h-6" />
      case 'Shield':
        return <Shield className="w-6 h-6" />
      case 'Truck':
        return <Truck className="w-6 h-6" />
      case 'FolderOpen':
        return <FolderOpen className="w-6 h-6" />
      case 'Tag':
        return <Tag className="w-6 h-6" />
      case 'Home':
        return <Home className="w-6 h-6" />
      case 'Building':
        return <Building className="w-6 h-6" />
      default:
        return <Shirt className="w-6 h-6" />
    }
  }

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Services Management</h1>
          <p className="text-text-light text-sm sm:text-base">Manage service offerings and categories</p>
        </div>
      </div>

      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Alert className="bg-emerald-50 text-emerald-800 border-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {showFeaturedLimitAlert && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Alert className="bg-amber-50 text-amber-800 border-amber-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Featured Limit Reached</AlertTitle>
            <AlertDescription>
              You can only have a maximum of 4 featured services. Please unmark another service as featured first.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="services" className="flex items-center gap-2 text-sm sm:text-base">
            <Shirt className="w-4 h-4" />
            <span className="hidden sm:inline">Services</span>
            <span className="sm:hidden">Services</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2 text-sm sm:text-base">
            <FolderOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Categories</span>
            <span className="sm:hidden">Categories</span>
          </TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          {/* Featured Services Summary */}
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-accent flex items-center gap-2">
                <Star className="w-4 h-4" />
                Featured Services ({services?.filter(service => service.featured).length || 0}/4)
              </h3>
              <Badge variant="outline" className="border-accent text-accent">
                Homepage Display
              </Badge>
            </div>
            {services?.filter(service => service.featured).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {services?.filter(service => service.featured).map((service) => (
                  <div key={service._id} className="flex items-center gap-2 p-2 bg-white rounded-lg border">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    <span className="text-sm font-medium truncate">{service.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-light">No services are currently featured. Featured services will appear on your homepage.</p>
            )}
          </div>

          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-white rounded-xl w-full sm:w-auto">
                  <Plus className="mr-2 w-4 h-4" />
                  <span className="hidden sm:inline">Add New Service</span>
                  <span className="sm:hidden">Add Service</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
                <DialogHeader>
                  <DialogTitle>
                    {editingService ? 'Edit Service' : 'Add New Service'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingService ? 'Update service details and station assignments' : 'Create a new service offering and assign it to one or more stations'}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Service Name</Label>
                      <Input 
                        id="name" 
                        placeholder="Enter service name" 
                        className="luxury-input"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                        <SelectTrigger className="luxury-input">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category._id} value={mapCategoryNameToEnum(category.name)}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Enter service description"
                      className="luxury-input min-h-[80px]"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price</Label>
                      <Input 
                        id="price" 
                        placeholder={getPricePlaceholder(formData.category)} 
                        className="luxury-input"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                      />
                      <p className="text-xs text-gray-500">
                        Use "per kg" for laundry services, "per sqm" for cleaning services
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="turnaround">Turnaround Time</Label>
                      <Input 
                        id="turnaround" 
                        placeholder="e.g. 2-3 days" 
                        className="luxury-input"
                        value={formData.turnaround}
                        onChange={(e) => handleInputChange('turnaround', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Service Image</Label>
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-8 text-center transition-all duration-200 hover:border-accent hover:bg-accent/5 cursor-pointer"
                      onDrop={handleImageDrop}
                      onDragOver={handleDragOver}
                      onClick={() => document.getElementById('service-image')?.click()}
                    >
                      {imagePreview ? (
                        <div className="space-y-4">
                          <div className="relative inline-block">
                            <Image
                              src={imagePreview}
                              alt="Preview"
                              width={200}
                              height={150}
                              className="mx-auto rounded-lg object-cover border-2 border-gray-200"
                            />
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200 rounded-lg flex items-center justify-center">
                              <div className="opacity-0 hover:opacity-100 transition-opacity duration-200">
                                <Upload className="w-8 h-8 text-white" />
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                document.getElementById('service-image')?.click()
                              }}
                            >
                              <Upload className="mr-2 w-4 h-4" />
                              Change Image
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedImage(null)
                                setImagePreview("")
                              }}
                            >
                              <Trash2 className="mr-2 w-4 h-4" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                            <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
                          </div>
                          <h3 className="text-base sm:text-lg font-medium mb-2">Upload Service Image</h3>
                          <p className="text-sm text-text-light mb-3 sm:mb-4">
                            Drag and drop an image here, or click to browse
                          </p>
                          <p className="text-xs text-text-light">
                            Supports: JPG, PNG, GIF (Max 5MB)
                          </p>
                        </>
                      )}
                      <Input 
                        type="file" 
                        className="hidden" 
                        id="service-image"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Features (one per line)</Label>
                    <Textarea
                      placeholder="Enter features, one per line"
                      className="luxury-input min-h-[80px]"
                      value={formData.features}
                      onChange={(e) => handleInputChange('features', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stationIds">Stations *</Label>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {stations?.map((station) => (
                          <div key={station._id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`service-station-${station._id}`}
                              checked={formData.stationIds.includes(station._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleInputChange('stationIds', [...formData.stationIds, station._id]);
                                } else {
                                  handleInputChange('stationIds', formData.stationIds.filter(id => id !== station._id));
                                }
                              }}
                              className="rounded border-gray-300 text-accent focus:ring-accent"
                            />
                            <label
                              htmlFor={`service-station-${station._id}`}
                              className="text-sm font-medium text-gray-700 cursor-pointer"
                            >
                              {station.name} - {station.location}
                            </label>
                          </div>
                        ))}
                      </div>
                      {formData.stationIds.length === 0 && (
                        <p className="text-sm text-red-600">Please select at least one station</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="featured" 
                        checked={formData.featured}
                        onCheckedChange={(checked) => handleInputChange('featured', checked)}
                      />
                      <Label htmlFor="featured">Featured Service</Label>
                    </div>
                    <div className="text-sm text-text-light">
                      {services?.filter(service => service.featured).length || 0}/4 featured
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2">
                  <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-accent hover:bg-accent/90 text-white rounded-xl w-full sm:w-auto"
                    onClick={editingService ? handleUpdateService : handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 w-4 h-4" />
                    )}
                    {editingService ? 'Update Service' : 'Save Service'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Station Filter */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Label htmlFor="station-filter" className="text-sm font-medium">Filter by Station:</Label>
                <Select value={stationFilter} onValueChange={setStationFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Stations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stations</SelectItem>
                    <SelectItem value="no_station">No Station</SelectItem>
                    {stations?.map((station) => (
                      <SelectItem key={station._id} value={station._id}>
                        {station.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {services?.filter(service => {
              if (stationFilter === 'all') return true;
              if (stationFilter === 'no_station') {
                return !service.stationIds || service.stationIds.length === 0;
              }
              return service.stationIds && service.stationIds.some(station => station._id === stationFilter);
            }).map((service, index) => (
              <motion.div
                key={service._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="luxury-card overflow-hidden h-full">
                  <div className="relative h-40 sm:h-48">
                    <Image
                      src={service.image || "/placeholder.svg"}
                      alt={service.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      {service.featured && (
                        <Badge className="bg-accent text-white border-0 text-xs">Featured</Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="sm" className="rounded-full bg-white/80 backdrop-blur-sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleEditService(service)}>
                            <Edit className="mr-2 w-4 h-4" />
                            Edit Service
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangeImage(service)}>
                            <Upload className="mr-2 w-4 h-4" />
                            Change Image
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteService(service._id)}
                          >
                            <Trash2 className="mr-2 w-4 h-4" />
                            Delete Service
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div 
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${!service.active ? 'opacity-50' : ''}`}
                          style={{ 
                            backgroundColor: (() => {
                              const categoryObj = categories.find(cat => mapCategoryNameToEnum(cat.name) === service.category);
                              return categoryObj ? `${categoryObj.color}20` : 'var(--primary)';
                            })()
                          }}
                        >
                          {(() => {
                            const categoryObj = categories.find(cat => mapCategoryNameToEnum(cat.name) === service.category);
                            const iconComponent = categoryObj ? getIconComponent(categoryObj.icon) : getIconForCategory(service.category);
                            return React.cloneElement(iconComponent, {
                              style: { 
                                color: categoryObj ? categoryObj.color : 'var(--accent)'
                              }
                            });
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold text-base sm:text-lg truncate ${!service.active ? 'text-gray-500' : ''}`}>
                              {service.name}
                            </h3>
                            {!service.active && (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={service.active}
                        onCheckedChange={() => handleToggleActive(service._id, service.active)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                    <p className={`text-sm mb-3 sm:mb-4 line-clamp-2 ${!service.active ? 'text-gray-400' : 'text-text-light'}`}>
                      {service.description}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                      <div>
                        <span className="text-base sm:text-lg font-bold">{service.price}</span>
                        <span className="text-text-light text-xs">
                          {service.category === "home-cleaning" || service.category === "business-cleaning" 
                            ? " per sqm" 
                            : " per kg"}
                        </span>
                        {service.stationIds && service.stationIds.length > 0 && (
                          <div className="text-xs text-text-light mt-1">
                            Stations: {service.stationIds.map(station => station.name).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs px-3 py-1 font-semibold"
                          style={{
                            backgroundColor: (() => {
                              const categoryObj = categories.find(cat => mapCategoryNameToEnum(cat.name) === service.category);
                              return categoryObj ? `${categoryObj.color}55` : '#e5e7eb'; // ~33% opacity
                            })(),
                            color: (() => {
                              const categoryObj = categories.find(cat => mapCategoryNameToEnum(cat.name) === service.category);
                              if (!categoryObj) return '#222';
                              const hex = categoryObj.color.replace('#', '');
                              const r = parseInt(hex.substring(0,2), 16);
                              const g = parseInt(hex.substring(2,4), 16);
                              const b = parseInt(hex.substring(4,6), 16);
                              const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                              return brightness < 140 ? '#fff' : '#222';
                            })(),
                            border: (() => {
                              const categoryObj = categories.find(cat => mapCategoryNameToEnum(cat.name) === service.category);
                              return categoryObj ? `1.5px solid ${categoryObj.color}` : '1.5px solid #e5e7eb';
                            })(),
                            boxShadow: '0 1px 4px 0 rgba(0,0,0,0.06)',
                            fontWeight: 600,
                          }}
                        >
                          {mapEnumToCategoryName(service.category)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">{service.turnaround}</Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Features:</h4>
                      <ul className="text-xs text-text-light space-y-1">
                        {service.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx} className="flex items-center">
                            <div className="w-1 h-1 bg-accent rounded-full mr-2"></div>
                            <span className="line-clamp-1">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Station Tags */}
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500 font-medium">Assigned Stations:</div>
                      {service.stationIds && service.stationIds.length > 0 ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {service.stationIds.map((station) => (
                              <Badge 
                                key={station._id}
                                variant="outline"
                                className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              >
                                {station.name}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditService(service)}
                              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Edit Stations
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCreateCopyForStation(service)}
                              className="h-6 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              Copy for Station
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline"
                            className="text-xs px-2 py-1 bg-gray-50 text-gray-500 border-gray-200"
                          >
                            No Station
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditService(service)}
                              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Add Station
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCreateCopyForStation(service)}
                              className="h-6 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              Copy for Station
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-white rounded-xl w-full sm:w-auto">
                  <Plus className="mr-2 w-4 h-4" />
                  <span className="hidden sm:inline">Add New Category</span>
                  <span className="sm:hidden">Add Category</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] flex flex-col w-[95vw] sm:w-full">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory ? 'Update category details' : 'Create a new service category'}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Category Name</Label>
                    <Input 
                      id="category-name" 
                      placeholder="Enter category name" 
                      className="luxury-input"
                      value={categoryFormData.name}
                      onChange={(e) => handleCategoryInputChange('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category-description">Description</Label>
                    <Textarea
                      id="category-description"
                      placeholder="Enter category description"
                      className="luxury-input min-h-[80px]"
                      value={categoryFormData.description}
                      onChange={(e) => handleCategoryInputChange('description', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category-icon">Icon</Label>
                      <Select value={categoryFormData.icon} onValueChange={(value) => handleCategoryInputChange('icon', value)}>
                        <SelectTrigger className="luxury-input">
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                        <SelectContent>
                          {iconOptions.map((icon) => (
                            <SelectItem key={icon.value} value={icon.value}>
                              <div className="flex items-center gap-2">
                                {getIconComponent(icon.value)}
                                {icon.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category-color">Color</Label>
                      <Select value={categoryFormData.color} onValueChange={(value) => handleCategoryInputChange('color', value)}>
                        <SelectTrigger className="luxury-input">
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                        <SelectContent>
                          {colorOptions.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded-full border" 
                                  style={{ backgroundColor: color.value }}
                                ></div>
                                {color.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Category Image (Optional)</Label>
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 text-center transition-all duration-200 hover:border-accent hover:bg-accent/5 cursor-pointer"
                      onDrop={handleImageDrop}
                      onDragOver={handleDragOver}
                      onClick={() => document.getElementById('category-image')?.click()}
                    >
                      {categoryImagePreview ? (
                        <div className="space-y-4">
                          <div className="relative inline-block">
                            <Image
                              src={categoryImagePreview}
                              alt="Preview"
                              width={150}
                              height={100}
                              className="mx-auto rounded-lg object-cover border-2 border-gray-200"
                            />
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200 rounded-lg flex items-center justify-center">
                              <div className="opacity-0 hover:opacity-100 transition-opacity duration-200">
                                <Upload className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                document.getElementById('category-image')?.click()
                              }}
                            >
                              <Upload className="mr-2 w-4 h-4" />
                              Change Image
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedCategoryImage(null)
                                setCategoryImagePreview("")
                              }}
                            >
                              <Trash2 className="mr-2 w-4 h-4" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent/10 flex items-center justify-center">
                            <Upload className="w-6 h-6 text-accent" />
                          </div>
                          <h4 className="text-base font-medium mb-2">Upload Category Image</h4>
                          <p className="text-sm text-text-light mb-3">
                            Drag and drop an image here, or click to browse
                          </p>
                          <p className="text-xs text-text-light">
                            Supports: JPG, PNG, GIF (Max 5MB)
                          </p>
                        </>
                      )}
                      <Input 
                        type="file" 
                        className="hidden" 
                        id="category-image"
                        accept="image/*"
                        onChange={handleCategoryImageChange}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2">
                  <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={handleCategoryDialogClose}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-accent hover:bg-accent/90 text-white rounded-xl w-full sm:w-auto"
                    onClick={editingCategory ? handleUpdateCategory : handleCategorySubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 w-4 h-4" />
                    )}
                    {editingCategory ? 'Update Category' : 'Save Category'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={category._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="luxury-card h-full">
                  <CardContent className="p-4 sm:p-6">
                    {category.image && (
                      <div className="relative h-24 sm:h-32 mb-3 sm:mb-4 rounded-lg overflow-hidden">
                        <Image
                          src={category.image}
                          alt={category.name}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div 
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${!category.active ? 'opacity-50' : ''}`}
                          style={{ backgroundColor: `${category.color}20` }}
                        >
                          <div style={{ color: category.color }}>
                            {getIconComponent(category.icon)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold text-base sm:text-lg truncate ${!category.active ? 'text-gray-500' : ''}`}>
                              {category.name}
                            </h3>
                            {!category.active && (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                Inactive
                              </span>
                            )}
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">
                              Affects {services.filter(s => {
                                const categoryEnum = mapCategoryNameToEnum(category.name);
                                return s.category === categoryEnum;
                              }).length} services
                            </span>
                          </div>
                          <p className={`text-sm line-clamp-2 ${!category.active ? 'text-gray-400' : 'text-text-light'}`}>
                            {category.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={category.active}
                        onCheckedChange={() => handleToggleCategoryActive(category._id, category.active)}
                        className="data-[state=checked]:bg-emerald-500 flex-shrink-0"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="text-sm text-text-light truncate">{category.icon}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="sm" className="rounded-full">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                            <Edit className="mr-2 w-4 h-4" />
                            Edit Category
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteCategory(category._id)}
                          >
                            <Trash2 className="mr-2 w-4 h-4" />
                            Delete Category
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Image Change Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Change Service Image</DialogTitle>
            <DialogDescription>
              Update the image for "{imageChangeService?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
            <div className="space-y-2">
              <Label>Service Image</Label>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 text-center transition-all duration-200 hover:border-accent hover:bg-accent/5 cursor-pointer"
                onDrop={handleImageDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('image-change-input')?.click()}
              >
                {imagePreview ? (
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        width={200}
                        height={150}
                        className="mx-auto rounded-lg object-cover border-2 border-gray-200"
                      />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200 rounded-lg flex items-center justify-center">
                        <div className="opacity-0 hover:opacity-100 transition-opacity duration-200">
                          <Upload className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          document.getElementById('image-change-input')?.click()
                        }}
                      >
                        <Upload className="mr-2 w-4 h-4" />
                        Change Image
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedImage(null)
                          setImagePreview("")
                        }}
                      >
                        <Trash2 className="mr-2 w-4 h-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                      <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
                    </div>
                    <h3 className="text-base sm:text-lg font-medium mb-2">Upload New Image</h3>
                    <p className="text-sm text-text-light mb-3 sm:mb-4">
                      Drag and drop an image here, or click to browse
                    </p>
                    <p className="text-xs text-text-light">
                      Supports: JPG, PNG, GIF (Max 5MB)
                    </p>
                  </>
                )}
                <Input 
                  type="file" 
                  className="hidden" 
                  id="image-change-input"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2">
            <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={() => setIsImageDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-accent hover:bg-accent/90 text-white rounded-xl w-full sm:w-auto"
              onClick={handleUpdateImage}
              disabled={isImageUploading}
            >
              {isImageUploading ? (
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              ) : (
                <Save className="mr-2 w-4 h-4" />
              )}
              Update Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 