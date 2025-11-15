'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { canAddInventory } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImageUpload } from '@/components/ui/image-upload';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Package, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Smartphone,
  Laptop,
  Printer,
  Tv,
  Wifi,
  HardDrive,
  Monitor,
  Keyboard,
  Mouse,
  Headphones,
  Camera,
  Gamepad2,
  Zap,
  Flame,
  Shirt,
  Wrench,
  Settings,
  Loader2,
  TrendingUp
} from 'lucide-react';
import Image from 'next/image';

interface InventoryItem {
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
  status: string;
  tags: string[];
  isService: boolean;
  serviceType?: string;
  serviceDuration?: number;
  profitMargin?: number;
  stockStatus?: string;
  stationIds?: {
    _id: string;
    name: string;
    location: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface Station {
  _id: string;
  name: string;
  location: string;
  isActive: boolean;
}

const CATEGORIES = [
  { value: 'electronics', label: 'Electronics', icon: Laptop },
  { value: 'gas', label: 'Gas & Supply', icon: Flame },
  { value: 'printing', label: 'Printing & Branding', icon: Printer },
  { value: 'accessories', label: 'Accessories', icon: Package }
];

const SUBCATEGORIES = {
  electronics: [
    'Laptops & Desktops', 'Smartphones', 'Printers & Copiers', 'TVs & Audio',
    'Networking', 'Computer Parts', 'Tablets', 'Home Appliances'
  ],
  gas: [
    'Gas Cylinders', 'Gas Accessories', 'Safety Equipment', 'Bulk Supply'
  ],
  printing: [
    'T-Shirt Printing', 'Bulk Printing', 'Branded Merchandise', 'Design Services'
  ],
  accessories: [
    'Cables & Adapters', 'Cases & Covers', 'Chargers', 'Storage',
    'Peripherals', 'Gaming Accessories'
  ]
};

const UNITS = [
  { value: 'piece', label: 'Piece' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'liter', label: 'Liter' },
  { value: 'meter', label: 'Meter' }
];


export default function InventoryPage() {
  const { token, user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    sku: '',
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 0,
    maxStock: 1000,
    unit: 'piece',
    brand: '',
    model: '',
    images: [] as string[],
    status: 'active',
    tags: [] as string[],
    supplier: '',
    warranty: '',
    stationIds: []
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Show search loading when search term changes
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setSearchLoading(true);
    } else {
      setSearchLoading(false);
    }
  }, [searchTerm, debouncedSearchTerm]);

  // Fetch all inventory data once
  useEffect(() => {
    if (token) {
      fetchAllInventory();
      fetchStations();
    }
  }, [token]);

  // Client-side filtering and pagination
  const filteredInventory = useMemo(() => {
    let filtered = allInventory;

    // Apply search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.sku.toLowerCase().includes(searchLower) ||
        item.brand?.toLowerCase().includes(searchLower) ||
        item.model?.toLowerCase().includes(searchLower) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply stock filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(item => {
        const stockStatus = item.stockStatus || 'in_stock';
        return stockStatus === stockFilter;
      });
    }

    // Apply station filter
    if (stationFilter !== 'all') {
      if (stationFilter === 'no_station') {
        filtered = filtered.filter(item => !item.stationIds || item.stationIds.length === 0);
      } else {
        filtered = filtered.filter(item => 
          item.stationIds && item.stationIds.some(station => station._id === stationFilter)
        );
      }
    }

    return filtered;
  }, [allInventory, debouncedSearchTerm, categoryFilter, statusFilter, stockFilter, stationFilter]);

  // Paginate filtered results
  const paginatedInventory = useMemo(() => {
    const itemsPerPage = 12;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredInventory.slice(startIndex, endIndex);
  }, [filteredInventory, currentPage]);

  // Update total pages and items
  useEffect(() => {
    const itemsPerPage = 12;
    const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
    setTotalPages(totalPages);
    setTotalItems(filteredInventory.length);
    
    // Reset to page 1 if current page is beyond total pages
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredInventory.length, currentPage]);

  // Update displayed inventory
  useEffect(() => {
    setInventory(paginatedInventory);
  }, [paginatedInventory]);

  // Auto-remove success messages after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-remove error messages after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchAllInventory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAllInventory(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch inventory');
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStations = async () => {
    try {
      setStationsLoading(true);
      const response = await fetch('/api/stations?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStations(data.stations || []);
      } else {
        console.error('Failed to fetch stations');
        setStations([]);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
      setStations([]);
    } finally {
      setStationsLoading(false);
    }
  };

  const handleCreateItem = async () => {
    if (isCreating) return; // Prevent multiple submissions

    // Validate that at least one station is selected
    if (!formData.stationIds || formData.stationIds.length === 0) {
      setError('Please select at least one station');
      return;
    }

    try {
      setIsCreating(true);
      console.log('Creating item with data:', formData); // Debug log
      console.log('Station IDs being sent:', formData.stationIds);
      
      // If multiple stations are selected, create a copy for each station
      if (formData.stationIds && formData.stationIds.length > 1) {
        console.log('Creating multiple copies for stations:', formData.stationIds);
        
        const createPromises = formData.stationIds.map((stationId, index) => {
          const itemData = {
            ...formData,
            sku: `${formData.sku}-${index + 1}`, // Add index to make SKU unique
            stationIds: [stationId] // Only one station per copy
          };
          
          return fetch('/api/inventory', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemData)
          });
        });
        
        const responses = await Promise.all(createPromises);
        const results = await Promise.all(responses.map(r => r.json()));
        
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;
        
        if (successCount > 0) {
          setSuccess(`Successfully created ${successCount} inventory item(s) for selected stations!`);
          setIsCreateDialogOpen(false);
          resetForm();
          fetchAllInventory();
        }
        
        if (errorCount > 0) {
          setError(`Failed to create ${errorCount} item(s). Please try again.`);
        }
        return;
      }
      
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess('Inventory item created successfully!');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchAllInventory();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create inventory item');
      }
    } catch (error) {
      console.error('Error creating inventory item:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setIsCreating(false);
    }
  };


  const handleUpdateItem = async () => {
    if (!selectedItem || isUpdating) return; // Prevent multiple submissions

    // Validate that at least one station is selected
    if (!formData.stationIds || formData.stationIds.length === 0) {
      setError('Please select at least one station');
      return;
    }

    try {
      setIsUpdating(true);
      console.log('Updating item with data:', formData);
      
      const response = await fetch(`/api/inventory/${selectedItem._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Update response data:', responseData);
        console.log('Updated item stationIds:', responseData.data?.stationIds);
        setSuccess('Inventory item updated successfully!');
        setIsEditDialogOpen(false);
        setSelectedItem(null);
        resetForm();
        fetchAllInventory();
      } else {
        const responseText = await response.text();
        console.error('Response status:', response.status);
        console.error('Response text:', responseText);
        
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { error: 'Failed to parse error response', raw: responseText };
        }
        console.error('Update error response:', errorData);
        setError(`Update failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating inventory item:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return;

    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setSuccess('Inventory item deleted successfully!');
        fetchAllInventory();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete inventory item');
      }
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      setError('Network error. Please check your connection.');
    }
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      category: item.category,
      subcategory: item.subcategory,
      sku: item.sku,
      price: item.price,
      cost: item.cost,
      stock: item.stock,
      minStock: item.minStock,
      maxStock: item.maxStock,
      unit: item.unit,
      brand: item.brand || '',
      model: item.model || '',
      images: item.images || [],
      status: item.status,
      tags: item.tags || [],
      supplier: item.supplier || '',
      warranty: item.warranty || '',
      stationIds: item.stationIds?.map(station => station._id) || []
    });
    setIsEditDialogOpen(true);
  };

  const handleCreateCopyForStation = (item: InventoryItem) => {
    console.log('Creating copy for station from item:', item);
    setSelectedItem(item); // Keep reference to original item
    setFormData({
      name: item.name,
      description: item.description,
      category: item.category,
      subcategory: item.subcategory,
      sku: `${item.sku}-COPY`, // Add COPY suffix to SKU
      price: item.price,
      cost: item.cost,
      stock: 0, // Start with 0 stock for new copy
      minStock: item.minStock,
      maxStock: item.maxStock,
      unit: item.unit,
      brand: item.brand || '',
      model: item.model || '',
      images: [...item.images], // Copy images
      status: item.status,
      tags: [...item.tags], // Copy tags
      supplier: item.supplier || '',
      warranty: item.warranty || '',
      stationIds: [] // Start with no stations - user will select
    });
    console.log('Form data set for copy:', {
      name: item.name,
      sku: `${item.sku}-COPY`,
      stationIds: []
    });
    setIsCreateDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      subcategory: '',
      sku: '',
      price: 0,
      cost: 0,
      stock: 0,
      minStock: 0,
      maxStock: 1000,
      unit: 'piece',
      brand: '',
      model: '',
      images: [],
      status: 'active',
      tags: [],
      supplier: '',
      warranty: '',
      stationIds: []
    });
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = CATEGORIES.find(cat => cat.value === category);
    return categoryData ? categoryData.icon : Package;
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'low_stock':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'overstock':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  const getStockStatusLabel = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return 'Out of Stock';
      case 'low_stock':
        return 'Low Stock';
      case 'overstock':
        return 'Overstock';
      default:
        return 'In Stock';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600 mt-1">Manage your products inventory</p>
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> For service management (repairs, consultations, installations), 
                please use the <a href="/admin/services" className="underline font-medium hover:text-blue-900">Services page</a>.
              </p>
            </div>
          </div>
          {canAddInventory(user) && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Inventory Item</DialogTitle>
                <DialogDescription>
                  Create a new inventory item and assign it to one or more stations.
                </DialogDescription>
              </DialogHeader>
              <InventoryForm 
                formData={formData} 
                setFormData={setFormData}
                onSubmit={handleCreateItem}
                onCancel={() => setIsCreateDialogOpen(false)}
                isLoading={isCreating}
                stations={stations}
                stationsLoading={stationsLoading}
              />
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Messages */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-600">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-emerald-200 bg-emerald-50">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-600">{success}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                {searchLoading ? (
                  <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                )}
                <Input
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-primary focus:ring-primary"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="border-gray-300 focus:border-primary focus:ring-primary">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-gray-300 focus:border-primary focus:ring-primary">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>

              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="border-gray-300 focus:border-primary focus:ring-primary">
                  <SelectValue placeholder="Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="overstock">Overstock</SelectItem>
                </SelectContent>
              </Select>

              <Select value={stationFilter} onValueChange={setStationFilter}>
                <SelectTrigger className="border-gray-300 focus:border-primary focus:ring-primary">
                  <SelectValue placeholder="Station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  <SelectItem value="no_station">No Station</SelectItem>
                  {stations.map((station) => (
                    <SelectItem key={station._id} value={station._id}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {inventory.map((item) => {
            const CategoryIcon = getCategoryIcon(item.category);
            const isLowStock = item.stock <= item.minStock;
            const isOutOfStock = item.stock === 0;
            const isOverstock = item.stock >= item.maxStock;
            
            return (
              <Card key={item._id} className={`luxury-card hover:shadow-xl transition-all duration-300 relative ${
                isOutOfStock ? 'border-red-200 bg-red-50' : 
                isLowStock ? 'border-amber-200 bg-amber-50' : 
                isOverstock ? 'border-blue-200 bg-blue-50' : ''
              }`}>
                {/* Low Stock Alert Badge */}
                {(isLowStock || isOutOfStock) && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shadow-sm ${
                      isOutOfStock 
                        ? 'bg-red-100 text-red-800 border border-red-200' 
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      <AlertTriangle className="w-3 h-3" />
                      {isOutOfStock ? 'OUT OF STOCK' : 'LOW STOCK'}
                    </div>
                  </div>
                )}
                
                {/* Overstock Alert Badge */}
                {isOverstock && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shadow-sm bg-blue-100 text-blue-800 border border-blue-200">
                      <TrendingUp className="w-3 h-3" />
                      OVERSTOCK
                    </div>
                  </div>
                )}

                <CardHeader className="pb-3 pr-20">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CategoryIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className={`text-lg font-bold line-clamp-1 ${
                          isOutOfStock ? 'text-red-900' : 
                          isLowStock ? 'text-amber-900' : 
                          'text-gray-900'
                        }`}>
                          {item.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600">{item.subcategory}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditItem(item)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteItem(item._id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {/* Image */}
                  {item.images && item.images.length > 0 && (
                    <div className="mb-4">
                      <div className="relative w-full h-32 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={item.images[0]}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {item.description}
                  </p>

                  {/* SKU and Brand */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">SKU:</span>
                      <span className="font-mono text-gray-700">{item.sku}</span>
                    </div>
                    {item.brand && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Brand:</span>
                        <span className="text-gray-700">{item.brand}</span>
                      </div>
                    )}
                    {item.stationIds && item.stationIds.length > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Stations:</span>
                        <span className="text-gray-700">
                          {item.stationIds.map(station => station.name).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pricing */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Price:</span>
                      <span className="text-lg font-bold text-primary">
                        Ksh {item.price.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Cost:</span>
                      <span className="text-gray-700">Ksh {item.cost.toLocaleString()}</span>
                    </div>
                    {item.profitMargin && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Margin:</span>
                        <span className="text-emerald-600 font-medium">
                          {item.profitMargin}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stock Status */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        isOutOfStock ? 'text-red-600' : 
                        isLowStock ? 'text-amber-600' : 
                        'text-gray-600'
                      }`}>
                        Stock:
                      </span>
                      <span className={`text-sm font-medium ${
                        isOutOfStock ? 'text-red-700' : 
                        isLowStock ? 'text-amber-700' : 
                        'text-gray-700'
                      }`}>
                        {item.stock} {item.unit}
                        {isLowStock && !isOutOfStock && (
                          <span className="text-amber-600 ml-1 text-xs">
                            (Min: {item.minStock})
                          </span>
                        )}
                      </span>
                    </div>
                    
                    {/* Stock Level Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isOutOfStock ? 'bg-red-500' :
                              isLowStock ? 'bg-amber-500' :
                              isOverstock ? 'bg-blue-500' :
                              'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min(100, (item.stock / item.maxStock) * 100)}%`
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {Math.round((item.stock / item.maxStock) * 100)}%
                        </span>
                      </div>
                    </div>
                    
                    <Badge className={`text-xs ${getStockStatusColor(item.stockStatus || 'in_stock')}`}>
                      {getStockStatusLabel(item.stockStatus || 'in_stock')}
                    </Badge>
                  </div>

                  {/* Status and Stations */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Badge 
                        variant={item.status === 'active' ? 'default' : 'secondary'}
                        className={item.status === 'active' ? 'bg-emerald-100 text-emerald-800' : ''}
                      >
                        {item.status}
                      </Badge>
                    </div>
                    
                    {/* Station Tags */}
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500 font-medium">Assigned Stations:</div>
                      {item.stationIds && item.stationIds.length > 0 ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {item.stationIds.map((station, index) => (
                              <Badge 
                                key={station._id || index}
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
                              onClick={() => handleEditItem(item)}
                              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Edit Stations
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCreateCopyForStation(item)}
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
                              onClick={() => handleEditItem(item)}
                              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Add Station
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCreateCopyForStation(item)}
                              className="h-6 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              Copy for Station
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {inventory.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-gray-900">No inventory items found</h3>
            <p className="text-gray-600 text-lg max-w-md mx-auto mb-6">
              {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' || stockFilter !== 'all' || stationFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'Get started by adding your first inventory item.'}
            </p>
            {(!searchTerm && categoryFilter === 'all' && statusFilter === 'all' && stockFilter === 'all' && stationFilter === 'all') && (
              <Button 
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Item
              </Button>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={currentPage === page ? 'bg-primary hover:bg-primary/90 text-white' : ''}
                >
                  {page}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Inventory Item</DialogTitle>
              <DialogDescription>
                Update inventory item details and station assignments.
              </DialogDescription>
            </DialogHeader>
            <InventoryForm 
              formData={formData} 
              setFormData={setFormData}
              onSubmit={handleUpdateItem}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedItem(null);
                resetForm();
              }}
              isLoading={isUpdating}
              stations={stations}
              stationsLoading={stationsLoading}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Inventory Form Component
function InventoryForm({ 
  formData, 
  setFormData, 
  onSubmit, 
  onCancel,
  isLoading = false,
  stations = [],
  stationsLoading = false
}: {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  stations?: Station[];
  stationsLoading?: boolean;
}) {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag: string) => tag !== tagToRemove)
    });
  };


  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Product/Service Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter product or service name"
          />
        </div>
        
        <div>
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
            placeholder="Auto-generated if empty"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter detailed description"
          rows={3}
        />
      </div>

      {/* Category and Subcategory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category *</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value, subcategory: '' })}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="subcategory">Subcategory *</Label>
          <Select value={formData.subcategory} onValueChange={(value) => setFormData({ ...formData, subcategory: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select subcategory" />
            </SelectTrigger>
            <SelectContent>
              {formData.category && SUBCATEGORIES[formData.category as keyof typeof SUBCATEGORIES]?.map((subcategory) => (
                <SelectItem key={subcategory} value={subcategory}>
                  {subcategory}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="price">Selling Price (Ksh) *</Label>
          <Input
            id="price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>
        
        <div>
          <Label htmlFor="cost">Cost Price (Ksh) *</Label>
          <Input
            id="cost"
            type="number"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>
        
        <div>
          <Label htmlFor="unit">Unit *</Label>
          <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((unit) => (
                <SelectItem key={unit.value} value={unit.value}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stock Management */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="stock">Current Stock</Label>
          <Input
            id="stock"
            type="number"
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
            placeholder="0"
            min="0"
          />
        </div>
        
        <div>
          <Label htmlFor="minStock">Minimum Stock</Label>
          <Input
            id="minStock"
            type="number"
            value={formData.minStock}
            onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
            placeholder="0"
            min="0"
          />
        </div>
        
        <div>
          <Label htmlFor="maxStock">Maximum Stock</Label>
          <Input
            id="maxStock"
            type="number"
            value={formData.maxStock}
            onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value) || 1000 })}
            placeholder="1000"
            min="0"
          />
        </div>
      </div>

      {/* Brand and Model */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            placeholder="Enter brand name"
          />
        </div>
        
        <div>
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            placeholder="Enter model number"
          />
        </div>
      </div>


      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="supplier">Supplier</Label>
          <Input
            id="supplier"
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            placeholder="Enter supplier name"
          />
        </div>
        
        <div>
          <Label htmlFor="warranty">Warranty</Label>
          <Input
            id="warranty"
            value={formData.warranty}
            onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
            placeholder="e.g., 1 year, 6 months"
          />
        </div>
      </div>

      {/* Station Selection */}
      <div>
        <Label htmlFor="stationIds">Stations *</Label>
        <div className="space-y-2">
          {stationsLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading stations...</span>
            </div>
          ) : stations.length === 0 ? (
            <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-800 mb-2">
                No stations available. Please create a station first.
              </p>
              <a 
                href="/admin/stations" 
                className="text-sm text-amber-900 underline hover:text-amber-700 font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                Go to Stations Management →
              </a>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {stations.map((station) => (
                  <div key={station._id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`station-${station._id}`}
                      checked={formData.stationIds.includes(station._id)}
                      onChange={(e) => {
                        console.log('Station checkbox changed:', station.name, e.target.checked);
                        if (e.target.checked) {
                          const newStationIds = [...formData.stationIds, station._id];
                          console.log('Adding station, new stationIds:', newStationIds);
                          setFormData({
                            ...formData,
                            stationIds: newStationIds
                          });
                        } else {
                          const newStationIds = formData.stationIds.filter(id => id !== station._id);
                          console.log('Removing station, new stationIds:', newStationIds);
                          setFormData({
                            ...formData,
                            stationIds: newStationIds
                          });
                        }
                      }}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label
                      htmlFor={`station-${station._id}`}
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
            </>
          )}
        </div>
      </div>

      {/* Tags */}
      <div>
        <Label>Tags</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add a tag"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
          />
          <Button type="button" onClick={handleAddTag} size="sm">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.tags.map((tag: string, index: number) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {tag}
              <XCircle 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => handleRemoveTag(tag)}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Images */}
      <ImageUpload
        images={formData.images}
        onImagesChange={(images) => setFormData({ ...formData, images })}
        maxImages={4}
      />

      {/* Status */}
      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="discontinued">Discontinued</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={onSubmit} 
          disabled={isLoading || stationsLoading || stations.length === 0 || formData.stationIds.length === 0}
          className="bg-primary hover:bg-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {formData._id ? 'Updating...' : 'Saving...'}
            </>
          ) : (
            formData._id ? 'Update Item' : 'Create Item'
          )}
        </Button>
      </div>
    </div>
  );
}
