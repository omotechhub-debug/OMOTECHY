"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  ImageIcon,
  Calendar,
  Link as LinkIcon,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from "lucide-react"
import { useAuth } from '@/hooks/useAuth'
import { toast } from "@/components/ui/use-toast"

interface Badge {
  title: string
  subtitle?: string
  icon?: string
}

interface ReviewSnippet {
  rating: number
  reviewCount: number
  text: string
}

interface Banner {
  _id: string
  title: string
  subtitle?: string
  description?: string
  bannerImage: string
  linkUrl?: string
  isActive: boolean
  position: number
  startDate?: string
  endDate?: string
  button1?: { text: string; link: string }
  button2?: { text: string; link: string }
  badges?: Badge[]
  reviewSnippet?: ReviewSnippet
  createdAt: string
  updatedAt: string
}

// Define available routes for button links
const BUTTON_LINK_OPTIONS = [
  { value: 'none', label: 'No Link (Display Only)' },
  { value: '/book', label: 'Book Service' },
  { value: '/booking', label: 'Make Booking' },
  { value: '/services', label: 'All Services' },
  { value: '/shop', label: 'Shop Electronics' },
  { value: '/shop/products', label: 'Electronics Products' },
  { value: '/shop/services', label: 'Service Packages' },
  { value: '/checkout', label: 'Checkout' },
  { value: '/gallery', label: 'Our Gallery' },
  { value: '/contact', label: 'Contact Us' },
  { value: '/how-it-works', label: 'How It Works' },
  { value: '/promotions', label: 'Promotions & Offers' },
  { value: '/privacy', label: 'Privacy Policy' },
  { value: '/terms', label: 'Terms of Service' },
  { value: '/login', label: 'Login' },
  { value: '/signup', label: 'Sign Up' },
  { value: '/dashboard', label: 'Dashboard' },
  { value: '/account', label: 'My Account' },
  { value: '/order-success', label: 'Order Success' },
  { value: '/pending-approval', label: 'Pending Approval' },
];

// Define available icons for badges
const BADGE_ICON_OPTIONS = [
  { value: 'laptop', label: 'Electronics' },
  { value: 'printer', label: 'Printing' },
  { value: 'flame', label: 'Gas Supply' },
  { value: 'clock', label: 'Fast Service' },
  { value: 'star', label: 'Quality' },
  { value: 'check', label: 'Verified' },
  { value: 'sparkles', label: 'Premium' },
  { value: 'shield', label: 'Secure' },
  { value: 'truck', label: 'Delivery' },
  { value: 'user', label: 'Customer' },
  { value: 'wrench', label: 'Repair' },
  { value: 'settings', label: 'Technical' },
  { value: 'zap', label: 'Power' },
  { value: 'camera', label: 'Photography' },
  { value: 'palette', label: 'Design' },
  { value: 'scissors', label: 'Cutting' },
  { value: 'monitor', label: 'Display' },
  { value: 'smartphone', label: 'Mobile' },
  { value: 'harddrive', label: 'Storage' },
  { value: 'wifi', label: 'Connectivity' },
];

export default function BannersPage() {
  const { token } = useAuth()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    bannerImage: null as File | null,
    isActive: true,
    position: 0,
    startDate: '',
    endDate: '',
    linkUrl: '',
    button1: { text: '', link: 'none' },
    button2: { text: '', link: 'none' },
    badges: [] as Badge[],
    reviewSnippet: { rating: 4.9, reviewCount: 2000, text: '' },
  })

  const [editForm, setEditForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    bannerImage: null as File | null,
    isActive: true,
    position: 0,
    startDate: '',
    endDate: '',
    linkUrl: '',
    button1: { text: '', link: 'none' },
    button2: { text: '', link: 'none' },
    badges: [] as Badge[],
    reviewSnippet: { rating: 4.9, reviewCount: 2000, text: '' },
  })

  useEffect(() => {
    if (token) {
      fetchBanners()
    }
  }, [token])

  const fetchBanners = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/banners', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setBanners(data.banners || [])
      } else {
        console.error('Failed to fetch banners')
        toast({
          title: "Error",
          description: "Failed to fetch banners",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching banners:', error)
      toast({
        title: "Error",
        description: "Network error while fetching banners",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setForm(prev => ({ ...prev, bannerImage: file }))
  }

  const handleCreateBanner = async () => {
    if (!form.title || !form.bannerImage) {
      toast({
        title: "Validation Error",
        description: "Title and banner image are required",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      const formData = new FormData()
      
      formData.append('title', form.title)
      if (form.description) formData.append('description', form.description)
      if (form.bannerImage) formData.append('bannerImage', form.bannerImage)
      formData.append('isActive', form.isActive.toString())
      formData.append('position', form.position.toString())
      if (form.startDate) formData.append('startDate', form.startDate)
      if (form.endDate) formData.append('endDate', form.endDate)

      const response = await fetch('/api/banners', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setBanners(prev => [data.banner, ...prev])
        setIsCreateDialogOpen(false)
        setForm({
          title: '',
          subtitle: '',
          description: '',
          bannerImage: null,
          isActive: true,
          position: 0,
          startDate: '',
          endDate: '',
          linkUrl: '',
          button1: { text: '', link: 'none' },
          button2: { text: '', link: 'none' },
          badges: [],
          reviewSnippet: { rating: 4.9, reviewCount: 2000, text: '' },
        })
        toast({
          title: "Success",
          description: "Banner created successfully",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to create banner",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating banner:', error)
      toast({
        title: "Error",
        description: "Network error while creating banner",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditBanner = (banner: Banner) => {
    setSelectedBanner(banner)
    setEditForm({
      title: banner.title,
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      bannerImage: null,
      isActive: banner.isActive,
      position: banner.position,
      startDate: banner.startDate ? new Date(banner.startDate).toISOString().split('T')[0] : '',
      endDate: banner.endDate ? new Date(banner.endDate).toISOString().split('T')[0] : '',
      linkUrl: banner.linkUrl || '',
      button1: banner.button1 || { text: '', link: 'none' },
      button2: banner.button2 || { text: '', link: 'none' },
      badges: banner.badges || [],
      reviewSnippet: banner.reviewSnippet || { rating: 4.9, reviewCount: 2000, text: '' },
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateBanner = async () => {
    if (!selectedBanner || !editForm.title) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      const formData = new FormData()
      
      console.log('🔍 Edit Form Data:', editForm)
      
      formData.append('title', editForm.title)
      if (editForm.subtitle) formData.append('subtitle', editForm.subtitle)
      if (editForm.description) formData.append('description', editForm.description)
      if (editForm.bannerImage) formData.append('bannerImage', editForm.bannerImage)
      formData.append('isActive', editForm.isActive.toString())
      formData.append('position', editForm.position.toString())
      if (editForm.startDate) formData.append('startDate', editForm.startDate)
      if (editForm.endDate) formData.append('endDate', editForm.endDate)
      if (editForm.linkUrl) formData.append('linkUrl', editForm.linkUrl)
      
      // Add button data
      if (editForm.button1) {
        console.log('🔘 Adding button1:', editForm.button1)
        formData.append('button1', JSON.stringify(editForm.button1))
      }
      if (editForm.button2) {
        console.log('🔘 Adding button2:', editForm.button2)
        formData.append('button2', JSON.stringify(editForm.button2))
      }
      
      // Add badges data
      if (editForm.badges && editForm.badges.length > 0) {
        console.log('🏷️ Adding badges:', editForm.badges)
        formData.append('badges', JSON.stringify(editForm.badges))
      }
      
      // Add review snippet data
      if (editForm.reviewSnippet) {
        console.log('⭐ Adding review snippet:', editForm.reviewSnippet)
        formData.append('reviewSnippet', JSON.stringify(editForm.reviewSnippet))
      }

      const response = await fetch(`/api/banners/${selectedBanner._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setBanners(prev => prev.map(banner => 
          banner._id === selectedBanner._id ? data.banner : banner
        ))
        setIsEditDialogOpen(false)
        setSelectedBanner(null)
        toast({
          title: "Success",
          description: "Banner updated successfully",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to update banner",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating banner:', error)
      toast({
        title: "Error",
        description: "Network error while updating banner",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/banners/${bannerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setBanners(prev => prev.filter(banner => banner._id !== bannerId))
        toast({
          title: "Success",
          description: "Banner deleted successfully",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to delete banner",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting banner:', error)
      toast({
        title: "Error",
        description: "Network error while deleting banner",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleButtonChange = (btn: 'button1' | 'button2', field: 'text' | 'link', value: string, isEdit = false) => {
    if (isEdit) {
      setEditForm(prev => ({ ...prev, [btn]: { ...prev[btn], [field]: value } }))
    } else {
      setForm(prev => ({ ...prev, [btn]: { ...prev[btn], [field]: value } }))
    }
  }

  const handleBadgeChange = (index: number, field: keyof Badge, value: string, isEdit = false) => {
    if (isEdit) {
      setEditForm(prev => {
        const badges = [...prev.badges]
        badges[index] = { ...badges[index], [field]: value }
        return { ...prev, badges }
      })
    } else {
      setForm(prev => {
        const badges = [...prev.badges]
        badges[index] = { ...badges[index], [field]: value }
        return { ...prev, badges }
      })
    }
  }

  const handleAddBadge = (isEdit = false) => {
    if (isEdit) {
      setEditForm(prev => ({ ...prev, badges: [...prev.badges, { title: '', subtitle: '', icon: '' }] }))
    } else {
      setForm(prev => ({ ...prev, badges: [...prev.badges, { title: '', subtitle: '', icon: '' }] }))
    }
  }

  const handleRemoveBadge = (index: number, isEdit = false) => {
    if (isEdit) {
      setEditForm(prev => {
        const badges = [...prev.badges]
        badges.splice(index, 1)
        return { ...prev, badges }
      })
    } else {
      setForm(prev => {
        const badges = [...prev.badges]
        badges.splice(index, 1)
        return { ...prev, badges }
      })
    }
  }

  const handleReviewSnippetChange = (field: keyof ReviewSnippet, value: string | number, isEdit = false) => {
    if (isEdit) {
      setEditForm(prev => ({ ...prev, reviewSnippet: { ...prev.reviewSnippet, [field]: value } }))
    } else {
      setForm(prev => ({ ...prev, reviewSnippet: { ...prev.reviewSnippet, [field]: value } }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading banners...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Banner Management</h1>
          <p className="text-gray-600 mt-1">Manage your website banners and promotional images</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Banner</DialogTitle>
              <DialogDescription>
                Add a new banner to your website. Upload an image and set the details.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="Enter banner title"
                />
              </div>

              <div>
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  name="subtitle"
                  value={form.subtitle}
                  onChange={handleFormChange}
                  placeholder="Enter banner subtitle (optional)"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Enter description (optional)"
                  rows={3}
                />
              </div>

              <div>
                <Label>Banner Image *</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">Drag and drop a banner image here, or click to browse</p>
                  <Input
                    type="file"
                    name="bannerImage"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="banner-image"
                  />
                  <Label htmlFor="banner-image" className="mt-4 inline-block bg-secondary hover:bg-secondary/80 text-text px-4 py-2 rounded-lg cursor-pointer text-sm">
                    Select Image
                  </Label>
                  {form.bannerImage && <p className="text-xs mt-2">{(form.bannerImage as File).name}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="button1-text">Button 1 Text</Label>
                <Input
                  id="button1-text"
                  name="button1-text"
                  value={form.button1.text}
                  onChange={(e) => handleButtonChange('button1', 'text', e.target.value)}
                  placeholder="Enter button text"
                />
              </div>

              <div>
                <Label htmlFor="button1-link">Button 1 Link</Label>
                <Select
                  value={form.button1.link}
                  onValueChange={(value) => handleButtonChange('button1', 'link', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a page to link to" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUTTON_LINK_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="button2-text">Button 2 Text</Label>
                <Input
                  id="button2-text"
                  name="button2-text"
                  value={form.button2.text}
                  onChange={(e) => handleButtonChange('button2', 'text', e.target.value)}
                  placeholder="Enter button text"
                />
              </div>

              <div>
                <Label htmlFor="button2-link">Button 2 Link</Label>
                <Select
                  value={form.button2.link}
                  onValueChange={(value) => handleButtonChange('button2', 'link', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a page to link to" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUTTON_LINK_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="badges">Badges</Label>
                <div className="mt-2 space-y-2">
                  {form.badges.map((badge, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        id={`badge-${index}-title`}
                        name={`badge-${index}-title`}
                        value={badge.title}
                        onChange={(e) => handleBadgeChange(index, 'title', e.target.value)}
                        placeholder="Enter badge title"
                      />
                      <Input
                        id={`badge-${index}-icon`}
                        name={`badge-${index}-icon`}
                        value={badge.icon || ''}
                        onChange={(e) => handleBadgeChange(index, 'icon', e.target.value)}
                        placeholder="Enter badge icon"
                      />
                      <Select
                        value={badge.icon || ''}
                        onValueChange={(value) => handleBadgeChange(index, 'icon', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BADGE_ICON_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemoveBadge(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button onClick={() => handleAddBadge()}>Add Badge</Button>
                </div>
              </div>

              <div>
                <Label htmlFor="reviewSnippet-rating">Rating</Label>
                <Input
                  id="reviewSnippet-rating"
                  name="reviewSnippet-rating"
                  type="number"
                  value={form.reviewSnippet.rating}
                  onChange={(e) => handleReviewSnippetChange('rating', parseInt(e.target.value))}
                  placeholder="Enter rating"
                />
              </div>

              <div>
                <Label htmlFor="reviewSnippet-reviewCount">Review Count</Label>
                <Input
                  id="reviewSnippet-reviewCount"
                  name="reviewSnippet-reviewCount"
                  type="number"
                  value={form.reviewSnippet.reviewCount}
                  onChange={(e) => handleReviewSnippetChange('reviewCount', parseInt(e.target.value))}
                  placeholder="Enter review count"
                />
              </div>

              <div>
                <Label htmlFor="reviewSnippet-text">Review Text</Label>
                <Textarea
                  id="reviewSnippet-text"
                  name="reviewSnippet-text"
                  value={form.reviewSnippet.text}
                  onChange={(e) => handleReviewSnippetChange('text', e.target.value)}
                  placeholder="Enter review text"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateBanner} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Banner'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Banners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.map((banner) => (
          <Card key={banner._id} className="overflow-hidden">
            <div className="relative">
              <img
                src={banner.bannerImage}
                alt={banner.title}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-2 right-2">
                <Badge variant={banner.isActive ? "default" : "secondary"}>
                  {banner.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
            
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{banner.title}</CardTitle>
              {banner.description && (
                <CardDescription>{banner.description}</CardDescription>
              )}
            </CardHeader>
            
            <CardContent className="space-y-3">
              {banner.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{banner.description}</p>
              )}
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>Created: {formatDate(banner.createdAt)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Position: {banner.position}</span>
              </div>
            </CardContent>
            
            <div className="px-6 pb-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditBanner(banner)}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteBanner(banner._id)}
                disabled={isDeleting}
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {banners.length === 0 && !loading && (
        <div className="text-center py-12">
          <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No banners yet</h3>
          <p className="text-gray-500 mb-6">
            Get started by creating your first banner
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Banner
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Banner</DialogTitle>
            <DialogDescription>
              Update the banner details and image.
            </DialogDescription>
          </DialogHeader>
          
          {selectedBanner && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  name="title"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter banner title"
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description (optional)"
                  rows={3}
                />
              </div>

              <div>
                <Label>Current Image</Label>
                <img
                  src={selectedBanner.bannerImage}
                  alt={selectedBanner.title}
                  className="w-full h-32 object-cover rounded-lg mt-2"
                />
              </div>

              <div>
                <Label>New Banner Image (Optional)</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">Drag and drop a new banner image here, or click to browse</p>
                  <Input
                    type="file"
                    name="bannerImage"
                    accept="image/*"
                    onChange={(e) => setEditForm(prev => ({ ...prev, bannerImage: e.target.files?.[0] || null }))}
                    className="hidden"
                    id="edit-banner-image"
                  />
                  <Label htmlFor="edit-banner-image" className="mt-4 inline-block bg-secondary hover:bg-secondary/80 text-text px-4 py-2 rounded-lg cursor-pointer text-sm">
                    Select New Image
                  </Label>
                  {editForm.bannerImage && <p className="text-xs mt-2">{(editForm.bannerImage as File).name}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="edit-button1-text">Button 1 Text</Label>
                <Input
                  id="edit-button1-text"
                  name="edit-button1-text"
                  value={editForm.button1.text}
                  onChange={(e) => handleButtonChange('button1', 'text', e.target.value, true)}
                  placeholder="Enter button text"
                />
              </div>

              <div>
                <Label htmlFor="edit-button1-link">Button 1 Link</Label>
                <Select
                  value={editForm.button1.link}
                  onValueChange={(value) => handleButtonChange('button1', 'link', value, true)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a page to link to" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUTTON_LINK_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-button2-text">Button 2 Text</Label>
                <Input
                  id="edit-button2-text"
                  name="edit-button2-text"
                  value={editForm.button2.text}
                  onChange={(e) => handleButtonChange('button2', 'text', e.target.value, true)}
                  placeholder="Enter button text"
                />
              </div>

              <div>
                <Label htmlFor="edit-button2-link">Button 2 Link</Label>
                <Select
                  value={editForm.button2.link}
                  onValueChange={(value) => handleButtonChange('button2', 'link', value, true)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a page to link to" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUTTON_LINK_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-badges">Badges</Label>
                <div className="mt-2 space-y-2">
                  {editForm.badges.map((badge, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        id={`edit-badge-${index}-title`}
                        name={`edit-badge-${index}-title`}
                        value={badge.title}
                        onChange={(e) => handleBadgeChange(index, 'title', e.target.value, true)}
                        placeholder="Enter badge title"
                      />
                      <Input
                        id={`edit-badge-${index}-icon`}
                        name={`edit-badge-${index}-icon`}
                        value={badge.icon || ''}
                        onChange={(e) => handleBadgeChange(index, 'icon', e.target.value, true)}
                        placeholder="Enter badge icon"
                      />
                      <Select
                        value={badge.icon || ''}
                        onValueChange={(value) => handleBadgeChange(index, 'icon', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BADGE_ICON_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemoveBadge(index, true)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button onClick={() => handleAddBadge(true)}>Add Badge</Button>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-reviewSnippet-rating">Rating</Label>
                <Input
                  id="edit-reviewSnippet-rating"
                  name="edit-reviewSnippet-rating"
                  type="number"
                  value={editForm.reviewSnippet.rating}
                  onChange={(e) => handleReviewSnippetChange('rating', parseInt(e.target.value))}
                  placeholder="Enter rating"
                />
              </div>

              <div>
                <Label htmlFor="edit-reviewSnippet-reviewCount">Review Count</Label>
                <Input
                  id="edit-reviewSnippet-reviewCount"
                  name="edit-reviewSnippet-reviewCount"
                  type="number"
                  value={editForm.reviewSnippet.reviewCount}
                  onChange={(e) => handleReviewSnippetChange('reviewCount', parseInt(e.target.value))}
                  placeholder="Enter review count"
                />
              </div>

              <div>
                <Label htmlFor="edit-reviewSnippet-text">Review Text</Label>
                <Textarea
                  id="edit-reviewSnippet-text"
                  name="edit-reviewSnippet-text"
                  value={editForm.reviewSnippet.text}
                  onChange={(e) => handleReviewSnippetChange('text', e.target.value)}
                  placeholder="Enter review text"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBanner} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Banner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
