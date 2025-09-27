'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Wrench, 
  Phone, 
  MapPin, 
  Clock,
  CheckCircle,
  Star,
  ArrowLeft,
  Loader2,
  Settings,
  Headphones,
  Printer,
  Flame,
  Monitor,
  HardDrive,
  Palette,
  FileText,
  Cpu
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

interface Service {
  _id: string;
  name: string;
  description: string;
  category: string;
  price: string;
  unit?: string;
  turnaround: string;
  turnaroundUnit?: string;
  active: boolean;
  featured: boolean;
  image: string;
  features: string[];
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_ICONS = {
  repair: Wrench,
  installation: Settings,
  maintenance: Settings,
  consultation: Headphones,
  printing: Printer,
  gas: Flame,
  electronics: Monitor,
  data: HardDrive,
  design: Palette,
  document: FileText,
  it: Headphones,
  pc: Cpu
};

export default function ServiceDetailPage() {
  const params = useParams();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchService();
    }
  }, [params.id]);

  const fetchService = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/services/${params.id}`);

      if (response.ok) {
        const data = await response.json();
        setService(data.data);
      } else {
        setError('Service not found');
      }
    } catch (error) {
      console.error('Error fetching service:', error);
      setError('Failed to load service');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Wrench;
    return IconComponent;
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      repair: 'Repair Service',
      installation: 'Installation Service',
      maintenance: 'Maintenance Service',
      consultation: 'Consultation Service',
      printing: 'Printing Service',
      gas: 'Gas Service',
      electronics: 'Electronics Service',
      data: 'Data Recovery',
      design: 'Design Service',
      document: 'Document Service',
      it: 'IT Service',
      pc: 'PC Building'
    };
    return labels[category as keyof typeof labels] || 'Service';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Loading service...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Service Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The service you are looking for does not exist.'}</p>
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

  const CategoryIcon = getCategoryIcon(service.category);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Breadcrumb */}
      <div className="bg-white border-b mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/shop" className="hover:text-primary">Shop</Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-primary">Services</Link>
            <span>/</span>
            <span className="text-gray-900">{service.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Service Image */}
          <div className="space-y-4">
            <div className="relative w-full h-96 rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={service.image}
                alt={service.name}
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Service Details */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CategoryIcon className="w-5 h-5 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {getCategoryLabel(service.category)}
                </Badge>
                {service.featured && (
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                    Featured
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{service.name}</h1>
              <p className="text-lg text-gray-600">{service.description}</p>
            </div>

            {/* Pricing & Turnaround */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-primary">
                  {service.price}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Turnaround: {service.turnaround}{service.turnaroundUnit ? ` ${service.turnaroundUnit}` : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Professional service</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>4.9 rating</span>
                </div>
              </div>
            </div>

            {/* Features */}
            {service.features && service.features.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">What's Included</h3>
                <div className="space-y-2">
                  {service.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
                size="lg"
              >
                <Phone className="w-5 h-5 mr-2" />
                Book This Service
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="px-8"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call Now
              </Button>
            </div>

            {/* Contact Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Ready to Book?</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>+254 740 802 704</span>
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

        {/* Service Process */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">1. Contact Us</h3>
                  <p className="text-sm text-gray-600">Call or visit us to discuss your requirements</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Settings className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">2. Service Delivery</h3>
                  <p className="text-sm text-gray-600">We provide professional service as promised</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">3. Quality Assurance</h3>
                  <p className="text-sm text-gray-600">We ensure quality and provide follow-up support</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Why Choose Us */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Why Choose OMOTECH HUB?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Professional Service</h4>
                    <p className="text-sm text-gray-600">Experienced technicians with years of expertise</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Quality Parts</h4>
                    <p className="text-sm text-gray-600">We use only high-quality, genuine parts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Warranty</h4>
                    <p className="text-sm text-gray-600">All our services come with warranty</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Customer Support</h4>
                    <p className="text-sm text-gray-600">24/7 customer support and follow-up</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
