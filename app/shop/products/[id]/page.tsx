'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  ShoppingCart, 
  Phone, 
  MapPin, 
  Clock,
  CheckCircle,
  Star,
  ArrowLeft,
  Loader2,
  Laptop,
  Smartphone,
  Printer,
  Flame
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { useCart } from '@/contexts/CartContext';
import { useClientAuth } from '@/hooks/useClientAuth';
import { toast } from 'sonner';

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
  specifications?: {
    [key: string]: any;
  };
  profitMargin?: number;
  stockStatus?: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_ICONS = {
  electronics: Laptop,
  gas: Flame,
  printing: Printer,
  accessories: Package
};

export default function ProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Cart and auth hooks
  const { addItem } = useCart();
  const { isAuthenticated } = useClientAuth();

  // Phone number for calling
  const phoneNumber = '+254740802704';

  // Handle call functionality
  const handleCall = () => {
    // Create a clickable phone link
    const phoneLink = `tel:${phoneNumber}`;
    window.open(phoneLink, '_self');
  };

  // Test toast functionality
  const testToast = () => {
    console.log('Testing toast...');
    toast.success("Test Toast", {
      description: "This is a test toast notification.",
    });
  };

  // Handle add to cart functionality
  const handleAddToCart = () => {
    if (!isAuthenticated) {
      // Show login required toast
      console.log('User not authenticated, showing login toast...');
      toast.error("Login Required", {
        description: "Please log in to add items to your cart.",
      });
      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      return;
    }

    if (!product) return;

    addItem({
      id: product._id,
      name: product.name,
      price: product.price,
      image: product.images[0] || '/placeholder.svg',
      category: product.category,
      subcategory: product.subcategory,
      type: 'product',
      quantity: quantity
    });

    // Show success feedback with toast notification
    console.log('Calling toast function...');
    toast.success("Added to Cart!", {
      description: `${product.name} (${quantity} ${quantity === 1 ? 'item' : 'items'}) has been added to your cart.`,
    });
    console.log('Toast called successfully');
  };

  useEffect(() => {
    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inventory/${params.id}`);

      if (response.ok) {
        const data = await response.json();
        setProduct(data.data);
      } else {
        setError('Product not found');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Package;
    return IconComponent;
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
          <p className="text-lg font-medium">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The product you are looking for does not exist.'}</p>
          <Button asChild>
            <Link href="/shop">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Shop
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const CategoryIcon = getCategoryIcon(product.category);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Breadcrumb */}
      <div className="bg-white border-b mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/shop" className="hover:text-primary">Shop</Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-primary">Products</Link>
            <span>/</span>
            <span className="text-gray-900">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative w-full h-64 sm:h-80 lg:h-96 rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={product.images[selectedImage] || '/placeholder.svg'}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>

            {/* Thumbnail Images */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative w-full h-16 sm:h-20 rounded-lg overflow-hidden border-2 ${
                      selectedImage === index ? 'border-primary' : 'border-gray-200'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CategoryIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {product.subcategory}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 leading-tight">{product.name}</h1>
              <p className="text-base sm:text-lg text-gray-600">{product.description}</p>
            </div>

            {/* Pricing */}
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl sm:text-3xl font-bold text-primary">
                  Ksh {product.price.toLocaleString()}
                </span>
                {product.warranty && (
                  <Badge variant="secondary" className="text-xs">
                    {product.warranty} warranty
                  </Badge>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
                  <span>Free delivery</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                  <span>4.8 rating</span>
                </div>
              </div>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Stock:</span>
                <span className="font-medium">{product.stock} {product.unit}</span>
              </div>
              <Badge className={`text-xs ${getStockStatusColor(product.stockStatus || 'in_stock')}`}>
                {getStockStatusLabel(product.stockStatus || 'in_stock')}
              </Badge>
            </div>

            {/* Product Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {product.brand && (
                <div>
                  <span className="text-gray-500">Brand:</span>
                  <span className="ml-2 font-medium">{product.brand}</span>
                </div>
              )}
              {product.model && (
                <div>
                  <span className="text-gray-500">Model:</span>
                  <span className="ml-2 font-medium">{product.model}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">SKU:</span>
                <span className="ml-2 font-mono text-sm">{product.sku}</span>
              </div>
              {product.supplier && (
                <div>
                  <span className="text-gray-500">Supplier:</span>
                  <span className="ml-2 font-medium">{product.supplier}</span>
                </div>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Quantity:</label>
              <div className="flex items-center border rounded-lg">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="rounded-r-none border-r-0"
                >
                  -
                </Button>
                <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                  className="rounded-l-none border-l-0"
                >
                  +
                </Button>
              </div>
              <span className="text-sm text-gray-500">
                {product.stock} available
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
                size="lg"
                disabled={product.stock === 0}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="px-4 sm:px-8"
                onClick={handleCall}
              >
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Call Now
              </Button>
            </div>

            {/* Test Toast Button - Temporary */}
            <Button 
              variant="secondary" 
              size="sm"
              onClick={testToast}
              className="w-full"
            >
              Test Toast
            </Button>

            {/* Contact Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <a 
                    href={`tel:${phoneNumber}`}
                    className="text-blue-800 hover:text-blue-900 hover:underline cursor-pointer"
                  >
                    +254 740 802 704
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Nairobi, Kenya</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Mon-Sat: 8AM-6PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Specifications */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="mt-12">
            <Card>
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">{key}:</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
