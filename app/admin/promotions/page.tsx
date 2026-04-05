"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Download,
  Plus,
  Calendar,
  Tag,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAuth } from "@/hooks/useAuth"

export default function PromotionsPage() {
  const { isAdmin, logout, isLoading, token } = useAuth();
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      logout();
    }
  }, [isAdmin, isLoading, logout]);
  if (!isAdmin) return null;

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPromotion, setSelectedPromotion] = useState<any>(null)
  const [promotions, setPromotions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [promotionToDelete, setPromotionToDelete] = useState<any>(null)
  const [updating, setUpdating] = useState(false)
  const [updateMessage, setUpdateMessage] = useState("")
  const [form, setForm] = useState({
    title: "",
    promoCode: "",
    description: "",
    discount: "",
    discountType: "percentage",
    usageLimit: "",
    startDate: "",
    endDate: "",
    minOrderAmount: "",
    maxDiscount: "",
    bannerImage: null as File | null,
    active: false,
  })
  const [editForm, setEditForm] = useState({
    title: "",
    promoCode: "",
    description: "",
    discount: "",
    discountType: "percentage",
    usageLimit: "",
    startDate: "",
    endDate: "",
    minOrderAmount: "",
    maxDiscount: "",
    bannerImage: null as File | null,
    active: false,
  })

  useEffect(() => {
    fetchPromotions()
  }, [])

  async function fetchPromotions() {
    setLoading(true)
    try {
      const res = await fetch("/api/promotions")
      const data = await res.json()
      setPromotions(data.promotions || [])
    } catch (error) {
      console.error('Error fetching promotions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Manual status update function
  async function handleUpdateStatuses() {
    setUpdating(true)
    setUpdateMessage("")
    try {
      // Trigger a fetch which will auto-update statuses on the server
      const res = await fetch("/api/promotions")
      const data = await res.json()
      setPromotions(data.promotions || [])
      setUpdateMessage("✅ Promotion statuses updated successfully!")
      
      // Clear message after 3 seconds
      setTimeout(() => setUpdateMessage(""), 3000)
    } catch (error) {
      setUpdateMessage("❌ Failed to update promotion statuses")
      setTimeout(() => setUpdateMessage(""), 3000)
    } finally {
      setUpdating(false)
    }
  }

  function handleFormChange(e: any) {
    const { name, value, type, checked, files } = e.target
    if (type === "checkbox") {
      setForm((f) => ({ ...f, [name]: checked }))
    } else if (type === "file") {
      setForm((f) => ({ ...f, [name]: files[0] }))
    } else {
      setForm((f) => ({ ...f, [name]: value }))
    }
  }

  async function handleCreatePromotion(e: any) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("title", form.title)
      formData.append("promoCode", form.promoCode)
      formData.append("description", form.description)
      formData.append("discount", form.discount)
      formData.append("discountType", form.discountType)
      formData.append("usageLimit", form.usageLimit)
      formData.append("startDate", form.startDate)
      formData.append("endDate", form.endDate)
      formData.append("minOrderAmount", form.minOrderAmount)
      formData.append("maxDiscount", form.maxDiscount)
      formData.append("status", form.active ? "active" : "scheduled")
      if (form.bannerImage) formData.append("bannerImage", form.bannerImage)
      console.log("JWT token being sent:", token)
      const res = await fetch("/api/promotions", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "Failed to create promotion")
      setCreateDialogOpen(false)
      setForm({
        title: "",
        promoCode: "",
        description: "",
        discount: "",
        discountType: "percentage",
        usageLimit: "",
        startDate: "",
        endDate: "",
        minOrderAmount: "",
        maxDiscount: "",
        bannerImage: null,
        active: false,
      })
      setPromotions((prev) => [data.promotion, ...prev])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Edit promotion functions
  function openEditDialog(promotion: any) {
    setSelectedPromotion(promotion)
    setEditForm({
      title: promotion.title,
      promoCode: promotion.promoCode,
      description: promotion.description,
      discount: promotion.discount.toString(),
      discountType: promotion.discountType,
      usageLimit: promotion.usageLimit.toString(),
      startDate: promotion.startDate.split('T')[0],
      endDate: promotion.endDate.split('T')[0],
      minOrderAmount: promotion.minOrderAmount.toString(),
      maxDiscount: promotion.maxDiscount.toString(),
      bannerImage: null,
      active: promotion.status === 'active',
    })
    setEditDialogOpen(true)
  }

  async function handleEditPromotion(e: any) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("title", editForm.title)
      formData.append("promoCode", editForm.promoCode)
      formData.append("description", editForm.description)
      formData.append("discount", editForm.discount)
      formData.append("discountType", editForm.discountType)
      formData.append("usageLimit", editForm.usageLimit)
      formData.append("startDate", editForm.startDate)
      formData.append("endDate", editForm.endDate)
      formData.append("minOrderAmount", editForm.minOrderAmount)
      formData.append("maxDiscount", editForm.maxDiscount)
      formData.append("status", editForm.active ? "active" : "scheduled")
      if (editForm.bannerImage) formData.append("bannerImage", editForm.bannerImage)

      const res = await fetch(`/api/promotions/${selectedPromotion._id}`, {
        method: "PUT",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "Failed to update promotion")
      
      setEditDialogOpen(false)
      setPromotions((prev) => 
        prev.map((p) => (p._id === selectedPromotion._id ? data.promotion : p))
      )
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Delete promotion functions
  function openDeleteDialog(promotion: any) {
    setPromotionToDelete(promotion)
    setDeleteDialogOpen(true)
  }

  async function handleDeletePromotion() {
    if (!promotionToDelete) return
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`/api/promotions/${promotionToDelete._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "Failed to delete promotion")
      
      setDeleteDialogOpen(false)
      setPromotionToDelete(null)
      setPromotions((prev) => prev.filter((p) => p._id !== promotionToDelete._id))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Duplicate promotion function
  async function handleDuplicatePromotion(promotion: any) {
    setSubmitting(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("title", `${promotion.title} (Copy)`)
      formData.append("promoCode", `${promotion.promoCode}_COPY`)
      formData.append("description", promotion.description)
      formData.append("discount", promotion.discount.toString())
      formData.append("discountType", promotion.discountType)
      formData.append("usageLimit", promotion.usageLimit.toString())
      formData.append("startDate", promotion.startDate.split('T')[0])
      formData.append("endDate", promotion.endDate.split('T')[0])
      formData.append("minOrderAmount", promotion.minOrderAmount.toString())
      formData.append("maxDiscount", promotion.maxDiscount.toString())
      formData.append("status", "scheduled") // Always start as scheduled
      if (promotion.bannerImage) formData.append("bannerImageUrl", promotion.bannerImage)

      const res = await fetch("/api/promotions", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "Failed to duplicate promotion")
      
      setPromotions((prev) => [data.promotion, ...prev])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Export promotions function
  function handleExportPromotions() {
    const csvContent = [
      ['Title', 'Promo Code', 'Description', 'Discount', 'Type', 'Usage', 'Status', 'Start Date', 'End Date'],
      ...promotions.map(p => [
        p.title,
        p.promoCode,
        p.description,
        p.discount,
        p.discountType,
        `${p.usageCount}/${p.usageLimit}`,
        p.status,
        formatDate(p.startDate),
        formatDate(p.endDate)
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `promotions-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "expired":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "paused":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="w-4 h-4" />
      case "scheduled":
        return <Clock className="w-4 h-4" />
      case "expired":
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const filteredPromotions = promotions.filter(
    (promotion) =>
      promotion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      promotion.promoCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      promotion.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Check if promotion needs status update (client-side validation)
  const getPromotionStatusInfo = (promotion: any) => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);
    
    const usagePercentage = (promotion.usageCount / promotion.usageLimit) * 100;
    const isUsageLimitReached = promotion.usageCount >= promotion.usageLimit;
    const isBeforeStart = now < startDate;
    const isAfterEnd = now > endDate;
    const isInTimeRange = now >= startDate && now <= endDate;
    
    let suggestedStatus = promotion.status;
    if (isUsageLimitReached) {
      suggestedStatus = 'expired';
    } else if (isAfterEnd) {
      suggestedStatus = 'expired';
    } else if (isInTimeRange) {
      suggestedStatus = 'active';
    } else if (isBeforeStart) {
      suggestedStatus = 'scheduled';
    }
    
    return {
      currentStatus: promotion.status,
      suggestedStatus,
      usagePercentage: Math.round(usagePercentage),
      isUsageLimitReached,
      isBeforeStart,
      isAfterEnd,
      isInTimeRange,
      daysUntilStart: isBeforeStart ? Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0,
      daysUntilEnd: isInTimeRange ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0,
      statusMismatch: promotion.status !== suggestedStatus
    };
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promotions Management</h1>
          <p className="text-text-light">Create and manage promotional campaigns and discount codes</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button variant="outline" className="rounded-xl" onClick={handleUpdateStatuses} disabled={updating}>
            <RefreshCw className={`mr-2 w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
            {updating ? 'Updating...' : 'Update Statuses'}
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={handleExportPromotions}>
            <Download className="mr-2 w-4 h-4" />
            Export
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-white rounded-xl">
                <Plus className="mr-2 w-4 h-4" />
                Create Promotion
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Promotion</DialogTitle>
                <DialogDescription>Set up a new promotional campaign with discount codes</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePromotion} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Promotion Title</Label>
                    <Input id="title" name="title" value={form.title} onChange={handleFormChange} placeholder="Enter promotion title" className="luxury-input" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promoCode">Promo Code</Label>
                    <Input id="promoCode" name="promoCode" value={form.promoCode} onChange={handleFormChange} placeholder="e.g. SAVE20" className="luxury-input" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" value={form.description} onChange={handleFormChange} placeholder="Enter promotion description" className="luxury-input min-h-[80px]" required />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount Value</Label>
                    <Input id="discount" name="discount" type="number" value={form.discount} onChange={handleFormChange} placeholder="20" className="luxury-input" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountType">Discount Type</Label>
                    <select id="discountType" name="discountType" value={form.discountType} onChange={handleFormChange} className="luxury-input w-full">
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (Ksh)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="usageLimit">Usage Limit</Label>
                    <Input id="usageLimit" name="usageLimit" type="number" value={form.usageLimit} onChange={handleFormChange} placeholder="1000" className="luxury-input" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input id="startDate" name="startDate" type="date" value={form.startDate} onChange={handleFormChange} className="luxury-input" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input id="endDate" name="endDate" type="date" value={form.endDate} onChange={handleFormChange} className="luxury-input" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minOrderAmount">Min Order Amount (Ksh)</Label>
                    <Input id="minOrderAmount" name="minOrderAmount" type="number" value={form.minOrderAmount} onChange={handleFormChange} placeholder="2500" className="luxury-input" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxDiscount">Max Discount (Ksh)</Label>
                    <Input id="maxDiscount" name="maxDiscount" type="number" value={form.maxDiscount} onChange={handleFormChange} placeholder="500" className="luxury-input" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Banner Image</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                    <Upload className="w-8 h-8 mx-auto text-text-light mb-2" />
                    <p className="text-sm text-text-light">Drag and drop a banner image here, or click to browse</p>
                    <Input type="file" name="bannerImage" accept="image/*" onChange={handleFormChange} className="hidden" id="banner-image" />
                    <Label htmlFor="banner-image" className="mt-4 inline-block bg-secondary hover:bg-secondary/80 text-text px-4 py-2 rounded-lg cursor-pointer text-sm">Select Image</Label>
                    {form.bannerImage && <p className="text-xs mt-2">{(form.bannerImage as File).name}</p>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="active" name="active" checked={form.active} onCheckedChange={(checked) => setForm(f => ({ ...f, active: checked }))} />
                  <Label htmlFor="active">Activate immediately</Label>
                </div>
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <DialogFooter>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setCreateDialogOpen(false)} disabled={submitting}>Cancel</Button>
                  <Button type="submit" className="bg-accent hover:bg-accent/90 text-white rounded-xl" disabled={submitting}>{submitting ? "Creating..." : "Create Promotion"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Update Status Message */}
      {updateMessage && (
        <div className={`p-4 rounded-xl ${updateMessage.includes('✅') ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          {updateMessage}
        </div>
      )}

      {/* Edit Promotion Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Promotion</DialogTitle>
            <DialogDescription>Update promotion details and settings</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditPromotion} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Promotion Title</Label>
                <Input id="edit-title" name="title" value={editForm.title} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Enter promotion title" className="luxury-input" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-promoCode">Promo Code</Label>
                <Input id="edit-promoCode" name="promoCode" value={editForm.promoCode} onChange={(e) => setEditForm(f => ({ ...f, promoCode: e.target.value }))} placeholder="e.g. SAVE20" className="luxury-input" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" name="description" value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Enter promotion description" className="luxury-input min-h-[80px]" required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-discount">Discount Value</Label>
                <Input id="edit-discount" name="discount" type="number" value={editForm.discount} onChange={(e) => setEditForm(f => ({ ...f, discount: e.target.value }))} placeholder="20" className="luxury-input" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-discountType">Discount Type</Label>
                <select id="edit-discountType" name="discountType" value={editForm.discountType} onChange={(e) => setEditForm(f => ({ ...f, discountType: e.target.value }))} className="luxury-input w-full">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (Ksh)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-usageLimit">Usage Limit</Label>
                <Input id="edit-usageLimit" name="usageLimit" type="number" value={editForm.usageLimit} onChange={(e) => setEditForm(f => ({ ...f, usageLimit: e.target.value }))} placeholder="1000" className="luxury-input" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startDate">Start Date</Label>
                <Input id="edit-startDate" name="startDate" type="date" value={editForm.startDate} onChange={(e) => setEditForm(f => ({ ...f, startDate: e.target.value }))} className="luxury-input" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endDate">End Date</Label>
                <Input id="edit-endDate" name="endDate" type="date" value={editForm.endDate} onChange={(e) => setEditForm(f => ({ ...f, endDate: e.target.value }))} className="luxury-input" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-minOrderAmount">Min Order Amount (Ksh)</Label>
                <Input id="edit-minOrderAmount" name="minOrderAmount" type="number" value={editForm.minOrderAmount} onChange={(e) => setEditForm(f => ({ ...f, minOrderAmount: e.target.value }))} placeholder="2500" className="luxury-input" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-maxDiscount">Max Discount (Ksh)</Label>
                <Input id="edit-maxDiscount" name="maxDiscount" type="number" value={editForm.maxDiscount} onChange={(e) => setEditForm(f => ({ ...f, maxDiscount: e.target.value }))} placeholder="500" className="luxury-input" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Banner Image</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                <Upload className="w-8 h-8 mx-auto text-text-light mb-2" />
                <p className="text-sm text-text-light">Drag and drop a banner image here, or click to browse</p>
                <Input type="file" name="bannerImage" accept="image/*" onChange={(e) => setEditForm(f => ({ ...f, bannerImage: e.target.files?.[0] || null }))} className="hidden" id="edit-banner-image" />
                <Label htmlFor="edit-banner-image" className="mt-4 inline-block bg-secondary hover:bg-secondary/80 text-text px-4 py-2 rounded-lg cursor-pointer text-sm">Select Image</Label>
                {editForm.bannerImage && <p className="text-xs mt-2">{(editForm.bannerImage as File).name}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="edit-active" name="active" checked={editForm.active} onCheckedChange={(checked) => setEditForm(f => ({ ...f, active: checked }))} />
              <Label htmlFor="edit-active">Activate immediately</Label>
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditDialogOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-white rounded-xl" disabled={submitting}>{submitting ? "Updating..." : "Update Promotion"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Promotion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{promotionToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePromotion} disabled={submitting}>
              {submitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{promotions.length}</p>
              <p className="text-sm text-text-light">Total Promotions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{promotions.filter((p) => p.status === "active").length}</p>
              <p className="text-sm text-text-light">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{promotions.filter((p) => p.status === "scheduled").length}</p>
              <p className="text-sm text-text-light">Scheduled</p>
            </div>
          </CardContent>
        </Card>
        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{promotions.reduce((sum, p) => sum + p.usageCount, 0)}</p>
              <p className="text-sm text-text-light">Total Usage</p>
            </div>
          </CardContent>
        </Card>
        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {promotions.filter((p) => getPromotionStatusInfo(p).statusMismatch).length}
              </p>
              <p className="text-sm text-text-light">Need Update</p>
              {promotions.filter((p) => getPromotionStatusInfo(p).statusMismatch).length > 0 && (
                <AlertTriangle className="w-4 h-4 text-orange-600 mx-auto mt-1" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="luxury-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light w-4 h-4" />
                <Input
                  placeholder="Search promotions by title, code, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 luxury-input"
                />
              </div>
            </div>
            <Button variant="outline" className="rounded-xl">
              <Filter className="mr-2 w-4 h-4" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Promotions Table */}
      <Card className="luxury-card">
        <CardHeader>
          <CardTitle>Promotions ({filteredPromotions.length})</CardTitle>
          <CardDescription>Manage promotional campaigns and discount codes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Promotion</TableHead>
                  <TableHead>Promo Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Start/End Dates</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPromotions.map((promotion, index) => (
                  <motion.tr
                    key={promotion._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-secondary/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 rounded overflow-hidden">
                          <Image
                            src={promotion.bannerImage || "/placeholder.svg"}
                            alt={promotion.title}
                            width={48}
                            height={32}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div>
                          <div className="font-medium">{promotion.title}</div>
                          <div className="text-sm text-text-light max-w-[200px] truncate">{promotion.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {promotion.promoCode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {promotion.discountType === "percentage" ? `${promotion.discount}%` : `Ksh ${promotion.discount}`}
                      </div>
                      <div className="text-xs text-text-light">Min: Ksh {promotion.minOrderAmount}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(promotion.startDate)}
                        </div>
                        <div className="text-text-light">to {formatDate(promotion.endDate)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {promotion.usageCount} / {promotion.usageLimit}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-primary h-1.5 rounded-full"
                            style={{
                              width: `${Math.min((promotion.usageCount / promotion.usageLimit) * 100, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge className={`${getStatusColor(promotion.status)} flex items-center gap-1 w-fit`}>
                          {getStatusIcon(promotion.status)}
                          <span className="capitalize">{promotion.status}</span>
                        </Badge>
                        {(() => {
                          const statusInfo = getPromotionStatusInfo(promotion);
                          if (statusInfo.statusMismatch) {
                            return (
                              <div className="flex items-center gap-1 text-xs text-orange-600">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Should be {statusInfo.suggestedStatus}</span>
                              </div>
                            );
                          }
                          if (statusInfo.isInTimeRange && statusInfo.usagePercentage > 80) {
                            return (
                              <div className="flex items-center gap-1 text-xs text-blue-600">
                                <TrendingUp className="w-3 h-3" />
                                <span>{statusInfo.usagePercentage}% used</span>
                              </div>
                            );
                          }
                          if (statusInfo.isInTimeRange && statusInfo.daysUntilEnd <= 3) {
                            return (
                              <div className="flex items-center gap-1 text-xs text-yellow-600">
                                <Clock className="w-3 h-3" />
                                <span>{statusInfo.daysUntilEnd} days left</span>
                              </div>
                            );
                          }
                          if (statusInfo.isBeforeStart && statusInfo.daysUntilStart <= 7) {
                            return (
                              <div className="flex items-center gap-1 text-xs text-blue-600">
                                <Clock className="w-3 h-3" />
                                <span>Starts in {statusInfo.daysUntilStart} days</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full"
                              onClick={() => setSelectedPromotion(promotion)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{selectedPromotion?.title}</DialogTitle>
                              <DialogDescription>Promotion details and performance</DialogDescription>
                            </DialogHeader>
                            {selectedPromotion && (
                              <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-24 h-16 rounded-lg overflow-hidden">
                                    <Image
                                      src={selectedPromotion.bannerImage || "/placeholder.svg"}
                                      alt={selectedPromotion.title}
                                      width={96}
                                      height={64}
                                      className="object-cover w-full h-full"
                                    />
                                  </div>
                                  <div>
                                    <h3 className="text-xl font-semibold">{selectedPromotion.title}</h3>
                                    <Badge variant="outline" className="font-mono mt-1">
                                      {selectedPromotion.promoCode}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">Promotion Details</h4>
                                      <div className="space-y-2 text-sm">
                                        <p>
                                          <strong>Description:</strong> {selectedPromotion.description}
                                        </p>
                                        <p>
                                          <strong>Discount:</strong>{" "}
                                          {selectedPromotion.discountType === "percentage"
                                            ? `${selectedPromotion.discount}%`
                                            : `Ksh ${selectedPromotion.discount}`}
                                        </p>
                                        <p>
                                          <strong>Min Order:</strong> Ksh {selectedPromotion.minOrderAmount}
                                        </p>
                                        <p>
                                          <strong>Max Discount:</strong> Ksh {selectedPromotion.maxDiscount}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">Performance</h4>
                                      <div className="space-y-2 text-sm">
                                        <p>
                                          <strong>Usage:</strong> {selectedPromotion.usageCount} /{" "}
                                          {selectedPromotion.usageLimit}
                                        </p>
                                        <p>
                                          <strong>Start Date:</strong> {formatDate(selectedPromotion.startDate)}
                                        </p>
                                        <p>
                                          <strong>End Date:</strong> {formatDate(selectedPromotion.endDate)}
                                        </p>
                                        <p>
                                          <strong>Status:</strong>{" "}
                                          <Badge className={`${getStatusColor(selectedPromotion.status)} ml-1`}>
                                            {selectedPromotion.status}
                                          </Badge>
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                  <Button variant="outline" className="rounded-xl" onClick={() => openEditDialog(selectedPromotion)}>
                                    <Edit className="mr-2 w-4 h-4" />
                                    Edit Promotion
                                  </Button>
                                  <Button className="bg-accent hover:bg-accent/90 text-white rounded-xl" onClick={() => handleDuplicatePromotion(selectedPromotion)}>
                                    <Tag className="mr-2 w-4 h-4" />
                                    Duplicate
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="rounded-full">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => openEditDialog(promotion)}>
                              <Edit className="mr-2 w-4 h-4" />
                              Edit Promotion
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicatePromotion(promotion)}>
                              <Tag className="mr-2 w-4 h-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportPromotions()}>
                              <Download className="mr-2 w-4 h-4" />
                              Export Usage
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => openDeleteDialog(promotion)}>
                              <Trash2 className="mr-2 w-4 h-4" />
                              Delete Promotion
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
