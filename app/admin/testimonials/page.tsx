"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  CheckCircle,
  XCircle,
  Eye,
  Star,
  Search,
  Filter,
  MessageSquare,
  Clock,
  User,
  UserCheck,
  Calendar,
  RefreshCw,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"

interface Testimonial {
  _id: string
  name: string
  role?: string
  content: string
  rating: number
  status: "pending" | "approved" | "rejected"
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  image?: string
  email?: string
  phone?: string
  gender?: 'male' | 'female'
}

export default function TestimonialsPage() {
  const { token } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null)
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchTestimonials = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/testimonials/admin', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      
      if (data.success) {
        setTestimonials(data.data)
      } else {
        console.error('Failed to fetch testimonials:', data.message)
      }
    } catch (error) {
      console.error('Error fetching testimonials:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchTestimonials()
    }
  }, [token])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const filteredTestimonials = testimonials.filter(
    (testimonial) =>
      (searchTerm === "" ||
        testimonial.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (testimonial.role && testimonial.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
        testimonial.content.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "all" || testimonial.status === statusFilter)
  )

  const stats = {
    total: testimonials.length,
    pending: testimonials.filter((t) => t.status === "pending").length,
    approved: testimonials.filter((t) => t.status === "approved").length,
    rejected: testimonials.filter((t) => t.status === "rejected").length,
  }

  const handleApprove = async (id: string) => {
    try {
      setIsUpdating(true)
      const response = await fetch('/api/testimonials/admin', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testimonialId: id,
          status: 'approved'
        }),
      })
      
      if (response.ok) {
        await fetchTestimonials() // Refresh the list
        console.log('Testimonial approved successfully')
      } else {
        console.error('Failed to approve testimonial')
      }
    } catch (error) {
      console.error('Error approving testimonial:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleReject = async (id: string) => {
    try {
      setIsUpdating(true)
      const response = await fetch('/api/testimonials/admin', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testimonialId: id,
          status: 'rejected'
        }),
      })
      
      if (response.ok) {
        await fetchTestimonials() // Refresh the list
        console.log('Testimonial rejected successfully')
      } else {
        console.error('Failed to reject testimonial')
      }
    } catch (error) {
      console.error('Error rejecting testimonial:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) {
      return
    }
    
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/testimonials/admin?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        await fetchTestimonials() // Refresh the list
        console.log('Testimonial deleted successfully')
      } else {
        console.error('Failed to delete testimonial')
      }
    } catch (error) {
      console.error('Error deleting testimonial:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Gender-specific icon component
  const GenderIcon = ({ gender }: { gender?: 'male' | 'female' }) => {
    if (gender === 'male') {
      return (
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
          <User className="w-8 h-8 text-blue-600" />
        </div>
      )
    } else if (gender === 'female') {
      return (
        <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center border-2 border-pink-200">
          <UserCheck className="w-8 h-8 text-pink-600" />
        </div>
      )
    } else {
      // Fallback for testimonials without gender
      return (
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
          <User className="w-8 h-8 text-gray-600" />
        </div>
      )
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Testimonials Management
          </h1>
          <p className="text-text-light mt-2">Review and manage customer testimonials</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button 
            variant="outline" 
            className="rounded-xl border-primary/20 hover:bg-primary/5"
            onClick={fetchTestimonials}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" className="rounded-xl border-primary/20 hover:bg-primary/5">
            <Filter className="mr-2 w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="luxury-card border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                <p className="text-sm text-text-light">Total Testimonials</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="luxury-card border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-sm text-text-light">Pending Review</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="luxury-card border-l-4 border-l-emerald-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
                <p className="text-sm text-text-light">Approved</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="luxury-card border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                <p className="text-sm text-text-light">Rejected</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="luxury-card bg-gradient-to-r from-secondary/50 to-secondary/30">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-light" />
                <Input
                  placeholder="Search testimonials by name, role, or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-primary/20 focus:border-primary"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] border-primary/20 focus:border-primary">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Testimonials List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold mb-2 text-primary">Loading testimonials...</h3>
            <p className="text-text-light">Please wait while we fetch the latest testimonials.</p>
          </div>
        ) : (
          <>
            {filteredTestimonials.map((testimonial) => (
              <motion.div
                key={testimonial._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="group"
              >
                <Card className="luxury-card hover:shadow-xl transition-all duration-300 border-l-4 border-l-primary/20 group-hover:border-l-primary">
                  <CardContent className="p-8">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-start gap-6">
                          <div className="relative">
                            <GenderIcon gender={testimonial.gender} />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center">
                              <Badge className={`text-xs px-1 py-0 ${getStatusColor(testimonial.status)}`}>
                                {testimonial.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="font-bold text-lg text-primary">{testimonial.name}</h3>
                              <span className="text-sm text-text-light bg-secondary px-3 py-1 rounded-full">
                                {testimonial.role || "Client"}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-4">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-5 h-5 ${
                                    i < testimonial.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "fill-gray-200 text-gray-200"
                                  }`}
                                />
                              ))}
                              <span className="text-sm font-medium text-text-light ml-2">
                                {testimonial.rating}/5
                              </span>
                            </div>
                            
                            <div className="bg-secondary/30 rounded-lg p-4 mb-4">
                              <p className="text-text-light leading-relaxed">
                                "{testimonial.content}"
                              </p>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-xs text-text-light">
                              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                                <Calendar className="w-3 h-3" />
                                <span>Submitted: {new Date(testimonial.submittedAt).toLocaleDateString()}</span>
                              </div>
                              {testimonial.reviewedAt && (
                                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                                  <Clock className="w-3 h-3" />
                                  <span>Reviewed: {new Date(testimonial.reviewedAt).toLocaleDateString()}</span>
                                </div>
                              )}
                              {testimonial.reviewedBy && (
                                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                                  <User className="w-3 h-3" />
                                  <span>By: {testimonial.reviewedBy}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 lg:flex-col lg:items-end">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTestimonial(testimonial)}
                              className="rounded-xl border-primary/20 hover:bg-primary/5 hover:border-primary"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-bold text-primary">Testimonial Details</DialogTitle>
                              <DialogDescription>
                                Review the complete testimonial before making a decision
                              </DialogDescription>
                            </DialogHeader>
                            {selectedTestimonial && (
                              <div className="space-y-6">
                                <div className="flex items-center gap-6">
                                  <GenderIcon gender={selectedTestimonial.gender} />
                                  <div>
                                    <h3 className="text-2xl font-bold text-primary">{selectedTestimonial.name}</h3>
                                    <p className="text-text-light text-lg">{selectedTestimonial.role || "Client"}</p>
                                    <Badge className={`${getStatusColor(selectedTestimonial.status)} mt-2 text-sm`}>
                                      {selectedTestimonial.status}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-text-light">Rating:</span>
                                  <div className="flex items-center gap-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-6 h-6 ${
                                          i < selectedTestimonial.rating
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "fill-gray-200 text-gray-200"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-lg font-semibold text-primary">
                                    {selectedTestimonial.rating}/5
                                  </span>
                                </div>

                                <div>
                                  <h4 className="font-bold text-lg mb-3 text-primary">Testimonial</h4>
                                  <div className="bg-secondary/30 p-6 rounded-xl border-l-4 border-l-primary">
                                    <p className="text-text-light leading-relaxed text-lg italic">
                                      "{selectedTestimonial.content}"
                                    </p>
                                  </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6 p-6 bg-secondary/20 rounded-xl">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <Calendar className="w-5 h-5 text-primary" />
                                      <div>
                                        <span className="font-medium text-primary">Submitted:</span>
                                        <p className="text-text-light">{new Date(selectedTestimonial.submittedAt).toLocaleString()}</p>
                                      </div>
                                    </div>
                                    {selectedTestimonial.email && (
                                      <div className="flex items-center gap-3">
                                        <User className="w-5 h-5 text-primary" />
                                        <div>
                                          <span className="font-medium text-primary">Email:</span>
                                          <p className="text-text-light">{selectedTestimonial.email}</p>
                                        </div>
                                      </div>
                                    )}
                                    {selectedTestimonial.gender && (
                                      <div className="flex items-center gap-3">
                                        <User className="w-5 h-5 text-primary" />
                                        <div>
                                          <span className="font-medium text-primary">Gender:</span>
                                          <p className="text-text-light capitalize">{selectedTestimonial.gender}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-3">
                                    {selectedTestimonial.reviewedAt && (
                                      <div className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-primary" />
                                        <div>
                                          <span className="font-medium text-primary">Reviewed:</span>
                                          <p className="text-text-light">{new Date(selectedTestimonial.reviewedAt).toLocaleString()}</p>
                                        </div>
                                      </div>
                                    )}
                                    {selectedTestimonial.reviewedBy && (
                                      <div className="flex items-center gap-3">
                                        <User className="w-5 h-5 text-primary" />
                                        <div>
                                          <span className="font-medium text-primary">Reviewed by:</span>
                                          <p className="text-text-light">{selectedTestimonial.reviewedBy}</p>
                                        </div>
                                      </div>
                                    )}
                                    {selectedTestimonial.phone && (
                                      <div className="flex items-center gap-3">
                                        <User className="w-5 h-5 text-primary" />
                                        <div>
                                          <span className="font-medium text-primary">Phone:</span>
                                          <p className="text-text-light">{selectedTestimonial.phone}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {selectedTestimonial.status === "pending" && (
                                  <div className="flex justify-end gap-4 pt-6 border-t border-secondary">
                                    <Button
                                      variant="outline"
                                      onClick={() => handleReject(selectedTestimonial._id)}
                                      className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                      disabled={isUpdating}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Reject
                                    </Button>
                                    <Button
                                      onClick={() => handleApprove(selectedTestimonial._id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg"
                                      disabled={isUpdating}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Approve
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {testimonial.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(testimonial._id)}
                              className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                              disabled={isUpdating}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(testimonial._id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg"
                              disabled={isUpdating}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </>
        )}
      </div>

      {!isLoading && filteredTestimonials.length === 0 && (
        <div className="text-center py-16">
          <div className="w-24 h-24 rounded-full bg-secondary/30 flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-12 h-12 text-text-light" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-primary">No testimonials found</h3>
          <p className="text-text-light text-lg max-w-md mx-auto">
            {searchTerm || statusFilter !== "all"
              ? "Try adjusting your search or filter criteria to find what you're looking for."
              : "No testimonials have been submitted yet. They will appear here once customers start sharing their experiences."}
          </p>
        </div>
      )}
    </div>
  )
} 