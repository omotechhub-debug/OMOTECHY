'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { useCart } from '@/contexts/CartContext';
import { useClientAuth } from '@/hooks/useClientAuth';
import { 
  Search, 
  Filter, 
  Package, 
  Wrench, 
  Laptop, 
  Smartphone, 
  Printer, 
  Flame, 
  Shirt, 
  Settings,
  Monitor,
  HardDrive,
  Palette,
  FileText,
  Headphones,
  Cpu,
  Loader2,
  ShoppingCart,
  Phone,
  LogIn,
  MapPin,
  Clock
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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
  status: string;
  tags: string[];
  supplier?: string;
  warranty?: string;
  profitMargin?: number;
  stockStatus?: string;
  createdAt: string;
  updatedAt: string;
}

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

const PRODUCT_CATEGORIES = [
  { value: 'all', label: 'All Products', icon: Package },
  { value: 'electronics', label: 'Electronics', icon: Laptop },
  { value: 'gas', label: 'Gas & Supply', icon: Flame },
  { value: 'printing', label: 'Printing & Branding', icon: Printer },
  { value: 'accessories', label: 'Accessories', icon: Package }
];

const SERVICE_CATEGORIES = [
  { value: 'all', label: 'All Services', icon: Wrench },
  { value: 'repair', label: 'Repair Services', icon: Wrench },
  { value: 'installation', label: 'Installation', icon: Settings },
  { value: 'maintenance', label: 'Maintenance', icon: Settings },
  { value: 'consultation', label: 'Consultation', icon: Headphones },
  { value: 'printing', label: 'Printing Services', icon: Printer },
  { value: 'gas', label: 'Gas Services', icon: Flame }
];

export default function ShopPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Cart and Auth
  const { addItem } = useCart();
  const { isAuthenticated } = useClientAuth();

  const handleAddToCart = (item: any, type: 'product' | 'service') => {
    if (!isAuthenticated) {
      // Redirect to login page
      window.location.href = '/login';
      return;
    }

    addItem({
      id: item._id,
      name: item.name,
      price: type === 'product' ? item.price : parseFloat(item.price.replace(/[^\d]/g, '')) || 0,
      image: item.images?.[0] || item.image,
      category: item.category,
      subcategory: item.subcategory || item.category,
      type
    });
  };

  const handleBookService = (service: Service) => {
    const phoneNumber = '254740802704'; // Your WhatsApp number
    const message = `Hello! I'm interested in booking your *${service.name}* service.\n\nService Details:\n- Service: ${service.name}\n- Category: ${service.category}\n- Price: ${service.price}\n- Turnaround: ${service.turnaround}\n\nPlease let me know about availability and next steps. Thank you!`;
    
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    } else {
      fetchServices();
    }
  }, [activeTab, currentPage, searchTerm, categoryFilter, statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/inventory?${params}`);

      if (response.ok) {
        const data = await response.json();
        setProducts(data.data);
        setTotalPages(data.pagination.pages);
        setTotalItems(data.pagination.total);
      } else {
        setError('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/services?${params}`);

      if (response.ok) {
        const data = await response.json();
        setServices(data.data);
        setTotalPages(data.pagination.pages);
        setTotalItems(data.pagination.total);
      } else {
        setError('Failed to fetch services');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = PRODUCT_CATEGORIES.find(cat => cat.value === category);
    return categoryData ? categoryData.icon : Package;
  };

  const getServiceCategoryIcon = (category: string) => {
    const categoryData = SERVICE_CATEGORIES.find(cat => cat.value === category);
    return categoryData ? categoryData.icon : Wrench;
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
          <p className="text-lg font-medium">Loading shop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-accent text-white py-12 sm:py-16 mt-16 sm:mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 leading-tight">
              OMOTECH HUB Shop
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8 text-blue-100 px-4">
              Your One-Stop Shop for Electronics, Services & More
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center text-sm sm:text-base">
              <div className="flex items-center justify-center gap-2">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>+254 740 802 704</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Nairobi, Kenya</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Mon-Sat: 8AM-6PM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm w-full max-w-sm sm:max-w-none">
            <div className="grid grid-cols-2 gap-1">
              <Button
                variant={activeTab === 'products' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('products')}
                className={`px-3 sm:px-6 py-2 text-sm sm:text-base ${activeTab === 'products' ? 'bg-primary text-white' : 'text-gray-600'}`}
              >
                <Package className="w-4 h-4 mr-1 sm:mr-2" />
                Products
              </Button>
              <Button
                variant={activeTab === 'services' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('services')}
                className={`px-3 sm:px-6 py-2 text-sm sm:text-base ${activeTab === 'services' ? 'bg-primary text-white' : 'text-gray-600'}`}
              >
                <Wrench className="w-4 h-4 mr-1 sm:mr-2" />
                Services
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 sm:mb-8">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-primary focus:ring-primary text-sm sm:text-base"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="border-gray-300 focus:border-primary focus:ring-primary text-sm sm:text-base">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {(activeTab === 'products' ? PRODUCT_CATEGORIES : SERVICE_CATEGORIES).map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-gray-300 focus:border-primary focus:ring-primary text-sm sm:text-base">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  {activeTab === 'products' && <SelectItem value="featured">Featured</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Products Grid */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => {
              const CategoryIcon = getCategoryIcon(product.category);
              return (
                <Card key={product._id} className="luxury-card hover:shadow-xl transition-all duration-300 h-full flex flex-col overflow-hidden">
                  <CardHeader className="pb-2 sm:pb-3 flex-shrink-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <CategoryIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-lg font-bold text-gray-900 line-clamp-2 leading-tight break-words">
                            {product.name}
                          </CardTitle>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">{product.subcategory}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 flex-1 flex flex-col min-h-0">
                    {/* Image */}
                    {product.images && product.images.length > 0 && (
                      <div className="mb-3 sm:mb-4 flex-shrink-0">
                        <div className="relative w-full h-24 sm:h-32 rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-2 flex-shrink-0 break-words">
                      {product.description}
                    </p>

                    {/* Brand and SKU */}
                    <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4 flex-shrink-0">
                      {product.brand && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 flex-shrink-0">Brand:</span>
                          <span className="text-gray-700 truncate ml-2 min-w-0">{product.brand}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 flex-shrink-0">SKU:</span>
                        <span className="font-mono text-gray-700 text-xs truncate ml-2 min-w-0">{product.sku}</span>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4 flex-shrink-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">Price:</span>
                        <span className="text-base sm:text-lg font-bold text-primary truncate ml-2">
                          Ksh {product.price.toLocaleString()}
                        </span>
                      </div>
                      {product.warranty && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 flex-shrink-0">Warranty:</span>
                          <span className="text-gray-700 text-xs truncate ml-2 min-w-0">{product.warranty}</span>
                        </div>
                      )}
                    </div>

                    {/* Stock Status */}
                    <div className="space-y-2 mb-3 sm:mb-4 flex-shrink-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">Stock:</span>
                        <span className="text-xs sm:text-sm font-medium truncate ml-2">
                          {product.stock} {product.unit}
                        </span>
                      </div>
                      <Badge className={`text-xs w-fit ${getStockStatusColor(product.stockStatus || 'in_stock')}`}>
                        {getStockStatusLabel(product.stockStatus || 'in_stock')}
                      </Badge>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-auto flex-shrink-0">
                      <Button 
                        onClick={() => handleAddToCart(product, 'product')}
                        className="flex-1 bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm min-w-0"
                        size="sm"
                      >
                        {isAuthenticated ? (
                          <>
                            <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                            <span className="hidden sm:inline truncate">Add to Cart</span>
                            <span className="sm:hidden truncate">Add</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                            <span className="hidden sm:inline truncate">Login to Add</span>
                            <span className="sm:hidden truncate">Login</span>
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs sm:text-sm px-2 sm:px-3 flex-shrink-0"
                        asChild
                      >
                        <Link href={`/shop/products/${product._id}`}>
                          <span className="hidden sm:inline">View Details</span>
                          <span className="sm:hidden">View</span>
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Services Grid */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {services.map((service) => {
              const CategoryIcon = getServiceCategoryIcon(service.category);
              return (
                <Card key={service._id} className="luxury-card hover:shadow-xl transition-all duration-300 h-full flex flex-col overflow-hidden">
                  <CardHeader className="pb-2 sm:pb-3 flex-shrink-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <CategoryIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-lg font-bold text-gray-900 line-clamp-2 leading-tight break-words">
                            {service.name}
                          </CardTitle>
                          <p className="text-xs sm:text-sm text-gray-600 capitalize truncate">{service.category}</p>
                        </div>
                      </div>
                      {service.featured && (
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs flex-shrink-0">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 flex-1 flex flex-col min-h-0">
                    {/* Image */}
                    <div className="mb-3 sm:mb-4 flex-shrink-0">
                      <div className="relative w-full h-24 sm:h-32 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={service.image}
                          alt={service.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-2 flex-shrink-0 break-words">
                      {service.description}
                    </p>

                    {/* Pricing and Turnaround */}
                    <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4 flex-shrink-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">Price:</span>
                        <span className="text-base sm:text-lg font-bold text-primary truncate ml-2">
                          {service.price}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 flex-shrink-0">Turnaround:</span>
                        <span className="text-gray-700 text-xs truncate ml-2 min-w-0">{service.turnaround}</span>
                      </div>
                    </div>

                    {/* Features */}
                    {service.features && service.features.length > 0 && (
                      <div className="mb-3 sm:mb-4 flex-shrink-0">
                        <p className="text-xs text-gray-500 mb-2">Key Features:</p>
                        <div className="flex flex-wrap gap-1">
                          {service.features.slice(0, 2).map((feature, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {feature.length > 15 ? feature.substring(0, 15) + '...' : feature}
                            </Badge>
                          ))}
                          {service.features.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{service.features.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-auto flex-shrink-0">
                      <Button 
                        onClick={() => handleBookService(service)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm min-w-0"
                        size="sm"
                      >
                        <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                        <span className="hidden sm:inline truncate">Book via WhatsApp</span>
                        <span className="sm:hidden truncate">WhatsApp</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs sm:text-sm px-2 sm:px-3 flex-shrink-0"
                        asChild
                      >
                        <Link href={`/shop/services/${service._id}`}>
                          <span className="hidden sm:inline">View Details</span>
                          <span className="sm:hidden">View</span>
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {(activeTab === 'products' ? products.length === 0 : services.length === 0) && !loading && (
          <div className="text-center py-16">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
              {activeTab === 'products' ? (
                <Package className="w-12 h-12 text-gray-400" />
              ) : (
                <Wrench className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <h3 className="text-2xl font-bold mb-3 text-gray-900">
              No {activeTab} found
            </h3>
            <p className="text-gray-600 text-lg max-w-md mx-auto mb-6">
              {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : `No ${activeTab} available at the moment.`}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6 sm:mt-8">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={`text-xs sm:text-sm px-2 sm:px-3 ${
                        currentPage === page ? 'bg-primary hover:bg-primary/90 text-white' : ''
                      }`}
                    >
                      {page}
                    </Button>
                  );
                })}
                {totalPages > 5 && (
                  <span className="text-xs text-gray-500 px-2">...</span>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
