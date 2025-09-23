"use client"

import { useState, useEffect } from "react"
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
  const [activeTab, setActiveTab] = useState("services")
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    turnaround: "",
    features: "",
    featured: false,
  })
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    icon: "Shirt",
    color: "#3B82F6",
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
    fetchServices()
    fetchCategories()
  }, [])

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services?limit=50')
      const data = await response.json()
      
      if (data.success) {
        setServices(data.data)
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
        setCategories(data.categories)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
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

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
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
      }

      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
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
      const categoryData = {
        name: categoryFormData.name,
        description: categoryFormData.description,
        icon: categoryFormData.icon,
        color: categoryFormData.color,
        active: true,
      }

      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
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
    })
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
      }

      const response = await fetch(`/api/services/${editingService._id}`, {
        method: 'PUT',
        headers: {
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
      const updateData = {
        name: categoryFormData.name,
        description: categoryFormData.description,
        icon: categoryFormData.icon,
        color: categoryFormData.color,
      }

      const response = await fetch(`/api/categories/${editingCategory._id}`, {
        method: 'PUT',
        headers: {
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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !currentActive }),
      })

      const categoryData = await categoryResponse.json()
      
      if (!categoryData.success) {
        throw new Error(categoryData.error || 'Failed to update category status')
      }

      // Map category name to enum value for service updates
      const mapCategoryNameToEnum = (categoryName: string): string => {
        const mapping: { [key: string]: string } = {
          "Electronics": "electronics",
          "Gas & Supply": "gas",
          "Printing & Branding": "printing",
          "Accessories": "accessories",
          "Repair": "repair",
          "Maintenance": "maintenance",
          "Installation": "installation",
          "Consultation": "consultation",
        }
        return mapping[categoryName] || categoryName.toLowerCase().replace(/\s+/g, '-')
      }

      const categoryEnum = mapCategoryNameToEnum(category.name);

      // Update all services in this category
      const servicesResponse = await fetch('/api/services/bulk-update', {
        method: 'PUT',
        headers: {
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
    })
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

  const getIconForCategory = (category: string) => {
    switch (category) {
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
      default:
        return <Shirt className="w-6 h-6" />
    }
  }

  const mapCategoryNameToEnum = (categoryName: string): string => {
    const mapping: { [key: string]: string } = {
      "Electronics": "electronics",
      "Gas & Supply": "gas",
      "Printing & Branding": "printing",
      "Accessories": "accessories",
      "Repair": "repair",
      "Maintenance": "maintenance",
      "Installation": "installation",
      "Consultation": "consultation",
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Services Management</h1>
          <p className="text-text-light">Manage service offerings and categories</p>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Shirt className="w-4 h-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Categories
          </TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-white rounded-xl">
                  <Plus className="mr-2 w-4 h-4" />
                  Add New Service
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingService ? 'Edit Service' : 'Add New Service'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingService ? 'Update service details' : 'Create a new service offering for your customers'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
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
                          {categories.map((category) => (
                            <SelectItem key={category._id} value={category._id}>
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
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                      {imagePreview ? (
                        <div className="space-y-4">
                          <Image
                            src={imagePreview}
                            alt="Preview"
                            width={200}
                            height={150}
                            className="mx-auto rounded-lg object-cover"
                          />
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedImage(null)
                              setImagePreview("")
                            }}
                          >
                            Remove Image
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto text-text-light mb-2" />
                          <p className="text-sm text-text-light">
                            Drag and drop an image here, or click to browse
                          </p>
                          <Input 
                            type="file" 
                            className="hidden" 
                            id="service-image"
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                          <Label
                            htmlFor="service-image"
                            className="mt-4 inline-block bg-secondary hover:bg-secondary/80 text-text px-4 py-2 rounded-lg cursor-pointer text-sm"
                          >
                            Select Image
                          </Label>
                        </>
                      )}
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
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="featured" 
                      checked={formData.featured}
                      onCheckedChange={(checked) => handleInputChange('featured', checked)}
                    />
                    <Label htmlFor="featured">Featured Service</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" className="rounded-xl" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-accent hover:bg-accent/90 text-white rounded-xl"
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

          {/* Services Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={service._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="luxury-card overflow-hidden h-full">
                  <div className="relative h-48">
                    <Image
                      src={service.image || "/placeholder.svg"}
                      alt={service.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      {service.featured && (
                        <Badge className="bg-accent text-white border-0">Featured</Badge>
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
                          <DropdownMenuItem>
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
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ${!service.active ? 'opacity-50' : ''}`}>
                          {getIconForCategory(service.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold text-lg ${!service.active ? 'text-gray-500' : ''}`}>
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
                        className="data-[state=checked]:bg-emerald-500 flex-shrink-0"
                      />
                    </div>
                    <p className={`text-sm mb-4 ${!service.active ? 'text-gray-400' : 'text-text-light'}`}>
                      {service.description}
                    </p>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-lg font-bold">{service.price}</span>
                        <span className="text-text-light text-xs">
                          {service.category === "home-cleaning" || service.category === "business-cleaning" 
                            ? " per sqm" 
                            : " per kg"}
                        </span>
                      </div>
                      <Badge variant="secondary">{service.turnaround}</Badge>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Features:</h4>
                      <ul className="text-xs text-text-light space-y-1">
                        {service.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx} className="flex items-center">
                            <div className="w-1 h-1 bg-accent rounded-full mr-2"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
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
                <Button className="bg-accent hover:bg-accent/90 text-white rounded-xl">
                  <Plus className="mr-2 w-4 h-4" />
                  Add New Category
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory ? 'Update category details' : 'Create a new service category'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
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
                  <div className="grid grid-cols-2 gap-4">
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
                </div>
                <DialogFooter>
                  <Button variant="outline" className="rounded-xl" onClick={handleCategoryDialogClose}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-accent hover:bg-accent/90 text-white rounded-xl"
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={category._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="luxury-card h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${!category.active ? 'opacity-50' : ''}`}
                          style={{ backgroundColor: `${category.color}20` }}
                        >
                          <div style={{ color: category.color }}>
                            {getIconComponent(category.icon)}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold text-lg ${!category.active ? 'text-gray-500' : ''}`}>
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
                          <p className={`text-sm ${!category.active ? 'text-gray-400' : 'text-text-light'}`}>
                            {category.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={category.active}
                        onCheckedChange={() => handleToggleCategoryActive(category._id, category.active)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="text-sm text-text-light">{category.icon}</span>
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
    </div>
  )
} 