"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Building, 
  MapPin, 
  User, 
  Search,
  Filter,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  Clock,
  Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"
import AdminProtectedRoute from '@/components/AdminProtectedRoute'

interface Station {
  _id: string;
  name: string;
  location: string;
  description?: string;
  managerId?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  // Legacy manager field
  manager?: {
    userId: string;
    name: string;
    email: string;
  };
  // New multiple managers field
  managers?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  }[];
  isActive: boolean;
  // Legacy contact fields
  phone?: string;
  email?: string;
  address?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  settings?: {
    workingHours?: {
      start: string;
      end: string;
    };
    timezone?: string;
  };
  // Additional fields
  status?: string;
  operatingHours?: any;
  facilities?: any[];
  notes?: string;
  staff?: any[];
  services?: any[];
  createdAt: string;
  updatedAt: string;
}

interface Manager {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalStations: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function StationManagement() {
  const { token, user } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [availableManagers, setAvailableManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalStations: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [stationToDelete, setStationToDelete] = useState<Station | null>(null);
  const [isManagerViewOpen, setIsManagerViewOpen] = useState(false);
  const [selectedStationForManagerView, setSelectedStationForManagerView] = useState<Station | null>(null);
  const [isAssignManagerOpen, setIsAssignManagerOpen] = useState(false);
  const [selectedStationForAssignment, setSelectedStationForAssignment] = useState<Station | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    managerId: '',
    managers: [] as string[],
    phone: '',
    email: '',
    address: '',
    workingHoursStart: '08:00',
    workingHoursEnd: '17:00',
    timezone: 'Africa/Nairobi'
  });

  // Fetch stations from API
  const fetchStations = async (page = 1, search = "", status = "all") => {
    try {
      setLoading(true);
      setError("");
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(status !== "all" && { status })
      });

      const response = await fetch(`/api/stations?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setStations(data.stations);
        setPagination(data.pagination);
      } else {
        setError(data.error || 'Failed to fetch stations');
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
      setError('Failed to fetch stations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available managers
  const fetchAvailableManagers = async () => {
    try {
      const response = await fetch('/api/stations/available-managers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setAvailableManagers(data.availableManagers);
      }
    } catch (error) {
      console.error('Error fetching available managers:', error);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (token) {
      fetchStations();
      fetchAvailableManagers();
    }
  }, [token]);

  // Handle search and filter changes
  useEffect(() => {
    if (token) {
      const timeoutId = setTimeout(() => {
        fetchStations(1, searchTerm, filterStatus);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, filterStatus, token]);

  // Station management functions
  const createStation = async () => {
    try {
      const response = await fetch('/api/stations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          description: formData.description,
          managerId: formData.managerId || null,
          managers: formData.managers,
          contactInfo: {
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
          },
          settings: {
            workingHours: {
              start: formData.workingHoursStart,
              end: formData.workingHoursEnd,
            },
            timezone: formData.timezone,
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStations(prev => [data.station, ...prev]);
        setMessage(data.message);
        setTimeout(() => setMessage(""), 3000);
        setIsCreateDialogOpen(false);
        resetForm();
        fetchAvailableManagers(); // Refresh available managers
      } else {
        setError(data.error || 'Failed to create station');
        setTimeout(() => setError(""), 3000);
      }
    } catch (error) {
      console.error('Error creating station:', error);
      setError('Failed to create station');
      setTimeout(() => setError(""), 3000);
    }
  };

  const updateStation = async () => {
    if (!selectedStation) return;

    try {
      const response = await fetch(`/api/stations/${selectedStation._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          description: formData.description,
          managerId: formData.managerId || null,
          managers: formData.managers,
          contactInfo: {
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
          },
          settings: {
            workingHours: {
              start: formData.workingHoursStart,
              end: formData.workingHoursEnd,
            },
            timezone: formData.timezone,
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStations(prev => prev.map(station => 
          station._id === selectedStation._id ? data.station : station
        ));
        setMessage(data.message);
        setTimeout(() => setMessage(""), 3000);
        setIsEditDialogOpen(false);
        setSelectedStation(null);
        resetForm();
        fetchAvailableManagers(); // Refresh available managers
      } else {
        setError(data.error || 'Failed to update station');
        setTimeout(() => setError(""), 3000);
      }
    } catch (error) {
      console.error('Error updating station:', error);
      setError('Failed to update station');
      setTimeout(() => setError(""), 3000);
    }
  };

  const deleteStation = async () => {
    if (!stationToDelete) return;

    try {
      const response = await fetch(`/api/stations/${stationToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setStations(prev => prev.filter(station => station._id !== stationToDelete._id));
        setMessage(data.message);
        setTimeout(() => setMessage(""), 3000);
        setIsDeleteDialogOpen(false);
        setStationToDelete(null);
        fetchAvailableManagers(); // Refresh available managers
      } else {
        setError(data.error || 'Failed to delete station');
        setTimeout(() => setError(""), 3000);
      }
    } catch (error) {
      console.error('Error deleting station:', error);
      setError('Failed to delete station');
      setTimeout(() => setError(""), 3000);
    }
  };

  const toggleStationStatus = async (stationId: string) => {
    const station = stations.find(s => s._id === stationId);
    if (!station) return;

    try {
      const response = await fetch(`/api/stations/${stationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !station.isActive }),
      });

      const data = await response.json();

      if (data.success) {
        setStations(prev => prev.map(station => 
          station._id === stationId ? data.station : station
        ));
        setMessage(data.message);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.error || 'Failed to update station status');
        setTimeout(() => setError(""), 3000);
      }
    } catch (error) {
      console.error('Error updating station status:', error);
      setError('Failed to update station status');
      setTimeout(() => setError(""), 3000);
    }
  };

  const handlePageChange = (page: number) => {
    fetchStations(page, searchTerm, filterStatus);
  };

  const handleRefresh = () => {
    fetchStations(1, searchTerm, filterStatus);
    fetchAvailableManagers();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      description: '',
      managerId: '',
      managers: [],
      phone: '',
      email: '',
      address: '',
      workingHoursStart: '08:00',
      workingHoursEnd: '17:00',
      timezone: 'Africa/Nairobi'
    });
  };

  const openEditDialog = (station: Station) => {
    setSelectedStation(station);
    setFormData({
      name: station.name,
      location: station.location,
      description: station.description || '',
      managerId: station.managerId?._id || '',
      managers: station.managers?.map(m => m._id) || [],
      phone: station.contactInfo?.phone || station.phone || '',
      email: station.contactInfo?.email || station.email || '',
      address: station.contactInfo?.address || station.address || '',
      workingHoursStart: station.settings?.workingHours?.start || '08:00',
      workingHoursEnd: station.settings?.workingHours?.end || '17:00',
      timezone: station.settings?.timezone || 'Africa/Nairobi'
    });
    setIsEditDialogOpen(true);
  };

  const openManagerView = (station: Station) => {
    setSelectedStationForManagerView(station);
    setIsManagerViewOpen(true);
  };

  const openDeleteDialog = (station: Station) => {
    setStationToDelete(station);
    setIsDeleteDialogOpen(true);
  };

  const assignManagerToStation = async (stationId: string, managerId: string) => {
    try {
      const response = await fetch('/api/stations/assign-manager', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stationId, managerId }),
      });

      const data = await response.json();

      if (data.success) {
        setStations(prev => prev.map(station => 
          station._id === stationId ? data.station : station
        ));
        setMessage(data.message);
        setTimeout(() => setMessage(""), 3000);
        fetchAvailableManagers(); // Refresh available managers
      } else {
        setError(data.error || 'Failed to assign manager');
        setTimeout(() => setError(""), 3000);
      }
    } catch (error) {
      console.error('Error assigning manager:', error);
      setError('Failed to assign manager');
      setTimeout(() => setError(""), 3000);
    }
  };

  const removeManagerFromStation = async (stationId: string, managerId: string) => {
    try {
      const response = await fetch('/api/stations/remove-manager', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stationId, managerId }),
      });

      const data = await response.json();

      if (data.success) {
        setStations(prev => prev.map(station => 
          station._id === stationId ? data.station : station
        ));
        setMessage(data.message);
        setTimeout(() => setMessage(""), 3000);
        fetchAvailableManagers(); // Refresh available managers
      } else {
        setError(data.error || 'Failed to remove manager');
        setTimeout(() => setError(""), 3000);
      }
    } catch (error) {
      console.error('Error removing manager:', error);
      setError('Failed to remove manager');
      setTimeout(() => setError(""), 3000);
    }
  };

  const openAssignManagerDialog = (station: Station) => {
    setSelectedStationForAssignment(station);
    setIsAssignManagerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading stations...</span>
      </div>
    );
  }

  const activeStations = stations.filter(s => s.isActive).length;
  const inactiveStations = stations.filter(s => !s.isActive).length;
  const stationsWithManagers = stations.filter(s => s.managerId || s.manager || (s.managers && s.managers.length > 0)).length;

  return (
    <AdminProtectedRoute requireAdmin={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Station Management</h1>
            <p className="text-gray-600">Manage stations and assign managers</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Station
            </Button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-600">
              {message}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-600">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Stations</p>
                  <p className="text-2xl font-bold">{pagination.totalStations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Stations</p>
                  <p className="text-2xl font-bold">{activeStations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">With Managers</p>
                  <p className="text-2xl font-bold">{stationsWithManagers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search stations by name, location, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              onClick={() => setFilterStatus("all")}
              size="sm"
            >
              All Status
            </Button>
            <Button
              variant={filterStatus === "active" ? "default" : "outline"}
              onClick={() => setFilterStatus("active")}
              size="sm"
            >
              Active
            </Button>
            <Button
              variant={filterStatus === "inactive" ? "default" : "outline"}
              onClick={() => setFilterStatus("inactive")}
              size="sm"
            >
              Inactive
            </Button>
          </div>
        </div>

        {/* Stations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Stations</CardTitle>
            <CardDescription>
              Manage station locations and manager assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stations.length === 0 ? (
              <div className="text-center py-8">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No stations found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stations.map((station, index) => (
                  <motion.div
                    key={station._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{station.name}</h3>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          {station.location}
                        </div>
                        {station.description && (
                          <p className="text-sm text-gray-600 mt-1">{station.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2">
                          <Badge variant={station.isActive ? 'default' : 'destructive'}>
                            {station.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {(station.managerId || station.manager || (station.managers && station.managers.length > 0)) && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Users className="w-4 h-4 mr-1" />
                              <div className="flex flex-wrap gap-1">
                                {station.managers && station.managers.length > 0 ? (
                                  station.managers.map((manager, index) => (
                                    <span key={manager._id} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                      {manager.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                    {station.managerId?.name || station.manager?.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          {(station.contactInfo?.phone || station.phone) && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-4 h-4 mr-1" />
                              {station.contactInfo?.phone || station.phone}
                            </div>
                          )}
                          {station.settings?.workingHours && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="w-4 h-4 mr-1" />
                              {station.settings.workingHours.start} - {station.settings.workingHours.end}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openManagerView(station)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        View Managers
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAssignManagerDialog(station)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <User className="h-4 w-4 mr-1" />
                        Assign Manager
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(station)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleStationStatus(station._id)}
                      >
                        {station.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDeleteDialog(station)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Showing page {pagination.currentPage} of {pagination.totalPages} 
                  ({pagination.totalStations} total stations)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Station Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Station</DialogTitle>
              <DialogDescription>
                Add a new station and optionally assign a manager.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Station Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter station name"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Enter station location"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter station description"
                />
              </div>
              <div>
                <Label htmlFor="managers">Assign Managers</Label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {formData.managers.map((managerId) => {
                      const manager = availableManagers.find(m => m._id === managerId);
                      return manager ? (
                        <div key={managerId} className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                          <User className="w-4 h-4" />
                          <span>{manager.name}</span>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              managers: prev.managers.filter(id => id !== managerId) 
                            }))}
                            className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <Select onValueChange={(value) => {
                    if (value && !formData.managers.includes(value)) {
                      setFormData(prev => ({ 
                        ...prev, 
                        managers: [...prev.managers, value] 
                      }));
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add managers..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableManagers
                        .filter(manager => !formData.managers.includes(manager._id))
                        .map((manager) => (
                          <SelectItem key={manager._id} value={manager._id}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{manager.name} ({manager.email})</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={formData.timezone} onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Nairobi">Africa/Nairobi</SelectItem>
                      <SelectItem value="Africa/Kampala">Africa/Kampala</SelectItem>
                      <SelectItem value="Africa/Dar_es_Salaam">Africa/Dar_es_Salaam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Full address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workingHoursStart">Working Hours Start</Label>
                  <Input
                    id="workingHoursStart"
                    type="time"
                    value={formData.workingHoursStart}
                    onChange={(e) => setFormData(prev => ({ ...prev, workingHoursStart: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="workingHoursEnd">Working Hours End</Label>
                  <Input
                    id="workingHoursEnd"
                    type="time"
                    value={formData.workingHoursEnd}
                    onChange={(e) => setFormData(prev => ({ ...prev, workingHoursEnd: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={createStation} disabled={!formData.name || !formData.location}>
                Create Station
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Station Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Station</DialogTitle>
              <DialogDescription>
                Update station information and manager assignment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Station Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter station name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-location">Location *</Label>
                  <Input
                    id="edit-location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Enter station location"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter station description"
                />
              </div>
              <div>
                <Label htmlFor="edit-managers">Assign Managers</Label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {formData.managers.map((managerId) => {
                      const manager = availableManagers.find(m => m._id === managerId);
                      return manager ? (
                        <div key={managerId} className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                          <User className="w-4 h-4" />
                          <span>{manager.name}</span>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              managers: prev.managers.filter(id => id !== managerId) 
                            }))}
                            className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <Select onValueChange={(value) => {
                    if (value && !formData.managers.includes(value)) {
                      setFormData(prev => ({ 
                        ...prev, 
                        managers: [...prev.managers, value] 
                      }));
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add managers..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableManagers
                        .filter(manager => !formData.managers.includes(manager._id))
                        .map((manager) => (
                          <SelectItem key={manager._id} value={manager._id}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{manager.name} ({manager.email})</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-timezone">Timezone</Label>
                  <Select value={formData.timezone} onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Nairobi">Africa/Nairobi</SelectItem>
                      <SelectItem value="Africa/Kampala">Africa/Kampala</SelectItem>
                      <SelectItem value="Africa/Dar_es_Salaam">Africa/Dar_es_Salaam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Textarea
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Full address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-workingHoursStart">Working Hours Start</Label>
                  <Input
                    id="edit-workingHoursStart"
                    type="time"
                    value={formData.workingHoursStart}
                    onChange={(e) => setFormData(prev => ({ ...prev, workingHoursStart: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-workingHoursEnd">Working Hours End</Label>
                  <Input
                    id="edit-workingHoursEnd"
                    type="time"
                    value={formData.workingHoursEnd}
                    onChange={(e) => setFormData(prev => ({ ...prev, workingHoursEnd: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedStation(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={updateStation} disabled={!formData.name || !formData.location}>
                Update Station
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Station Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Station</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{stationToDelete?.name}"? This action cannot be undone.
                {stationToDelete?.managerId && (
                  <span className="block mt-2 text-red-600">
                    The assigned manager will be reverted to admin role.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsDeleteDialogOpen(false);
                setStationToDelete(null);
              }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteStation}>
                Delete Station
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manager View Modal */}
        <Dialog open={isManagerViewOpen} onOpenChange={setIsManagerViewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Station Managers
              </DialogTitle>
              <DialogDescription>
                View all managers assigned to {selectedStationForManagerView?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedStationForManagerView && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedStationForManagerView.name}</h3>
                      <p className="text-sm text-gray-600">{selectedStationForManagerView.location}</p>
                    </div>
                    <Badge variant={selectedStationForManagerView.isActive ? 'default' : 'destructive'}>
                      {selectedStationForManagerView.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Assigned Managers:</p>
                    <div className="space-y-2">
                      {(() => {
                        const stationManagers = selectedStationForManagerView.managers || (selectedStationForManagerView.managerId ? [selectedStationForManagerView.managerId] : []);
                        const legacyManager = selectedStationForManagerView.manager;
                        
                        if (stationManagers.length === 0 && !legacyManager) {
                          return (
                            <div className="text-center py-8 text-gray-500">
                              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                              <p>No managers assigned to this station</p>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="space-y-2">
                            {stationManagers.map((manager, index) => {
                              // Handle both populated objects and ObjectId strings
                              const managerId = typeof manager === 'string' ? manager : (manager?._id || `manager-${index}`);
                              const managerName = typeof manager === 'string' ? 'Loading...' : (manager?.name || 'Unknown');
                              const managerEmail = typeof manager === 'string' ? 'Loading...' : (manager?.email || 'Unknown');
                              const managerRole = typeof manager === 'string' ? 'Loading...' : (manager?.role || 'Unknown');
                              
                              return (
                                <div key={managerId} className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-900">{managerName}</p>
                                    <p className="text-xs text-blue-600">{managerEmail}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {managerRole}
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => removeManagerFromStation(selectedStationForManagerView._id, managerId)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                            {legacyManager && (
                              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-gray-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{legacyManager.name}</p>
                                  <p className="text-xs text-gray-600">{legacyManager.email}</p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  Legacy
                                </Badge>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsManagerViewOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Manager Dialog */}
        <Dialog open={isAssignManagerOpen} onOpenChange={setIsAssignManagerOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Assign Manager to Station
              </DialogTitle>
              <DialogDescription>
                Select a manager to assign to {selectedStationForAssignment?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedStationForAssignment && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg">{selectedStationForAssignment.name}</h3>
                  <p className="text-sm text-gray-600">{selectedStationForAssignment.location}</p>
                </div>
              )}
              
              <div>
                <Label htmlFor="manager-select">Available Managers</Label>
                <Select onValueChange={(managerId) => {
                  if (selectedStationForAssignment) {
                    assignManagerToStation(selectedStationForAssignment._id, managerId);
                    setIsAssignManagerOpen(false);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a manager..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableManagers.map((manager) => (
                      <SelectItem key={manager._id} value={manager._id}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{manager.name} ({manager.email})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignManagerOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminProtectedRoute>
  )
}
