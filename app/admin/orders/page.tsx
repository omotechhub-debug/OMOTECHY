"use client"

import React, { useState, useEffect, useCallback } from 'react';
import AdminPageProtection from '@/components/AdminPageProtection';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Plus,
  ArrowUpDown,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  Grid3X3,
  List,
  Link2,
  Calculator,
  Printer,
  FileText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import UserStationInfo from '@/components/UserStationInfo';

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  services: Array<{
    serviceId: string;
    serviceName: string;
    quantity: number;
    price: string;
  }>;
  pickupDate?: string;
  pickupTime?: string;
  notes?: string;
  location: string;
  totalAmount: number;
  remainingBalance?: number;
  partialPayments?: Array<{
    amount: number;
    date: Date;
    mpesaReceiptNumber: string;
    phoneNumber: string;
    method: 'mpesa_stk' | 'mpesa_c2b' | 'cash' | 'bank_transfer';
  }>;
  pickDropAmount?: number;
  discount?: number;
  paymentStatus?: 'unpaid' | 'paid' | 'partial' | 'pending' | 'failed';
  amountPaid?: number;
  status: 'pending' | 'confirmed' | 'in-progress' | 'ready' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  promoCode?: string;
  promoDiscount?: number;
  // Order creator and station tracking
  createdBy?: {
    userId: string;
    name: string;
    role: 'superadmin' | 'admin' | 'manager' | 'user';
  };
  station?: {
    stationId: string;
    name: string;
    location: string;
  };
  // M-Pesa payment fields
  mpesaReceiptNumber?: string;
  phoneNumber?: string;
  paymentMethod?: 'mpesa_stk' | 'mpesa_c2b' | 'cash' | 'bank_transfer';
  mpesaPayment?: {
    checkoutRequestId?: string;
    mpesaReceiptNumber?: string;
    transactionDate?: Date;
    phoneNumber?: string;
    amountPaid?: number;
    resultCode?: number;
    resultDescription?: string;
    paymentInitiatedAt?: Date;
    paymentCompletedAt?: Date;
  };
}

const statusColors = {
  pending: 'bg-amber-100 text-amber-800 border border-amber-200',
  confirmed: 'bg-blue-100 text-blue-800 border border-blue-200',
  'in-progress': 'bg-orange-100 text-orange-800 border border-orange-200',
  ready: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  delivered: 'bg-purple-100 text-purple-800 border border-purple-200',
  cancelled: 'bg-red-100 text-red-800 border border-red-200',
};

const statusIcons = {
  pending: AlertCircle,
  confirmed: CheckCircle,
  'in-progress': Loader2,
  ready: CheckCircle,
  delivered: CheckCircle,
  cancelled: XCircle,
};

function OrdersPageContent() {
  const { isAdmin, logout, isLoading, token, user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(9);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // M-Pesa payment states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [orderForPayment, setOrderForPayment] = useState<Order | null>(null);
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  // Manual payment connection states
  const [manualPaymentDialogOpen, setManualPaymentDialogOpen] = useState(false);
  const [orderForManualPayment, setOrderForManualPayment] = useState<Order | null>(null);
  const [manualPaymentAmount, setManualPaymentAmount] = useState('');
  const [searchingPayments, setSearchingPayments] = useState(false);
  const [multipleTransactions, setMultipleTransactions] = useState<any[]>([]);
  const [multipleTransactionsDialogOpen, setMultipleTransactionsDialogOpen] = useState(false);
  
  // Pending confirmations
  const [pendingConfirmationsCount, setPendingConfirmationsCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      logout();
    }
  }, [isAdmin, isLoading, logout]);

  if (!isAdmin) return null;

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      // Fetching orders...
      
      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        let ordersToShow = data.orders || [];
        
        // Filter orders...
        
        // Filter out orders without station or creator information
        ordersToShow = ordersToShow.filter((order: Order) => {
          const hasStation = order.station?.stationId && order.station?.name;
          const hasCreator = order.createdBy?.userId && order.createdBy?.name;
          return hasStation && hasCreator;
        });

        // If user is a manager, filter orders by their station
        // Admins and superadmins can view all orders from different stations
        if (user?.role === 'manager' && (user?.stationId || (user?.managedStations && user.managedStations.length > 0))) {
          const userStationId = user.stationId || user.managedStations?.[0];
          
          ordersToShow = ordersToShow.filter((order: Order) => {
            const matches = order.station?.stationId === userStationId || 
                          order.station?.stationId === userStationId?.toString();
            return matches;
          });
        }
        // Admins and superadmins can view all orders from all stations (no filtering)
        
        setOrders(ordersToShow);
        setFilteredOrders(ordersToShow);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch orders:', response.status, errorData);
        setOrders([]);
        setFilteredOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  const fetchPendingConfirmationsCount = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/payments/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const totalPending = (data.pendingTransactions?.length || 0) + (data.unmatchedTransactions?.length || 0);
        setPendingConfirmationsCount(totalPending);
      }
    } catch (error) {
      console.error('Error fetching pending confirmations count:', error);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchOrders();
      fetchPendingConfirmationsCount();
    }
  }, [token, fetchOrders, fetchPendingConfirmationsCount]);

  // Filter and sort orders
  useEffect(() => {
    let filtered = orders;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.phone.includes(searchTerm) ||
        order.customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }


    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'orderNumber':
          aValue = a.orderNumber;
          bValue = b.orderNumber;
          break;
        case 'customerName':
          aValue = a.customer.name;
          bValue = b.customer.name;
          break;
        case 'totalAmount':
          aValue = a.totalAmount;
          bValue = b.totalAmount;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredOrders(filtered);
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [orders, searchTerm, statusFilter, sortBy, sortOrder]);

  // Pagination logic
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

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

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    const IconComponent = statusIcons[status as keyof typeof statusIcons];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
  };

  const handleAcceptOrder = async (order: Order) => {
    try {
      setUpdating(true);
      console.log('Accepting order:', order._id, order.orderNumber);
      
      const response = await fetch(`/api/orders/${order._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'confirmed'
        }),
      });

      const data = await response.json();
      console.log('Accept order response:', data);

      if (response.ok && data.success) {
        // Update local state
        setOrders(prevOrders => 
          prevOrders.map(o => o._id === order._id ? data.order : o)
        );
        
        // Update selected order if it's the one being accepted
        if (selectedOrder?._id === order._id) {
          setSelectedOrder(data.order);
        }
        
        // Show success message
        toast({
          title: 'Order Accepted',
          description: `Order ${order.orderNumber} has been confirmed successfully.`,
        });
        
        // Refresh orders list to ensure consistency
        await fetchOrders();
      } else {
        const errorMessage = data?.error || data?.message || 'Unknown error';
        toast({
          title: 'Failed to accept order',
          description: errorMessage,
          variant: 'destructive',
        });
        console.error('Failed to accept order:', data);
      }
    } catch (error) {
      toast({
        title: 'Error accepting order',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
      console.error('Error accepting order:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateOrder = async (orderId: string, updateData: Partial<Order>) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const data = await response.json();
        // Update the order in the local state
        setOrders(prevOrders => 
          prevOrders.map(o => o._id === orderId ? data.order : o)
        );
        if (selectedOrder?._id === orderId) {
          setSelectedOrder(data.order);
        }
      } else {
        console.error('Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleEditOrder = (order: Order) => {
    // Redirect to POS system with order ID for editing
    router.push(`/admin/pos?editOrder=${order._id}`);
  };

  const handleDeleteOrder = async (order: Order) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  // Handler for payment type change
  const handlePaymentTypeChange = (type: 'full' | 'partial') => {
    setPaymentType(type);
    if (type === 'full' && orderForPayment) {
      // For full payment, set amount to remaining balance or total amount
      setPaymentAmount(orderForPayment.remainingBalance || orderForPayment.totalAmount);
    } else {
      // For partial payment, clear the amount so user can enter custom amount
      setPaymentAmount(0);
    }
  };

  // M-Pesa Payment Functions
  const handleInitiatePayment = (order: Order) => {
    setOrderForPayment(order);
    setPaymentPhone(order.customer.phone);
    setPaymentType('full');
    setPaymentAmount(order.remainingBalance || order.totalAmount);
    setPaymentDialogOpen(true);
  };

  const initiateSTKPush = async () => {
    if (!orderForPayment || !paymentPhone || !paymentAmount) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all payment details',
        variant: 'destructive',
      });
      return;
    }

    try {
      setInitiatingPayment(true);

      const response = await fetch('/api/mpesa/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: orderForPayment._id,
          phoneNumber: paymentPhone,
          amount: paymentAmount,
          paymentType: 'full', // Force full payment for STK push
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Payment Initiated',
          description: data.customerMessage || 'STK push sent to customer',
          variant: 'default',
        });

        // Update order status in local state
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order._id === orderForPayment._id
              ? { ...order, paymentStatus: 'pending' as const }
              : order
          )
        );

        setPaymentDialogOpen(false);
        setOrderForPayment(null);
        setPaymentPhone('');
        setPaymentAmount(0);

        // Start polling for payment status
        pollPaymentStatus(data.checkoutRequestId);
      } else {
        toast({
          title: 'Payment Failed',
          description: data.error || 'Failed to initiate payment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate payment',
        variant: 'destructive',
      });
    } finally {
      setInitiatingPayment(false);
    }
  };

  const pollPaymentStatus = async (checkoutRequestId: string) => {
    let attempts = 0;
    const maxAttempts = 30; // Poll for 5 minutes (30 * 10 seconds)

    const poll = async () => {
      try {
        setCheckingPayment(true);
        const response = await fetch(`/api/mpesa/status/${checkoutRequestId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();
        
        if (data.success && data.order) {
          const updatedOrder = data.order;
          
          // Update order in local state
          setOrders(prevOrders =>
            prevOrders.map(order =>
              order._id === updatedOrder._id
                ? { ...order, paymentStatus: updatedOrder.paymentStatus, mpesaPayment: updatedOrder.mpesaPayment }
                : order
            )
          );

          // Check if payment is completed (success or failure)
          if (updatedOrder.paymentStatus === 'paid' || updatedOrder.paymentStatus === 'failed') {
            setCheckingPayment(false);
            
            toast({
              title: updatedOrder.paymentStatus === 'paid' ? 'Payment Successful' : 'Payment Failed',
              description: updatedOrder.paymentStatus === 'paid' 
                ? `Payment completed. Receipt: ${updatedOrder.mpesaPayment?.mpesaReceiptNumber || 'N/A'}`
                : `Payment failed: ${updatedOrder.mpesaPayment?.resultDescription || 'Unknown error'}`,
              variant: updatedOrder.paymentStatus === 'paid' ? 'default' : 'destructive',
            });
            
            return; // Stop polling
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          setCheckingPayment(false);
          toast({
            title: 'Payment Status Unknown',
            description: 'Payment status check timed out. Please check manually.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000);
        } else {
          setCheckingPayment(false);
        }
      }
    };

    poll();
  };

  const checkPaymentStatus = async (order: Order) => {
    if (!order.mpesaPayment?.checkoutRequestId) {
      toast({
        title: 'No Payment Request',
        description: 'No M-Pesa payment request found for this order',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCheckingPayment(true);
      const response = await fetch(`/api/mpesa/status/${order.mpesaPayment.checkoutRequestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (data.success && data.order) {
        const updatedOrder = data.order;
        
        // Update order in local state
        setOrders(prevOrders =>
          prevOrders.map(o =>
            o._id === updatedOrder._id
              ? { ...o, paymentStatus: updatedOrder.paymentStatus, mpesaPayment: updatedOrder.mpesaPayment }
              : o
          )
        );

        toast({
          title: 'Payment Status Updated',
          description: `Payment status: ${updatedOrder.paymentStatus}`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to check payment status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast({
        title: 'Error',
        description: 'Failed to check payment status',
        variant: 'destructive',
      });
    } finally {
      setCheckingPayment(false);
    }
  };

  // Manual payment connection functions
  const handleManualPaymentSearch = (order: Order) => {
    setOrderForManualPayment(order);
    setManualPaymentAmount('');
    setMultipleTransactions([]);
    setManualPaymentDialogOpen(true);
  };

  const searchPaymentByAmount = async () => {
    if (!orderForManualPayment || !manualPaymentAmount) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a payment amount to search',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSearchingPayments(true);
      const response = await fetch('/api/admin/orders/connect-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: orderForManualPayment._id,
          paymentAmount: parseFloat(manualPaymentAmount),
        }),
      });

      const data = await response.json();

      if (data.success && data.autoConnected) {
        // Single transaction found and auto-connected
        toast({
          title: 'Payment Connected',
          description: data.message,
          variant: 'default',
        });

        // Update order in local state
        setOrders(prevOrders =>
          prevOrders.map(o =>
            o._id === orderForManualPayment._id
              ? { ...o, paymentStatus: data.paymentStatus, amountPaid: data.transaction.amount }
              : o
          )
        );

        // Update selected order if it's the same one
        if (selectedOrder?._id === orderForManualPayment._id) {
          setSelectedOrder({
            ...selectedOrder,
            paymentStatus: data.paymentStatus,
            amountPaid: data.transaction.amount
          });
        }

        setManualPaymentDialogOpen(false);
        setOrderForManualPayment(null);
        setManualPaymentAmount('');
      } else if (data.multipleMatches) {
        // Multiple transactions found - show selection dialog
        setMultipleTransactions(data.transactions);
        setManualPaymentDialogOpen(false);
        setMultipleTransactionsDialogOpen(true);
      } else {
        // No transactions found
        toast({
          title: 'No Transactions Found',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error searching payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to search for payments',
        variant: 'destructive',
      });
    } finally {
      setSearchingPayments(false);
    }
  };

  const connectSpecificTransaction = async (transactionId: string) => {
    if (!orderForManualPayment) return;

    try {
      setSearchingPayments(true);
      const response = await fetch('/api/admin/mpesa-transactions/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionId: transactionId,
          orderId: orderForManualPayment._id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Payment Connected',
          description: data.message,
          variant: 'default',
        });

        // Update order in local state
        setOrders(prevOrders =>
          prevOrders.map(o =>
            o._id === orderForManualPayment._id
              ? { ...o, paymentStatus: data.isExactPayment ? 'paid' : 'partial', remainingBalance: data.remainingBalance }
              : o
          )
        );

        // Update selected order if it's the same one
        if (selectedOrder?._id === orderForManualPayment._id) {
          setSelectedOrder({
            ...selectedOrder,
            paymentStatus: data.isExactPayment ? 'paid' : 'partial',
            remainingBalance: data.remainingBalance
          });
        }

        setMultipleTransactionsDialogOpen(false);
        setOrderForManualPayment(null);
        setManualPaymentAmount('');
        setMultipleTransactions([]);
      } else {
        toast({
          title: 'Connection Failed',
          description: data.error || 'Failed to connect transaction',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error connecting transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect transaction',
        variant: 'destructive',
      });
    } finally {
      setSearchingPayments(false);
    }
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    // Check if user is a manager
    if (user?.role === 'manager') {
      toast({
        title: "Access Denied",
        description: "Managers cannot delete orders. Please contact an administrator.",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      return;
    }
    
    try {
      setDeleting(true);
      const response = await fetch(`/api/orders/${orderToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        data = { success: false, error: 'Invalid response from server' };
      }
      
      if (response.ok && data.success) {
        // Remove the order from the local state
        setOrders(prevOrders => prevOrders.filter(order => order._id !== orderToDelete._id));
        setFilteredOrders(prevOrders => prevOrders.filter(order => order._id !== orderToDelete._id));
        setDeleteDialogOpen(false);
        setOrderToDelete(null);
        
        // Show success toast
        toast({
          title: "Order Deleted",
          description: `Order ${orderToDelete.orderNumber} has been successfully deleted.`,
          variant: "default",
        });
      } else {
        console.error('Failed to delete order:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          orderId: orderToDelete._id
        });
        // Show error toast with more specific message
        toast({
          title: "Delete Failed",
          description: data.error || `Failed to delete order. Status: ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      // Show error toast
      toast({
        title: "Delete Failed",
        description: "An error occurred while deleting the order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const exportToCSV = (ordersToExport: Order[], filename: string) => {
    // Define CSV headers
    const headers = [
      'Order Number',
      'Customer Name',
      'Customer Phone',
      'Customer Email',
      'Customer Address',
      'Location',
      'Services',
      'Total Amount',
      'Pick & Drop Amount',
      'Discount',
      'Payment Status',
      'Order Status',
      'Pickup Date',
      'Pickup Time',
      'Notes',
      'Created Date',
      'Updated Date',
      'Promo Code',
      'Promo Discount'
    ];

    // Convert orders to CSV rows
    const csvRows = [headers.join(',')];

    ordersToExport.forEach(order => {
      const services = order.services.map(service => 
        `${service.serviceName} (${service.quantity}x Ksh${service.price})`
      ).join('; ');

      const row = [
        order.orderNumber,
        order.customer.name,
        order.customer.phone,
        order.customer.email || '',
        order.customer.address || '',
        order.location,
        services,
        order.totalAmount,
        order.pickDropAmount || 0,
        order.discount || 0,
        order.paymentStatus || 'unpaid',
        order.status,
        order.pickupDate || '',
        order.pickupTime || '',
        order.notes || '',
        new Date(order.createdAt).toLocaleDateString(),
        new Date(order.updatedAt).toLocaleDateString(),
        order.promoCode || '-',
        order.promoDiscount ? `Ksh ${order.promoDiscount}` : '-'
      ].map(field => `"${field}"`).join(',');

      csvRows.push(row);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportAll = () => {
    if (filteredOrders.length === 0) {
      toast({
        title: "No Orders to Export",
        description: "There are no orders to export.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `orders_export_${timestamp}.csv`;
      exportToCSV(filteredOrders, filename);
      
      toast({
        title: "Export Successful",
        description: `${filteredOrders.length} orders exported to ${filename}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export orders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportCurrentPage = () => {
    if (currentOrders.length === 0) {
      toast({
        title: "No Orders to Export",
        description: "There are no orders on the current page to export.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `orders_page_${currentPage}_${timestamp}.csv`;
      exportToCSV(currentOrders, filename);
      
      toast({
        title: "Export Successful",
        description: `${currentOrders.length} orders from page ${currentPage} exported to ${filename}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export orders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  // Helper function to filter orders by time period
  const filterOrdersByTimePeriod = (period: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return filteredOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      
      switch (period) {
        case 'today':
          return orderDate >= today;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          return orderDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          return orderDate >= monthAgo;
        case 'all':
        default:
          return true;
      }
    });
  };

  // Export functions for different time periods
  const handleExportToday = () => {
    const todayOrders = filterOrdersByTimePeriod('today');
    
    if (todayOrders.length === 0) {
      toast({
        title: "No Orders to Export",
        description: "There are no orders from today to export.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `orders_today_${timestamp}.csv`;
      exportToCSV(todayOrders, filename);
      
      toast({
        title: "Export Successful",
        description: `${todayOrders.length} orders from today exported to ${filename}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export orders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportThisWeek = () => {
    const weekOrders = filterOrdersByTimePeriod('week');
    
    if (weekOrders.length === 0) {
      toast({
        title: "No Orders to Export",
        description: "There are no orders from this week to export.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `orders_this_week_${timestamp}.csv`;
      exportToCSV(weekOrders, filename);
      
      toast({
        title: "Export Successful",
        description: `${weekOrders.length} orders from this week exported to ${filename}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export orders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportThisMonth = () => {
    const monthOrders = filterOrdersByTimePeriod('month');
    
    if (monthOrders.length === 0) {
      toast({
        title: "No Orders to Export",
        description: "There are no orders from this month to export.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `orders_this_month_${timestamp}.csv`;
      exportToCSV(monthOrders, filename);
      
      toast({
        title: "Export Successful",
        description: `${monthOrders.length} orders from this month exported to ${filename}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export orders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };


  const isValidPhone = (phone: string | undefined) => {
    if (!phone) return false;
    const cleaned = phone.replace(/\s+/g, '');
    // Check for 64-char hex hash, 'Data Error', 'Unknown', or any non-digit string
    if (
      (cleaned.length === 64 && /^[a-f0-9]+$/i.test(cleaned)) ||
      cleaned === 'Data Error' ||
      cleaned === 'Unknown' ||
      !/^\d{10,15}$/.test(cleaned)
    ) {
      return false;
    }
    return true;
  };

  // Print receipt function
  // Generate receipt HTML content
  const generateReceiptHTML = (order: Order) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${order.orderNumber}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 20px;
            background: white;
            color: black;
          }
          .receipt {
            max-width: 400px;
            margin: 0 auto;
            border: 2px solid #000;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .business-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .business-tagline {
            font-size: 14px;
            margin-bottom: 5px;
          }
          .order-info {
            margin-bottom: 20px;
          }
          .order-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .customer-info {
            margin-bottom: 20px;
            border-bottom: 1px solid #000;
            padding-bottom: 10px;
          }
          .services {
            margin-bottom: 20px;
          }
          .service-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .service-details {
            font-size: 12px;
            color: #666;
            margin-left: 20px;
          }
          .totals {
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-top: 20px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .final-total {
            font-size: 18px;
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 10px;
            margin-top: 10px;
          }
          .payment-status {
            text-align: center;
            margin: 20px 0;
            padding: 10px;
            border: 2px solid #000;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
          }
          .thank-you {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          @media print {
            body { margin: 0; }
            .receipt { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="business-name">ECONURU LAUNDRY</div>
            <div class="business-tagline">Professional Laundry Services</div>
            <div style="font-size: 12px;">Quality Care for Your Garments</div>
          </div>

          <div class="order-info">
            <div class="order-row">
              <span><strong>Order #:</strong></span>
              <span>${order.orderNumber}</span>
            </div>
            <div class="order-row">
              <span><strong>Date:</strong></span>
              <span>${formatDate(order.createdAt)}</span>
            </div>
            <div class="order-row">
              <span><strong>Time:</strong></span>
              <span>${new Date(order.createdAt).toLocaleTimeString()}</span>
            </div>
            ${order.pickupDate ? `
            <div class="order-row">
              <span><strong>Pickup:</strong></span>
              <span>${order.pickupDate}${order.pickupTime ? ' ' + order.pickupTime : ''}</span>
            </div>
            ` : ''}
          </div>

          <div class="customer-info">
            <div class="order-row">
              <span><strong>Customer:</strong></span>
              <span>${order.customer.name}</span>
            </div>
            <div class="order-row">
              <span><strong>Phone:</strong></span>
              <span>${order.customer.phone}</span>
            </div>
            ${order.customer.email ? `
            <div class="order-row">
              <span><strong>Email:</strong></span>
              <span>${order.customer.email}</span>
            </div>
            ` : ''}
            ${order.customer.address ? `
            <div class="order-row">
              <span><strong>Address:</strong></span>
              <span>${order.customer.address}</span>
            </div>
            ` : ''}
            <div class="order-row">
              <span><strong>Location:</strong></span>
              <span>${order.location}</span>
            </div>
          </div>

          <div class="services">
            <div style="text-align: center; margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px;">
              SERVICES
            </div>
            ${order.services.map(service => `
              <div class="service-item">
                <div>
                  <div><strong>${service.serviceName}</strong></div>
                  <div class="service-details">Qty: ${service.quantity} × Ksh ${parseFloat(service.price).toLocaleString()}</div>
                </div>
                <div><strong>Ksh ${(parseFloat(service.price) * service.quantity).toLocaleString()}</strong></div>
              </div>
            `).join('')}
          </div>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>Ksh ${(order.totalAmount - (order.pickDropAmount || 0) + (order.discount || 0) + (order.promoDiscount || 0)).toLocaleString()}</span>
            </div>
            ${(order.pickDropAmount || 0) > 0 ? `
            <div class="total-row">
              <span>Pick & Drop:</span>
              <span>+Ksh ${(order.pickDropAmount || 0).toLocaleString()}</span>
            </div>
            ` : ''}
            ${(order.discount || 0) > 0 ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-Ksh ${(order.discount || 0).toLocaleString()}</span>
            </div>
            ` : ''}
            ${(order.promoDiscount || 0) > 0 ? `
            <div class="total-row">
              <span>Promo Discount:</span>
              <span>-Ksh ${(order.promoDiscount || 0).toLocaleString()}</span>
            </div>
            ` : ''}
            <div class="final-total">
              <div class="total-row">
                <span>TOTAL:</span>
                <span>Ksh ${(order.totalAmount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div class="payment-status">
            <div style="font-weight: bold; margin-bottom: 5px;">PAYMENT STATUS</div>
            <div style="font-size: 18px; font-weight: bold; color: ${(order.paymentStatus || 'unpaid') === 'paid' ? 'green' : (order.paymentStatus || 'unpaid') === 'partial' ? 'orange' : 'red'};">
              ${(order.paymentStatus || 'unpaid').toUpperCase()}
            </div>
            ${(order.paymentStatus || 'unpaid') === 'partial' && order.remainingBalance ? `
            <div style="margin-top: 5px; font-size: 14px;">
              Paid: Ksh ${((order.totalAmount || 0) - (order.remainingBalance || 0)).toLocaleString()}<br>
              Remaining: Ksh ${(order.remainingBalance || 0).toLocaleString()}
            </div>
            ` : ''}
            ${(order.paymentStatus === 'paid' || order.paymentStatus === 'partial') && (order.mpesaPayment?.mpesaReceiptNumber || order.mpesaReceiptNumber) ? `
            <div style="margin-top: 5px; font-size: 12px;">
              Receipt: ${order.mpesaPayment?.mpesaReceiptNumber || order.mpesaReceiptNumber}
            </div>
            ` : ''}
          </div>

          ${order.notes ? `
          <div style="margin: 20px 0; padding: 10px; border: 1px solid #000;">
            <div style="font-weight: bold; margin-bottom: 5px;">NOTES:</div>
            <div>${order.notes}</div>
          </div>
          ` : ''}

          <div class="footer">
            <div class="thank-you">Thank You for Choosing Econuru!</div>
            <div style="font-size: 13px; margin-bottom: 2px;">For inquiries: <span style="white-space: nowrap;">+254757883799</span></div>
            <div style="font-size: 13px; margin-bottom: 16px; word-break: break-all;"><span style="font-weight: bold;">Email:</span> econuruservices@gmail.com</div>
            <div style="margin-top: 0; font-size: 10px;">
              This receipt serves as proof of order placement.<br>
              Please keep it safe for order tracking.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const printReceipt = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptContent = generateReceiptHTML(order);

    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const downloadReceiptAsPDF = async (order: Order) => {
    try {
      // Dynamically import jsPDF and html2canvas
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);

      // Create a temporary container for the receipt
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '400px';
      tempContainer.style.background = 'white';
      tempContainer.style.padding = '20px';
      tempContainer.style.fontFamily = 'Courier New, monospace';
      tempContainer.style.color = 'black';
      tempContainer.style.border = '2px solid #000';
      tempContainer.innerHTML = generateReceiptHTML(order).replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<head>[\s\S]*?<\/head>/g, '').replace(/<html>|<\/html>|<body>|<\/body>/g, '');

      document.body.appendChild(tempContainer);

      // Wait a bit for the content to render
      await new Promise(resolve => setTimeout(resolve, 100));

      // Convert to canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 400,
        height: tempContainer.scrollHeight
      });

      // Remove the temporary container
      document.body.removeChild(tempContainer);

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download the PDF
      pdf.save(`receipt-${order.orderNumber}-${formatDate(order.createdAt)}.pdf`);

      toast({
        title: "PDF Downloaded",
        description: `Receipt for order ${order.orderNumber} has been downloaded as PDF.`,
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Orders</h1>
          <p className="text-gray-600 text-lg">
            Manage and track all customer orders
            {filteredOrders.length > 0 && (
              <span className="ml-2 text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
                {filteredOrders.length > ordersPerPage && (
                  <span className="ml-1">
                    (Page {currentPage} of {totalPages})
                  </span>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={fetchOrders}
            className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          
          
          {/* Export Buttons */}
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={exporting || filteredOrders.length === 0}
                  className="flex items-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem 
                  onClick={handleExportAll}
                  disabled={exporting || filteredOrders.length === 0}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export All Orders
                  <span className="ml-auto text-xs text-gray-500">
                    ({filteredOrders.length})
                  </span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={handleExportCurrentPage}
                  disabled={exporting || currentOrders.length === 0}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Current Page
                  <span className="ml-auto text-xs text-gray-500">
                    ({currentOrders.length})
                  </span>
                </DropdownMenuItem>
                
                <DropdownMenuItem className="h-px bg-gray-200 my-1" />
                
                <DropdownMenuItem 
                  onClick={handleExportToday}
                  disabled={exporting || filterOrdersByTimePeriod('today').length === 0}
                  className="flex items-center gap-2"
                >
                  <CalendarCheck className="w-4 h-4" />
                  Export Today's Orders
                  <span className="ml-auto text-xs text-gray-500">
                    ({filterOrdersByTimePeriod('today').length})
                  </span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={handleExportThisWeek}
                  disabled={exporting || filterOrdersByTimePeriod('week').length === 0}
                  className="flex items-center gap-2"
                >
                  <CalendarRange className="w-4 h-4" />
                  Export This Week's Orders
                  <span className="ml-auto text-xs text-gray-500">
                    ({filterOrdersByTimePeriod('week').length})
                  </span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={handleExportThisMonth}
                  disabled={exporting || filterOrdersByTimePeriod('month').length === 0}
                  className="flex items-center gap-2"
                >
                  <CalendarDays className="w-4 h-4" />
                  Export This Month's Orders
                  <span className="ml-auto text-xs text-gray-500">
                    ({filterOrdersByTimePeriod('month').length})
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* View Toggle - Only visible on laptops and desktops */}
          <div className="hidden lg:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`h-8 px-3 ${
                viewMode === 'grid' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`h-8 px-3 ${
                viewMode === 'list' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          
          <Button 
            className="bg-primary hover:bg-primary/90 text-white shadow-lg"
            onClick={() => router.push('/admin/pos')}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* User and Station Info */}
      <UserStationInfo />

      {/* Pending Confirmations Banner */}
      {pendingConfirmationsCount > 0 && (
        <Card className="border-l-4 border-l-orange-500 bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-900">
                    {pendingConfirmationsCount} Payment{pendingConfirmationsCount !== 1 ? 's' : ''} Awaiting Confirmation
                  </h3>
                  <p className="text-sm text-orange-700">
                    M-Pesa transactions received but require admin verification before linking to orders
                  </p>
                </div>
              </div>
              <Button
                onClick={() => router.push('/admin/mpesa-transactions')}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Review Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-white to-gray-50">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-300 focus:border-primary focus:ring-primary"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-gray-300 focus:border-primary focus:ring-primary">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>


            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="border-gray-300 focus:border-primary focus:ring-primary">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date Created</SelectItem>
                <SelectItem value="orderNumber">Order Number</SelectItem>
                <SelectItem value="customerName">Customer Name</SelectItem>
                <SelectItem value="totalAmount">Total Amount</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Display */}
      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {currentOrders.map((order) => (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 h-full flex flex-col justify-between">
                  <CardHeader className="pb-3 relative overflow-hidden">
                    {/* Status Badges */}
                    <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
                      {/* Station Name - Replaces Confirmed status */}
                      {order.station && (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs px-2 py-1 font-semibold shadow-sm flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{order.station.name}</span>
                        </Badge>
                      )}
                      {!order.station && (
                        <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-2 py-1 font-semibold shadow-sm flex items-center gap-1">
                          <span>NO STATION</span>
                        </Badge>
                      )}
                      <Badge className={`text-xs px-2 py-1 ${
                        (order.paymentStatus || 'unpaid') === 'paid' 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                          : (order.paymentStatus || 'unpaid') === 'partial'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          : (order.paymentStatus || 'unpaid') === 'pending'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : (order.paymentStatus || 'unpaid') === 'failed'
                          ? 'bg-red-100 text-red-800 border-red-200'
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {(order.paymentStatus || 'unpaid') === 'partial' ? 'Partial' : (order.paymentStatus || 'unpaid').charAt(0).toUpperCase() + (order.paymentStatus || 'unpaid').slice(1)}
                        {(order.paymentStatus || 'unpaid') === 'partial' && order.remainingBalance && (
                          <span className="ml-1 text-xs">
                            (Remaining: {order.remainingBalance.toLocaleString()})
                          </span>
                        )}
                      </Badge>
                      {order.promoCode && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs px-2 py-1 font-semibold shadow-sm flex items-center gap-1">
                          <span>Promo:</span>
                          <span className="font-mono">{order.promoCode}</span>
                          {order.promoDiscount ? (
                            <span className="ml-1">-Ksh {order.promoDiscount.toLocaleString()}</span>
                          ) : null}
                        </Badge>
                      )}
                      {/* Creator Tag */}
                      {order.createdBy && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs px-2 py-1 font-semibold shadow-sm flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{order.createdBy.name}</span>
                          <span className="text-blue-600">({order.createdBy.role})</span>
                        </Badge>
                      )}
                    </div>
                    
                    {/* Order Number with Icon */}
                    <div className="flex items-start justify-between pr-20">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <Package className="w-4 h-4 text-white" />
                          </div>
                          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            {order.orderNumber}
                          </CardTitle>
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Customer Info */}
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-blue-900 text-sm">Customer</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900 text-sm">{order.customer.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Phone className="w-3 h-3" />
                          <span>{order.customer.phone}</span>
                        </div>
                        {order.customer.email && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{order.customer.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Services Summary */}
                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-emerald-900 text-sm">Services</span>
                      </div>
                      <div className="space-y-1">
                        {order.services.map((service, index) => {
                          let unitPrice = 0;
                          if (typeof service.price === 'string') {
                            const cleanPrice = service.price.replace(/[^\d.]/g, '');
                            unitPrice = parseFloat(cleanPrice) || 0;
                          } else if (typeof service.price === 'number') {
                            unitPrice = isNaN(service.price) ? 0 : service.price;
                          }
                          
                          // Ensure we never have NaN
                          if (isNaN(unitPrice)) {
                            unitPrice = 0;
                          }
                          
                          const totalPrice = unitPrice * service.quantity;
                          
                          return (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="text-gray-700">
                                {service.quantity} × {service.serviceName}
                              </span>
                              <span className="text-gray-500">
                                Ksh {totalPrice.toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-amber-600" />
                        <span className="font-semibold text-amber-900 text-sm">Financial</span>
                        {order.promoCode && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs px-2 py-1 font-semibold shadow-sm flex items-center gap-1 ml-2">
                            <span>Promo:</span>
                            <span className="font-mono">{order.promoCode}</span>
                            {order.promoDiscount ? (
                              <span className="ml-1">-Ksh {order.promoDiscount.toLocaleString()}</span>
                            ) : null}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        {(order.pickDropAmount || 0) > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Pick & Drop:</span>
                            <span className="text-blue-600 font-medium">+Ksh {(order.pickDropAmount || 0).toLocaleString()}</span>
                          </div>
                        )}
                        {(order.discount || 0) > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Discount:</span>
                            <span className="text-red-600 font-medium">-Ksh {(order.discount || 0).toLocaleString()}</span>
                          </div>
                        )}
                        {(order.promoDiscount || 0) > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Promo Discount:</span>
                            <span className="text-emerald-600 font-medium">-Ksh {(order.promoDiscount || 0).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs pt-1 border-t border-amber-200">
                          <span className="text-gray-700 font-medium">Total:</span>
                          <span className="text-primary font-bold">Ksh {(order.totalAmount || 0).toLocaleString()}</span>
                        </div>
                        
                        {/* Payment Status Information */}
                        {(order.paymentStatus === 'paid' || order.paymentStatus === 'partial') && (
                          <div className="mt-2 pt-2 border-t border-amber-200 space-y-1">
                            {order.paymentStatus === 'paid' && (
                              <div className="flex justify-between text-xs">
                                <span className="text-emerald-700 font-medium">Payment Status:</span>
                                <span className="text-emerald-700 font-bold">✅ FULLY PAID</span>
                              </div>
                            )}
                            {order.paymentStatus === 'partial' && (
                              <>
                                <div className="flex justify-between text-xs">
                                  <span className="text-yellow-700 font-medium">Amount Paid:</span>
                                  <span className="text-yellow-700 font-bold">Ksh {((order.totalAmount || 0) - (order.remainingBalance || 0)).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-red-700 font-medium">Remaining Balance:</span>
                                  <span className="text-red-700 font-bold">Ksh {(order.remainingBalance || 0).toLocaleString()}</span>
                                </div>
                                {order.partialPayments && order.partialPayments.length > 0 && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    <span>{order.partialPayments.length} payment{order.partialPayments.length > 1 ? 's' : ''} made</span>
                                  </div>
                                )}
                              </>
                            )}
                            {/* Payment Phone (only if valid and different from customer phone) */}
                            {(order.mpesaPayment?.phoneNumber || order.phoneNumber) &&
                              isValidPhone(order.mpesaPayment?.phoneNumber || order.phoneNumber) &&
                              (order.mpesaPayment?.phoneNumber || order.phoneNumber) !== order.customer.phone && (
                                <div className="flex justify-between text-xs mt-1 pt-1 border-t border-amber-100">
                                  <span className="text-blue-700 font-medium">Payment Phone:</span>
                                  <span className="text-blue-700 font-mono">{order.mpesaPayment?.phoneNumber || order.phoneNumber}</span>
                                </div>
                            )}
                            {/* M-Pesa Receipt Number */}
                            {(order.mpesaPayment?.mpesaReceiptNumber || order.mpesaReceiptNumber) && (
                              <div className="flex justify-between text-xs mt-1">
                                <span className="text-purple-700 font-medium">Receipt:</span>
                                <span className="text-purple-700 font-mono">{(order.mpesaPayment?.mpesaReceiptNumber || order.mpesaReceiptNumber)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Information */}
                    <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <span className="font-semibold text-indigo-900 text-sm">Status</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Payment:</span>
                          <Badge className={`text-xs px-2 py-1 ${
                            (order.paymentStatus || 'unpaid') === 'paid' 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                              : (order.paymentStatus || 'unpaid') === 'partial'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              : (order.paymentStatus || 'unpaid') === 'pending'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : (order.paymentStatus || 'unpaid') === 'failed'
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                          }`}>
                            {(order.paymentStatus || 'unpaid') === 'partial' ? 'Partial' : (order.paymentStatus || 'unpaid').charAt(0).toUpperCase() + (order.paymentStatus || 'unpaid').slice(1)}
                          </Badge>
                          {(order.paymentStatus || 'unpaid') === 'partial' && order.remainingBalance && (
                            <div className="text-xs text-yellow-700 mt-1">
                              Remaining: KES {order.remainingBalance.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pickup Info */}
                    {order.pickupDate && (
                      <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-purple-600" />
                          <span className="font-semibold text-purple-900 text-sm">Pickup</span>
                        </div>
                        <div className="text-sm text-gray-700">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{order.pickupDate}</span>
                          </div>
                          {order.pickupTime && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              <span>{order.pickupTime}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Total Amount */}
                    <div className="bg-gradient-to-r from-mint-green to-green-500 rounded-lg p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium opacity-90">Total Amount</p>
                          <p className="text-2xl font-bold">
                            Ksh {(order.totalAmount || 0).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewOrder(order);
                          }}
                          className="text-white hover:bg-white/20"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      {order.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptOrder(order);
                          }}
                          disabled={updating}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Accept Order
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                          >
                            <Printer className="w-4 h-4" />
                            Receipt
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              printReceipt(order);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Printer className="w-4 h-4" />
                            Print Receipt
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadReceiptAsPDF(order);
                            }}
                            className="flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            Download PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditOrder(order);
                        }}
                        className="flex-1 border-primary text-primary hover:bg-primary hover:text-white min-w-0"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="truncate">Edit</span>
                      </Button>
                      {user?.role !== 'manager' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(order);
                          }}
                          className="flex-1 border-red-600 text-red-600 hover:bg-red-600 hover:text-white min-w-0 whitespace-nowrap"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="truncate">Delete</span>
                        </Button>
                      )}
                    </div>

                    {/* Payment Actions */}
                    <div className="flex gap-2 pt-2">
                      {(order.paymentStatus !== 'paid') && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInitiatePayment(order);
                          }}
                          disabled={initiatingPayment}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white min-w-0"
                        >
                          {initiatingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                          <span className="truncate">
                            {order.paymentStatus === 'partial' ? 'Ksh Request Balance' : 'Ksh Request Payment'}
                          </span>
                        </Button>
                      )}
                      {order.paymentStatus === 'pending' && order.mpesaPayment?.checkoutRequestId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            checkPaymentStatus(order);
                          }}
                          disabled={checkingPayment}
                          className="flex-1 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white"
                        >
                          {checkingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          Check Status
                        </Button>
                      )}
                      {order.paymentStatus === 'paid' && order.mpesaPayment?.mpesaReceiptNumber && (
                        <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-md p-2">
                          <p className="text-xs text-emerald-800 font-medium">
                            Receipt: {order.mpesaPayment.mpesaReceiptNumber}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          <AnimatePresence>
            {currentOrders.map((order) => (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-0 shadow-md bg-gradient-to-r from-white to-gray-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      {/* Order Info */}
                      <div className="flex items-center gap-6 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              {order.orderNumber}
                            </h3>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium text-gray-900">{order.customer.name}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-3 h-3" />
                              <span>{order.customer.phone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Services Summary */}
                        <div className="space-y-1">
                          {order.services.map((service, index) => {
                            let unitPrice = 0;
                            if (typeof service.price === 'string') {
                              const cleanPrice = service.price.replace(/[^\d.]/g, '');
                              unitPrice = parseFloat(cleanPrice) || 0;
                            } else if (typeof service.price === 'number') {
                              unitPrice = isNaN(service.price) ? 0 : service.price;
                            }
                            
                            // Ensure we never have NaN
                            if (isNaN(unitPrice)) {
                              unitPrice = 0;
                            }
                            
                            const totalPrice = unitPrice * service.quantity;
                            
                            return (
                              <div key={index} className="flex justify-between items-center text-sm">
                                <span className="text-gray-700">
                                  {service.quantity} × {service.serviceName}
                                </span>
                                <span className="text-gray-500">
                                  Ksh {totalPrice.toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-col gap-2">
                          {/* Station Name - Replaces Confirmed status */}
                          {order.station && (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs px-2 py-1 font-semibold shadow-sm flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{order.station.name}</span>
                            </Badge>
                          )}
                          {!order.station && (
                            <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-2 py-1 font-semibold shadow-sm flex items-center gap-1">
                              <span>NO STATION</span>
                            </Badge>
                          )}
                          <Badge className={`text-xs px-2 py-1 ${
                            (order.paymentStatus || 'unpaid') === 'paid' 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                              : (order.paymentStatus || 'unpaid') === 'partial'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              : (order.paymentStatus || 'unpaid') === 'pending'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : (order.paymentStatus || 'unpaid') === 'failed'
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                          }`}>
                            {(order.paymentStatus || 'unpaid') === 'partial' ? 'Partial' : (order.paymentStatus || 'unpaid').charAt(0).toUpperCase() + (order.paymentStatus || 'unpaid').slice(1)}
                            {(order.paymentStatus || 'unpaid') === 'partial' && order.remainingBalance && (
                              <span className="ml-1">
                                (Remaining: {order.remainingBalance.toLocaleString()})
                              </span>
                            )}
                          </Badge>
                          {/* Creator Tag */}
                          {order.createdBy && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs px-2 py-1 font-semibold shadow-sm flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{order.createdBy.name}</span>
                              <span className="text-blue-600">({order.createdBy.role})</span>
                            </Badge>
                          )}
                        </div>

                        {/* Total Amount */}
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            Ksh {(order.totalAmount || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 ml-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewOrder(order);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                printReceipt(order);
                              }}
                              className="flex items-center gap-2"
                            >
                              <Printer className="w-4 h-4" />
                              Print Receipt
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadReceiptAsPDF(order);
                              }}
                              className="flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              Download PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {order.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptOrder(order);
                            }}
                            disabled={updating}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Accept
                          </Button>
                        )}
                        
                        {/* Payment Actions */}
                        {(order.paymentStatus !== 'paid') && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInitiatePayment(order);
                            }}
                            disabled={initiatingPayment}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {initiatingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                            {order.paymentStatus === 'partial' ? 'Ksh Request Balance' : 'Ksh Request Payment'}
                          </Button>
                        )}
                        {order.paymentStatus === 'pending' && order.mpesaPayment?.checkoutRequestId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              checkPaymentStatus(order);
                            }}
                            disabled={checkingPayment}
                            className="border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white"
                          >
                            {checkingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditOrder(order);
                          }}
                          className="border-primary text-primary hover:bg-primary hover:text-white"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {user?.role !== 'manager' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOrder(order);
                            }}
                            className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination Controls */}
      {filteredOrders.length > ordersPerPage && (
        <div className="flex items-center justify-between bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Showing {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length} orders
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
                      ? 'bg-primary hover:bg-primary/90 text-white' 
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

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading orders...</h3>
          <p className="text-gray-500">Please wait while we fetch your orders</p>
        </div>
      )}

      {/* Empty State */}
      {currentOrders.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {((user?.role === 'manager' || user?.role === 'admin') && (user?.stationId || (user?.managedStations && user.managedStations.length > 0))) 
              ? 'No orders found for your station' 
              : 'No valid orders found'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : ((user?.role === 'manager' || user?.role === 'admin') && (user?.stationId || (user?.managedStations && user.managedStations.length > 0)))
                ? `No orders found for your station. Get started by creating your first order.`
                : 'Only orders with complete station and creator information are displayed. Get started by creating your first order.'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <Button 
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={() => router.push('/admin/pos')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Order
            </Button>
          )}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Order Details - {selectedOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Complete information about this order
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Header */}
              <div className="bg-gradient-to-r from-mint-green to-green-500 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{selectedOrder.orderNumber}</h3>
                    <p className="text-sm opacity-90">
                      Created on {formatDate(selectedOrder.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={`${
                      (selectedOrder.paymentStatus || 'unpaid') === 'paid' 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : (selectedOrder.paymentStatus || 'unpaid') === 'partial'
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        : (selectedOrder.paymentStatus || 'unpaid') === 'pending'
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : (selectedOrder.paymentStatus || 'unpaid') === 'failed'
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : 'bg-gray-100 text-gray-800 border-gray-200'
                    }`}>
                      {(selectedOrder.paymentStatus || 'unpaid') === 'partial' ? 'Partial Payment' : (selectedOrder.paymentStatus || 'unpaid').charAt(0).toUpperCase() + (selectedOrder.paymentStatus || 'unpaid').slice(1)}
                      {(selectedOrder.paymentStatus || 'unpaid') === 'partial' && selectedOrder.remainingBalance && (
                        <span className="ml-2 text-xs">
                          (Remaining: KES {selectedOrder.remainingBalance.toLocaleString()})
                        </span>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm text-gray-500">Name</h5>
                      <p className="font-semibold">{selectedOrder.customer.name}</p>
                    </div>
                    <div>
                      <h5 className="text-sm text-gray-500">Phone</h5>
                      <p className="font-semibold">{selectedOrder.customer.phone}</p>
                    </div>
                    {selectedOrder.customer.email && (
                      <div>
                        <h5 className="text-sm text-gray-500">Email</h5>
                        <p className="font-semibold">{selectedOrder.customer.email}</p>
                      </div>
                    )}
                    {selectedOrder.customer.address && (
                      <div>
                        <h5 className="text-sm text-gray-500">Address</h5>
                        <p className="font-semibold">{selectedOrder.customer.address}</p>
                      </div>
                    )}
                    <div>
                      <h5 className="text-sm text-gray-500">Location</h5>
                      <p className="font-semibold">{selectedOrder.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Services */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Services ({selectedOrder.services.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedOrder.services.map((service, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold">{service.serviceName}</p>
                          <p className="text-sm text-gray-600">Quantity: {service.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">Ksh {parseFloat(service.price).toLocaleString()}</p>
                          <p className="text-sm text-gray-600">
                            Total: Ksh {(parseFloat(service.price) * service.quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>Ksh {(selectedOrder.totalAmount - (selectedOrder.pickDropAmount || 0) + (selectedOrder.discount || 0)).toLocaleString()}</span>
                    </div>
                    {(selectedOrder.pickDropAmount || 0) > 0 && (
                      <div>
                        <h5 className="text-sm text-gray-500">Pick & Drop</h5>
                        <p className="font-semibold text-blue-600">+Ksh {(selectedOrder.pickDropAmount || 0).toLocaleString()}</p>
                      </div>
                    )}
                    {(selectedOrder.discount || 0) > 0 && (
                      <div>
                        <h5 className="text-sm text-gray-500">Discount</h5>
                        <p className="font-semibold text-red-600">-Ksh {(selectedOrder.discount || 0).toLocaleString()}</p>
                      </div>
                    )}
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Amount:</span>
                        <span className="text-primary">Ksh {(selectedOrder.totalAmount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    {/* Manual Payment Connection - Show for unpaid or partial paid orders */}
                    {((selectedOrder.paymentStatus || 'unpaid') === 'unpaid' || 
                      (selectedOrder.paymentStatus || 'unpaid') === 'partial') && (
                      <div className="border-t pt-3">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h6 className="text-sm font-medium text-orange-800">Manual Payment Connection</h6>
                              <p className="text-xs text-orange-600 mt-1">
                                Search for M-Pesa transactions by amount and connect them to this order
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleManualPaymentSearch(selectedOrder)}
                              className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
                            >
                              <Link2 className="w-4 h-4" />
                              Connect Payment
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Status Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Status Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm text-gray-500">Payment Status</h5>
                      <Badge className={`${
                        (selectedOrder.paymentStatus || 'unpaid') === 'paid' 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                          : (selectedOrder.paymentStatus || 'unpaid') === 'partial'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          : (selectedOrder.paymentStatus || 'unpaid') === 'pending'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : (selectedOrder.paymentStatus || 'unpaid') === 'failed'
                          ? 'bg-red-100 text-red-800 border-red-200'
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {(selectedOrder.paymentStatus || 'unpaid') === 'partial' ? 'Partial Payment' : (selectedOrder.paymentStatus || 'unpaid').charAt(0).toUpperCase() + (selectedOrder.paymentStatus || 'unpaid').slice(1)}
                      </Badge>
                      {(selectedOrder.paymentStatus || 'unpaid') === 'partial' && (
                        <div className="text-sm text-yellow-700 mt-2">
                          <strong>Amount Paid:</strong> KES {((selectedOrder.totalAmount || 0) - (selectedOrder.remainingBalance || 0)).toLocaleString()}
                          <br />
                          <strong>Remaining Balance:</strong> KES {(selectedOrder.remainingBalance || 0).toLocaleString()}
                          {selectedOrder.partialPayments && selectedOrder.partialPayments.length > 0 && (
                            <>
                              <br />
                              <strong>Payment History:</strong> {selectedOrder.partialPayments.length} payment{selectedOrder.partialPayments.length > 1 ? 's' : ''} made
                            </>
                          )}
                        </div>
                      )}
                      
                      {/* Payment Information (if paid or partial) */}
                      {(selectedOrder.paymentStatus === 'paid' || selectedOrder.paymentStatus === 'partial') && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <h5 className="text-sm text-gray-500 mb-2">Payment Details</h5>
                          <div className="space-y-2">
                            {/* Payment Phone Number (if different from customer phone) */}
                            {(selectedOrder.mpesaPayment?.phoneNumber || selectedOrder.phoneNumber) && 
                             (selectedOrder.mpesaPayment?.phoneNumber || selectedOrder.phoneNumber) !== selectedOrder.customer.phone && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Payment Phone:</span>
                                <span className="font-mono text-blue-600">{(selectedOrder.mpesaPayment?.phoneNumber || selectedOrder.phoneNumber)}</span>
                              </div>
                            )}
                            
                            {/* M-Pesa Receipt Number */}
                            {(selectedOrder.mpesaPayment?.mpesaReceiptNumber || selectedOrder.mpesaReceiptNumber) && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Receipt Number:</span>
                                <span className="font-mono text-purple-600">{(selectedOrder.mpesaPayment?.mpesaReceiptNumber || selectedOrder.mpesaReceiptNumber)}</span>
                              </div>
                            )}
                            
                            {/* Payment Method */}
                            {selectedOrder.paymentMethod && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Payment Method:</span>
                                <span className="font-medium text-emerald-600">{selectedOrder.paymentMethod.toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pickup Information */}
              {(selectedOrder.pickupDate || selectedOrder.pickupTime) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Pickup Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedOrder.pickupDate && (
                        <div>
                          <h5 className="text-sm text-gray-500">Pickup Date</h5>
                          <p className="font-semibold">{selectedOrder.pickupDate}</p>
                        </div>
                      )}
                      {selectedOrder.pickupTime && (
                        <div>
                          <h5 className="text-sm text-gray-500">Pickup Time</h5>
                          <p className="font-semibold">{selectedOrder.pickupTime}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{selectedOrder.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Promo Code and Promo Discount */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Promo Code
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{selectedOrder.promoCode || '-'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Promo Discount
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{selectedOrder.promoDiscount ? `Ksh ${selectedOrder.promoDiscount}` : '-'}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Receipt
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    onClick={() => selectedOrder && printReceipt(selectedOrder)}
                    className="flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print Receipt
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => selectedOrder && downloadReceiptAsPDF(selectedOrder)}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Download PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Are you sure you want to delete this order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {orderToDelete && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Order Number:</span>
                  <span className="text-sm font-bold text-gray-900">{orderToDelete.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Customer:</span>
                  <span className="text-sm font-bold text-gray-900">{orderToDelete.customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                  <span className="text-sm font-bold text-gray-900">Ksh {orderToDelete.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <Badge className={`text-xs px-2 py-1 ${statusColors[orderToDelete.status]}`}>
                    {orderToDelete.status.charAt(0).toUpperCase() + orderToDelete.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteDialogOpen(false);
                setOrderToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteOrder}
              disabled={deleting}
              className="flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* M-Pesa Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Initiate M-Pesa Payment
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Send STK push request to customer for payment
            </DialogDescription>
          </DialogHeader>

          {orderForPayment && (
            <div className="space-y-4">
              {/* Order Details */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Order:</span>
                    <span className="text-sm font-bold text-gray-900">{orderForPayment.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Customer:</span>
                    <span className="text-sm font-bold text-gray-900">{orderForPayment.customer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Original Amount:</span>
                    <span className="text-sm font-bold text-gray-900">Ksh {orderForPayment.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    placeholder="254712345678"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter phone number in format: 254712345678
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount (Ksh)
                  </label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    min="1"
                    max={orderForPayment.remainingBalance || orderForPayment.totalAmount}
                    className="w-full bg-gray-50"
                    placeholder={`${orderForPayment.remainingBalance || orderForPayment.totalAmount}`}
                    disabled={true}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    STK Push only supports full payment: Ksh {(orderForPayment.remainingBalance || orderForPayment.totalAmount).toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    For partial payments, customer should pay manually and you can connect it in M-Pesa Transactions page.
                  </p>
                </div>
              </div>

              {/* Payment Status */}
              {orderForPayment.mpesaPayment?.checkoutRequestId && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Previous Request ID:</strong> {orderForPayment.mpesaPayment.checkoutRequestId}
                  </p>
                  {orderForPayment.mpesaPayment.resultDescription && (
                    <p className="text-sm text-yellow-800 mt-1">
                      <strong>Status:</strong> {orderForPayment.mpesaPayment.resultDescription}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setPaymentDialogOpen(false);
                setOrderForPayment(null);
                setPaymentPhone('');
                setPaymentAmount(0);
              }}
              disabled={initiatingPayment}
            >
              Cancel
            </Button>
            <Button
              onClick={initiateSTKPush}
              disabled={initiatingPayment || !paymentPhone || !paymentAmount}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              {initiatingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending STK...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  Send STK Push
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Payment Search Dialog */}
      <Dialog open={manualPaymentDialogOpen} onOpenChange={setManualPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-orange-600" />
              Connect Manual Payment
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Enter the amount paid to search for matching M-Pesa transactions
            </DialogDescription>
          </DialogHeader>

          {orderForManualPayment && (
            <div className="space-y-4">
              {/* Order Details */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Order:</span>
                    <span className="text-sm font-bold text-gray-900">{orderForManualPayment.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Customer:</span>
                    <span className="text-sm font-bold text-gray-900">{orderForManualPayment.customer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Order Total:</span>
                    <span className="text-sm font-bold text-gray-900">Ksh {orderForManualPayment.totalAmount.toLocaleString()}</span>
                  </div>
                  {orderForManualPayment.remainingBalance && orderForManualPayment.remainingBalance < orderForManualPayment.totalAmount && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Remaining Balance:</span>
                      <span className="text-sm font-bold text-orange-600">Ksh {orderForManualPayment.remainingBalance.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Search Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount (Ksh)
                  </label>
                  <Input
                    type="number"
                    value={manualPaymentAmount}
                    onChange={(e) => setManualPaymentAmount(e.target.value)}
                    placeholder="Enter the amount the customer paid"
                    min="1"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the exact amount that appears in the M-Pesa transaction
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h6 className="text-sm font-medium text-blue-800 mb-1">How it works:</h6>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• Enter the amount the customer paid via M-Pesa</li>
                  <li>• System will search for unconnected transactions with that amount</li>
                  <li>• If one match found, it will be auto-connected</li>
                  <li>• If multiple matches found, you can choose the correct one</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setManualPaymentDialogOpen(false);
                setOrderForManualPayment(null);
                setManualPaymentAmount('');
              }}
              disabled={searchingPayments}
            >
              Cancel
            </Button>
            <Button
              onClick={searchPaymentByAmount}
              disabled={searchingPayments || !manualPaymentAmount}
              className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
            >
              {searchingPayments ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Search & Connect
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multiple Transactions Selection Dialog */}
      <Dialog open={multipleTransactionsDialogOpen} onOpenChange={setMultipleTransactionsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-orange-600" />
              Multiple Transactions Found
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Multiple M-Pesa transactions found with amount KES {manualPaymentAmount}. Please select the correct one.
            </DialogDescription>
          </DialogHeader>

          {orderForManualPayment && (
            <div className="space-y-4">
              {/* Order Summary */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <h6 className="text-sm font-medium text-orange-800 mb-1">
                  Connecting to Order: {orderForManualPayment.orderNumber}
                </h6>
                <p className="text-xs text-orange-600">
                  Customer: {orderForManualPayment.customer.name} • Total: KES {orderForManualPayment.totalAmount.toLocaleString()}
                </p>
              </div>

              {/* Transactions List */}
              <div className="space-y-3">
                <h6 className="text-sm font-medium text-gray-700">Available Transactions:</h6>
                {multipleTransactions.map((transaction, index) => (
                  <div 
                    key={transaction._id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex-1">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Transaction ID:</strong>
                          <div className="font-mono text-blue-600">{transaction.id}</div>
                        </div>
                        <div>
                          <strong>Amount:</strong>
                          <div className="font-bold text-emerald-600">KES {transaction.amountPaid.toLocaleString()}</div>
                        </div>
                        <div>
                          <strong>Customer:</strong>
                          <div>{transaction.customerName}</div>
                        </div>
                        <div>
                          <strong>Phone:</strong>
                          <div className="font-mono">{transaction.phoneNumber}</div>
                        </div>
                        <div className="col-span-2">
                          <strong>Date:</strong>
                          <div>{new Date(transaction.transactionDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</div>
                        </div>
                        <div className="col-span-2">
                          <strong>Type:</strong>
                          <Badge variant="outline" className="ml-2">
                            {transaction.transactionType === 'STK_PUSH' ? 'STK Push' : 'C2B Payment'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => connectSpecificTransaction(transaction.id)}
                      disabled={searchingPayments}
                      className="bg-orange-600 hover:bg-orange-700 text-white ml-4"
                    >
                      {searchingPayments ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Connect This'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setMultipleTransactionsDialogOpen(false);
                setOrderForManualPayment(null);
                setManualPaymentAmount('');
                setMultipleTransactions([]);
              }}
              disabled={searchingPayments}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function OrdersPage() {
  return (
    <AdminPageProtection pageName="Orders">
      <OrdersPageContent />
    </AdminPageProtection>
  );
} 