'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { canAddInventory } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Package, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  History,
  BarChart3,
  Loader2,
  ArrowUpDown,
  Minus,
  RefreshCw
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

interface InventoryMovement {
  _id: string;
  inventoryItem: {
    _id: string;
    name: string;
    sku: string;
  } | null;
  movementType: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  reference?: string;
  referenceType?: string;
  performedBy: {
    _id: string;
    name: string;
  };
  notes?: string;
  createdAt: string;
}

const MOVEMENT_TYPES = [
  { value: 'sale', label: 'Sale', color: 'bg-red-100 text-red-800' },
  { value: 'purchase', label: 'Purchase', color: 'bg-green-100 text-green-800' },
  { value: 'adjustment', label: 'Adjustment', color: 'bg-blue-100 text-blue-800' },
  { value: 'return', label: 'Return', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'transfer', label: 'Transfer', color: 'bg-purple-100 text-purple-800' },
  { value: 'damage', label: 'Damage', color: 'bg-orange-100 text-orange-800' },
  { value: 'expired', label: 'Expired', color: 'bg-gray-100 text-gray-800' }
];

export default function InventoryManagementPage() {
  const { token, user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [movementTypeFilter, setMovementTypeFilter] = useState('all');
  const [stockAlertFilter, setStockAlertFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  
  // Dialog states
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentData, setAdjustmentData] = useState({
    quantity: 0,
    reason: '',
    notes: ''
  });

  useEffect(() => {
    console.log('useEffect triggered - token:', token ? 'Present' : 'Missing');
    console.log('useEffect triggered - user:', user);
    if (token) {
      fetchInventory();
      fetchMovements();
      fetchStations();
    } else {
      console.log('No token available, skipping API calls');
    }
  }, [token, user]);

  // Auto-remove messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchInventory = async () => {
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
        setInventory(data.data || []);
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

  const fetchMovements = async () => {
    try {
      const response = await fetch('/api/inventory/movements', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMovements(data.movements || []);
      }
    } catch (error) {
      console.error('Error fetching movements:', error);
    }
  };

  const fetchStations = async () => {
    try {
      setStationsLoading(true);
      console.log('Fetching stations...');
      console.log('Token:', token ? 'Present' : 'Missing');
      console.log('User:', user);
      
      const response = await fetch('/api/stations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Stations response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Stations data:', data);
        setStations(data.stations || []);
      } else {
        const errorData = await response.json();
        console.error('Error fetching stations:', errorData);
        setError(`Failed to fetch stations: ${errorData.error || 'Unknown error'}`);
        setStations([]);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
      setError('Network error while fetching stations. Please check your connection.');
      setStations([]);
    } finally {
      setStationsLoading(false);
    }
  };

  const handleStockAdjustment = async () => {
    if (!selectedItem || adjustmentData.quantity === 0) return;

    try {
      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inventoryItemId: selectedItem._id,
          quantity: adjustmentData.quantity,
          reason: adjustmentData.reason,
          notes: adjustmentData.notes
        })
      });

      if (response.ok) {
        setSuccess('Stock adjustment completed successfully!');
        setIsAdjustmentDialogOpen(false);
        setSelectedItem(null);
        setAdjustmentData({ quantity: 0, reason: '', notes: '' });
        fetchInventory();
        fetchMovements();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to adjust stock');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      setError('Network error. Please check your connection.');
    }
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

  const getMovementTypeInfo = (type: string) => {
    return MOVEMENT_TYPES.find(mt => mt.value === type) || { label: type, color: 'bg-gray-100 text-gray-800' };
  };

  // Filter inventory
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    // Stock alert filter
    let matchesStockAlert = true;
    if (stockAlertFilter === 'low') {
      matchesStockAlert = item.stock <= item.minStock && item.stock > 0;
    } else if (stockAlertFilter === 'out') {
      matchesStockAlert = item.stock === 0;
    } else if (stockAlertFilter === 'overstock') {
      matchesStockAlert = item.stock >= item.maxStock;
    } else if (stockAlertFilter === 'alerts') {
      matchesStockAlert = item.stock <= item.minStock || item.stock >= item.maxStock;
    }
    
    // Station filter
    let matchesStation = true;
    if (stationFilter !== 'all') {
      if (stationFilter === 'no_station') {
        matchesStation = !item.stationIds || item.stationIds.length === 0;
      } else {
        matchesStation = item.stationIds && item.stationIds.some(station => station._id === stationFilter);
      }
    }
    
    return matchesSearch && matchesCategory && matchesStatus && matchesStockAlert && matchesStation;
  });

  // Filter movements
  const filteredMovements = movements.filter(movement => {
    const matchesType = movementTypeFilter === 'all' || movement.movementType === movementTypeFilter;
    const hasValidItem = movement.inventoryItem !== null && movement.inventoryItem !== undefined;
    
    
    return matchesType && hasValidItem;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Loading inventory management...</p>
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
            <p className="text-gray-600 mt-1">Track and manage your inventory with real-time updates</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                fetchInventory();
                fetchMovements();
                fetchStations();
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              onClick={() => window.open('/admin/inventory', '_blank')}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Package className="w-4 h-4 mr-2" />
              Manage Inventory
            </Button>
          </div>
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

        {/* Debug Info */}
        <div className="mb-4 p-4 bg-gray-100 rounded-lg text-sm">
          <h3 className="font-medium mb-2">Debug Info:</h3>
          <p>Token: {token ? 'Present' : 'Missing'}</p>
          <p>User Role: {user?.role || 'Unknown'}</p>
          <p>Stations Loading: {stationsLoading ? 'Yes' : 'No'}</p>
          <p>Stations Count: {stations.length}</p>
          <p>Station Names: {stations.map(s => s.name).join(', ') || 'None'}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {inventory.filter(item => item.stock <= item.minStock).length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">
                    {inventory.filter(item => item.stock === 0).length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-green-600">
                    Ksh {inventory.reduce((sum, item) => sum + (item.stock * item.cost), 0).toLocaleString()}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="gas">Gas & Supply</SelectItem>
                  <SelectItem value="printing">Printing & Branding</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>

              <Select value={stockAlertFilter} onValueChange={setStockAlertFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Stock Alerts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="alerts">All Alerts</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                  <SelectItem value="overstock">Overstock</SelectItem>
                </SelectContent>
              </Select>

              <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Movement Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Movements</SelectItem>
                  {MOVEMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={stationFilter} onValueChange={setStationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  <SelectItem value="no_station">No Station</SelectItem>
                  {stationsLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading stations...
                    </SelectItem>
                  ) : stations.length > 0 ? (
                    stations.map((station) => (
                      <SelectItem key={station._id} value={station._id}>
                        {station.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no_stations" disabled>
                      No stations available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inventory List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Inventory Items ({filteredInventory.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {filteredInventory.map((item) => {
                  const isLowStock = item.stock <= item.minStock;
                  const isOutOfStock = item.stock === 0;
                  const isOverstock = item.stock >= item.maxStock;
                  
                  return (
                    <div key={item._id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 relative ${
                      isOutOfStock ? 'bg-red-50 border-red-200' : 
                      isLowStock ? 'bg-amber-50 border-amber-200' : 
                      isOverstock ? 'bg-blue-50 border-blue-200' : ''
                    }`}>
                      {/* Low Stock Alert Badge */}
                      {(isLowStock || isOutOfStock) && (
                        <div className="absolute top-2 right-2">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
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
                        <div className="absolute top-2 right-2">
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            <TrendingUp className="w-3 h-3" />
                            OVERSTOCK
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pr-20">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-medium ${
                              isOutOfStock ? 'text-red-900' : 
                              isLowStock ? 'text-amber-900' : 
                              'text-gray-900'
                            }`}>
                              {item.name}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {item.sku}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{item.category} • {item.subcategory}</p>
                          
                          {/* Station Tags */}
                          <div className="mt-1">
                            <div className="flex flex-wrap gap-1">
                              {item.stationIds && item.stationIds.length > 0 ? (
                                item.stationIds.map((station, index) => (
                                  <Badge 
                                    key={station._id || index}
                                    variant="outline"
                                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200"
                                  >
                                    {station.name}
                                  </Badge>
                                ))
                              ) : (
                                <Badge 
                                  variant="outline"
                                  className="text-xs px-2 py-1 bg-gray-50 text-gray-500 border-gray-200"
                                >
                                  No Station
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2">
                            <span className={`text-sm font-medium ${
                              isOutOfStock ? 'text-red-700' : 
                              isLowStock ? 'text-amber-700' : 
                              'text-gray-700'
                            }`}>
                              Stock: {item.stock} {item.unit}
                              {isLowStock && !isOutOfStock && (
                                <span className="text-amber-600 ml-1">
                                  (Min: {item.minStock})
                                </span>
                              )}
                            </span>
                            <Badge className={`text-xs ${getStockStatusColor(item.stockStatus || 'in_stock')}`}>
                              {getStockStatusLabel(item.stockStatus || 'in_stock')}
                            </Badge>
                          </div>
                          
                          {/* Stock Level Indicator */}
                          <div className="mt-2">
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
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedItem(item);
                              setIsAdjustmentDialogOpen(true);
                            }}
                            className={isLowStock ? 'border-amber-300 text-amber-700 hover:bg-amber-50' : ''}
                          >
                            <ArrowUpDown className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Movement History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent Movements ({filteredMovements.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {(() => {
                  try {
                    if (filteredMovements.length === 0) {
                      return (
                        <div className="p-8 text-center text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No recent movements found</p>
                        </div>
                      );
                    }

                    return filteredMovements.slice(0, 20).map((movement) => {
                    // Additional safety check
                    if (!movement || !movement.inventoryItem) {
                      return null;
                    }
                      
                      const typeInfo = getMovementTypeInfo(movement.movementType);
                      return (
                        <div key={movement._id} className="p-4 border-b border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${typeInfo.color}`}>
                                {typeInfo.label}
                              </Badge>
                              <span className="text-sm font-medium">
                                {movement.inventoryItem.name}
                              </span>
                            </div>
                          <div className="flex items-center gap-1">
                            {movement.quantity > 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`text-sm font-medium ${
                              movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {movement.previousStock} → {movement.newStock} • {movement.reason}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(movement.createdAt).toLocaleString()}
                        </div>
                      </div>
                    );
                    });
                  } catch (error) {
                    console.error('Error rendering movements:', error);
                    return (
                      <div className="p-8 text-center text-red-500">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-300" />
                        <p>Error loading movements. Please refresh the page.</p>
                      </div>
                    );
                  }
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stock Adjustment Dialog */}
        <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adjust Stock</DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Item</Label>
                  <p className="text-sm text-gray-600">{selectedItem.name} ({selectedItem.sku})</p>
                  <p className="text-sm text-gray-500">Current Stock: {selectedItem.stock} {selectedItem.unit}</p>
                </div>
                
                <div>
                  <Label htmlFor="quantity">Quantity Change</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={adjustmentData.quantity}
                    onChange={(e) => setAdjustmentData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    placeholder="Enter positive for addition, negative for deduction"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    New stock will be: {selectedItem.stock + adjustmentData.quantity}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    value={adjustmentData.reason}
                    onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g., Stock count, Damaged goods, Return"
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={adjustmentData.notes}
                    onChange={(e) => setAdjustmentData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional details..."
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsAdjustmentDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleStockAdjustment}
                    disabled={adjustmentData.quantity === 0}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    Adjust Stock
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
