"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
  Edit,
  Trash2,
  Plus,
  MoreHorizontal,
  Upload,
  CheckCircle2,
  Eye,
  EyeOff,
  Star,
  StarOff,
  Save,
  Loader2,
  ImageIcon,
  VideoIcon,
  Filter,
  Search,
  Grid3X3,
  List,
  Calendar,
  Tag,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useAuth } from "@/hooks/useAuth"

interface GalleryItem {
  _id: string;
  title: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  category: 'before-after' | 'services' | 'facility' | 'team' | 'other';
  status: 'active' | 'inactive';
  featured: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export default function GalleryPage() {
  const { token } = useAuth()
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string>("")
  const [isMediaUploading, setIsMediaUploading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(9)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other" as GalleryItem['category'],
    featured: false,
    order: 0,
  })

  const categoryOptions = [
    { value: "before-after", label: "Before & After" },
    { value: "services", label: "Services" },
    { value: "facility", label: "Facility" },
    { value: "team", label: "Team" },
    { value: "other", label: "Other" },
  ]

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ]

  // Fetch gallery items from database
  useEffect(() => {
    if (token) {
      fetchGalleryItems()
    }
  }, [token])

  const fetchGalleryItems = async () => {
    try {
      const response = await fetch('/api/gallery', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      
      if (data.success) {
        setGalleryItems(data.gallery)
      }
    } catch (error) {
      console.error('Error fetching gallery items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setMediaPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setMediaPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const uploadMedia = async (file: File): Promise<{ url: string; mediaType: string }> => {
    if (!token) {
      throw new Error('No authentication token available')
    }

    // Validate file size before upload
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    const maxSize = isImage ? 5 * 1024 * 1024 : 50 * 1024 * 1024 // 5MB for images, 50MB for videos
    
    if (file.size > maxSize) {
      throw new Error(`${isImage ? 'Image' : 'Video'} file size must be less than ${maxSize / (1024 * 1024)}MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`)
    }

    // Validate file type
    if (!isImage && !isVideo) {
      throw new Error('Only image and video files are allowed')
    }

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('Upload response error:', response.status, errorData)
      
      // Handle specific error cases
      if (response.status === 408) {
        throw new Error('Upload timeout. Please try again with a smaller file or check your internet connection.')
      }
      
      throw new Error(errorData.error || 'Upload failed')
    }

    const result = await response.json()
    return {
      url: result.url,
      mediaType: result.mediaType
    }
  }

  const handleSubmit = async () => {
    if (!selectedFile) {
      setSuccessMessage('Please select a file')
      setShowSuccess(true)
      return
    }

    setIsSubmitting(true)
    try {
      const { url, mediaType } = await uploadMedia(selectedFile)
      
      const galleryData = {
        title: formData.title,
        description: formData.description,
        mediaUrl: url,
        mediaType,
        category: formData.category,
        featured: formData.featured,
        order: formData.order,
      }

      const response = await fetch('/api/gallery', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(galleryData),
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage('Gallery item created successfully!')
        setShowSuccess(true)
        setIsDialogOpen(false)
        resetForm()
        fetchGalleryItems()
      } else {
        throw new Error(data.error || 'Failed to create gallery item')
      }
    } catch (error: any) {
      console.error('Error creating gallery item:', error)
      setSuccessMessage(error.message || 'Failed to create gallery item. Please try again.')
      setShowSuccess(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditItem = (item: GalleryItem) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      description: item.description || "",
      category: item.category,
      featured: item.featured,
      order: item.order,
    })
    setMediaPreview(item.mediaUrl)
    setSelectedFile(null)
    setIsDialogOpen(true)
  }

  const handleUpdateItem = async () => {
    setIsSubmitting(true)
    try {
      let mediaUrl = editingItem?.mediaUrl || ""
      
      if (selectedFile) {
        const { url, mediaType } = await uploadMedia(selectedFile)
        mediaUrl = url
      }

      const galleryData = {
        title: formData.title,
        description: formData.description,
        mediaUrl,
        mediaType: selectedFile ? (selectedFile.type.startsWith('video/') ? 'video' : 'image') : editingItem?.mediaType || "image",
        category: formData.category,
        featured: formData.featured,
        order: formData.order,
      }

      const response = await fetch(`/api/gallery/${editingItem?._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(galleryData),
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage('Gallery item updated successfully!')
        setShowSuccess(true)
        setIsDialogOpen(false)
        setEditingItem(null)
        resetForm()
        fetchGalleryItems()
      } else {
        throw new Error(data.error || 'Failed to update gallery item')
      }
    } catch (error: any) {
      console.error('Error updating gallery item:', error)
      setSuccessMessage(error.message || 'Failed to update gallery item. Please try again.')
      setShowSuccess(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this gallery item?')) {
      return
    }

    try {
      const response = await fetch(`/api/gallery/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage('Gallery item deleted successfully!')
        setShowSuccess(true)
        fetchGalleryItems()
      } else {
        throw new Error(data.error || 'Failed to delete gallery item')
      }
    } catch (error) {
      console.error('Error deleting gallery item:', error)
      setSuccessMessage('Failed to delete gallery item. Please try again.')
      setShowSuccess(true)
    }
  }

  const handleToggleStatus = async (itemId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      
      const response = await fetch(`/api/gallery/${itemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()
      
      if (data.success) {
        fetchGalleryItems()
      } else {
        throw new Error(data.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      setSuccessMessage('Failed to update status. Please try again.')
      setShowSuccess(true)
    }
  }

  const handleToggleFeatured = async (itemId: string, currentFeatured: boolean) => {
    try {
      const response = await fetch(`/api/gallery/${itemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featured: !currentFeatured }),
      })

      const data = await response.json()
      
      if (data.success) {
        fetchGalleryItems()
      } else {
        throw new Error(data.error || 'Failed to update featured status')
      }
    } catch (error) {
      console.error('Error updating featured status:', error)
      setSuccessMessage('Failed to update featured status. Please try again.')
      setShowSuccess(true)
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "other",
      featured: false,
      order: 0,
    })
    setSelectedFile(null)
    setMediaPreview("")
    setEditingItem(null)
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingItem(null)
    resetForm()
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      'before-after': 'bg-green-100 text-green-800',
      'services': 'bg-blue-100 text-blue-800',
      'facility': 'bg-purple-100 text-purple-800',
      'team': 'bg-orange-100 text-orange-800',
      'other': 'bg-gray-100 text-gray-800',
    }
    return colors[category as keyof typeof colors] || colors.other
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      'before-after': '🔄',
      'services': '🛠️',
      'facility': '🏢',
      'team': '👥',
      'other': '📷',
    }
    return icons[category as keyof typeof icons] || icons.other
  }

  const filteredItems = galleryItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    const matchesStatus = statusFilter === "all" || item.status === statusFilter
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const sortedItems = [...filteredItems].sort((a, b) => {
    // Featured items first
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1
    
    // Then by order
    if (a.order !== b.order) return a.order - b.order
    
    // Finally by creation date
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);

  const goToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gallery Management</h1>
          <p className="text-gray-600 mt-1">
            Manage your service photos and portfolio
            {sortedItems.length > 0 && (
              <span className="ml-2 text-sm bg-accent/10 text-accent px-2 py-1 rounded-full">
                {sortedItems.length} item{sortedItems.length !== 1 ? 's' : ''}
                {sortedItems.length > itemsPerPage && (
                  <span className="ml-1">
                    (Page {currentPage} of {totalPages})
                  </span>
                )}
              </span>
            )}
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-accent hover:bg-accent/90 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Gallery Item
        </Button>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search gallery items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Alert */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">
                {successMessage}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery Items */}
      {currentItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No gallery items found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || categoryFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters or search terms."
                : "Get started by adding your first gallery item."
              }
            </p>
            {!searchTerm && categoryFilter === "all" && statusFilter === "all" && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Gallery Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
          }>
            {currentItems.map((item) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={`group hover:shadow-lg transition-all duration-200 ${
                  viewMode === 'list' ? 'flex flex-row' : ''
                }`}>
                  <div className={`relative ${viewMode === 'list' ? 'w-48 h-32' : 'aspect-square'}`}>
                    {item.mediaType === 'video' ? (
                      <div className="w-full h-full relative">
                        <video
                          src={item.mediaUrl}
                          className="w-full h-full object-cover rounded-t-lg"
                          muted
                          onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                          onMouseLeave={(e) => {
                            const video = e.target as HTMLVideoElement;
                            video.pause();
                            video.currentTime = 0;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center">
                            <Play className="w-6 h-6 text-gray-800 ml-1" />
                          </div>
                        </div>
                      </div>
                    ) : (
                    <Image
                        src={item.mediaUrl}
                      alt={item.title}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-t-lg flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteItem(item._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {item.featured && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-yellow-500 text-white">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2">
                      <Badge className={getCategoryColor(item.category)}>
                        {getCategoryIcon(item.category)} {item.category.replace('-', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">{item.title}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditItem(item)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(item._id, item.status)}>
                            {item.status === 'active' ? (
                              <>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Set Inactive
                              </>
                            ) : (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                Set Active
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleFeatured(item._id, item.featured)}>
                            {item.featured ? (
                              <>
                                <StarOff className="mr-2 h-4 w-4" />
                                Remove Featured
                              </>
                            ) : (
                              <>
                                <Star className="mr-2 h-4 w-4" />
                                Mark Featured
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteItem(item._id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Order: {item.order}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Pagination Controls */}
          {sortedItems.length > itemsPerPage && (
            <div className="flex items-center justify-between bg-white rounded-lg shadow-lg p-4 border border-gray-200 mt-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedItems.length)} of {sortedItems.length} gallery items
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className={`w-8 h-8 p-0 ${
                        currentPage === page 
                          ? 'bg-accent hover:bg-accent/90 text-white' 
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Gallery Item' : 'Add New Gallery Item'}
            </DialogTitle>
            <DialogDescription>
              {editingItem 
                ? 'Update the gallery item details below.'
                : 'Add a new image or video to your gallery with details below.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Enter image title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="luxury-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Enter image description (optional)"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="luxury-input min-h-[80px]"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => handleInputChange('category', value as GalleryItem['category'])}
                >
                  <SelectTrigger className="luxury-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.order}
                  onChange={(e) => handleInputChange('order', parseInt(e.target.value) || 0)}
                  className="luxury-input"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Gallery Media *</Label>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-8 text-center transition-all duration-200 hover:border-accent hover:bg-accent/5 cursor-pointer"
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('gallery-media')?.click()}
              >
                {mediaPreview ? (
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      {selectedFile?.type.startsWith('video/') ? (
                        <video
                          src={mediaPreview}
                          className="mx-auto rounded-lg object-cover border-2 border-gray-200 w-[200px] h-[150px]"
                          controls
                          muted
                        />
                      ) : (
                      <Image
                          src={mediaPreview}
                        alt="Preview"
                        width={200}
                        height={150}
                        className="mx-auto rounded-lg object-cover border-2 border-gray-200"
                      />
                      )}
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
                          document.getElementById('gallery-media')?.click()
                        }}
                      >
                        <Upload className="mr-2 w-4 h-4" />
                        Change Media
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedFile(null)
                          setMediaPreview("")
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
                    <h3 className="text-base sm:text-lg font-medium mb-2">Upload Gallery Media</h3>
                    <p className="text-sm text-text-light mb-3 sm:mb-4">
                      Drag and drop an image or video here, or click to browse
                    </p>
                    <p className="text-xs text-text-light">
                      Supports: JPG, PNG, GIF (Max 5MB), MP4 (Max 50MB)
                    </p>
                  </>
                )}
                <Input 
                  type="file" 
                  className="hidden" 
                  id="gallery-media"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="featured" 
                checked={formData.featured}
                onCheckedChange={(checked) => handleInputChange('featured', checked)}
              />
              <Label htmlFor="featured">Featured Item</Label>
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2">
            <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button 
              className="bg-accent hover:bg-accent/90 text-white rounded-xl w-full sm:w-auto"
              onClick={editingItem ? handleUpdateItem : handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              ) : (
                <Save className="mr-2 w-4 h-4" />
              )}
              {editingItem ? 'Update Item' : 'Create Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 