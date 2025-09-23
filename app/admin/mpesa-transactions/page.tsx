"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  RefreshCw,
  Smartphone, 
  Receipt,
  Link2, 
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Edit,
  Calculator
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ProtectedRoute from '@/components/ProtectedRoute';

interface MpesaTransaction {
  _id: string;
  transactionId: string;
  mpesaReceiptNumber: string;
  transactionDate: string;
  phoneNumber: string;
  amountPaid: number;
  transactionType: string;
  customerName: string;
  isConnectedToOrder: boolean;
  connectedOrderId?: string | Order; // Can be either string ID or populated Order object
  connectedAt?: string;
  connectedBy?: string;
  notes?: string;
  createdAt: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
  };
  totalAmount: number;
  remainingBalance?: number;
  paymentStatus: string;
}

export default function MpesaTransactionsPage() {
  const { isAdmin, logout, isLoading, token } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Connection modal state
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<MpesaTransaction | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Add transaction modal state
  const [addTransactionDialogOpen, setAddTransactionDialogOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    transactionId: '',
    mpesaReceiptNumber: '',
    transactionDate: '',
    transactionTime: '',
    phoneNumber: '',
    amountPaid: '',
    customerName: '',
    transactionType: 'C2B',
    notes: ''
  });
  const [addingTransaction, setAddingTransaction] = useState(false);

  // Recalculate payment status modal state
  const [recalculateDialogOpen, setRecalculateDialogOpen] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      logout();
    }
  }, [isAdmin, isLoading, logout]);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load M-Pesa transactions
      const transactionsResponse = await fetch('/api/admin/mpesa-transactions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Load orders for connection dropdown and display
      const ordersResponse = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (transactionsResponse.ok && ordersResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        const ordersData = await ordersResponse.json();
        
        // Debug: Log transaction data to see phone number format
        if (transactionsData.transactions && transactionsData.transactions.length > 0) {
          console.log('🔍 DEBUG: First transaction data:', {
            phoneNumber: transactionsData.transactions[0].phoneNumber,
            transactionId: transactionsData.transactions[0].transactionId,
            customerName: transactionsData.transactions[0].customerName,
            isConnectedToOrder: transactionsData.transactions[0].isConnectedToOrder,
            connectedOrderId: transactionsData.transactions[0].connectedOrderId
          });
        }
        
        // Debug: Log orders data
        if (ordersData.orders && ordersData.orders.length > 0) {
          console.log('🔍 DEBUG: Orders loaded:', {
            totalOrders: ordersData.orders.length,
            firstOrder: {
              _id: ordersData.orders[0]._id,
              orderNumber: ordersData.orders[0].orderNumber,
              customer: ordersData.orders[0].customer?.name,
              paymentStatus: ordersData.orders[0].paymentStatus
            },
            allOrderIds: ordersData.orders.map(o => ({ id: o._id, orderNumber: o.orderNumber })).slice(0, 5)
          });
        }
        
        setTransactions(transactionsData.transactions || []);
        setOrders(ordersData.orders || []);
      } else {
        toast({
          title: 'Error Loading Data',
          description: 'Failed to load transactions or orders',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Connection Error',
        description: 'Unable to connect to the server',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectTransaction = (transaction: MpesaTransaction) => {
    setSelectedTransaction(transaction);
    setSelectedOrderId('');
    setConnectionDialogOpen(true);
  };

  const connectTransactionToOrder = async () => {
    if (!selectedTransaction || !selectedOrderId) {
      toast({
        title: 'Missing Information',
        description: 'Please select an order to connect',
        variant: 'destructive',
      });
      return;
    }

    try {
      setConnecting(true);
      
      const response = await fetch('/api/admin/mpesa-transactions/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionId: selectedTransaction.transactionId,
          orderId: selectedOrderId,
        }),
      });
      
        const data = await response.json();

      if (data.success) {
        toast({
          title: 'Transaction Connected',
          description: data.message,
          variant: 'default',
        });

        // Update transaction in local state
        setTransactions(prevTransactions =>
          prevTransactions.map(t =>
            t._id === selectedTransaction._id
              ? { ...t, isConnectedToOrder: true, connectedOrderId: selectedOrderId }
              : t
          )
        );

        setConnectionDialogOpen(false);
        setSelectedTransaction(null);
        setSelectedOrderId('');
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
      setConnecting(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.transactionId || !newTransaction.amountPaid || !newTransaction.customerName) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAddingTransaction(true);
      
      const transactionData = {
        ...newTransaction,
        amountPaid: parseFloat(newTransaction.amountPaid),
        transactionDate: newTransaction.transactionDate + 'T' + newTransaction.transactionTime,
        paymentCompletedAt: new Date().toISOString()
      };

      const response = await fetch('/api/admin/mpesa-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(transactionData),
      });
      
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Transaction Added',
          description: 'M-Pesa transaction added successfully',
          variant: 'default',
        });

        // Reset form and close dialog
        setNewTransaction({
          transactionId: '',
          mpesaReceiptNumber: '',
          transactionDate: '',
          transactionTime: '',
          phoneNumber: '',
          amountPaid: '',
          customerName: '',
          transactionType: 'C2B',
          notes: ''
        });
        setAddTransactionDialogOpen(false);
        
        // Reload data to show new transaction
        loadData();
      } else {
        toast({
          title: 'Add Failed',
          description: data.error || 'Failed to add transaction',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to add transaction',
        variant: 'destructive',
      });
    } finally {
      setAddingTransaction(false);
    }
  };

  const handleRecalculatePaymentStatus = async () => {
    try {
      setRecalculating(true);
      
      const response = await fetch('/api/admin/orders/recalculate-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Payment Status Updated',
          description: `Updated ${data.updatedCount} orders based on M-Pesa transactions`,
          variant: 'default',
        });
        
        // Reload data to show updated statuses
        loadData();
      } else {
        toast({
          title: 'Update Failed',
          description: data.error || 'Failed to update payment statuses',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error recalculating payment status:', error);
      toast({
        title: 'Error',
        description: 'Failed to recalculate payment status',
        variant: 'destructive',
      });
    } finally {
      setRecalculating(false);
      setRecalculateDialogOpen(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.phoneNumber.includes(searchTerm) ||
      transaction.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.mpesaReceiptNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'connected' && transaction.isConnectedToOrder && getConnectedOrder(transaction)) ||
      (statusFilter === 'unconnected' && !transaction.isConnectedToOrder) ||
      (statusFilter === 'missing-order' && transaction.isConnectedToOrder && !getConnectedOrder(transaction));
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (transaction: MpesaTransaction) => {
    if (transaction.isConnectedToOrder) {
      const connectedOrder = getConnectedOrder(transaction);
      if (connectedOrder) {
        return <Badge variant="default" className="bg-emerald-500">Connected</Badge>;
      } else {
        return <Badge variant="destructive" className="bg-red-500">Missing Order</Badge>;
      }
    } else {
      return <Badge variant="secondary" className="bg-orange-500 text-white">Unconnected</Badge>;
    }
  };

  const getConnectedOrder = (transaction: MpesaTransaction) => {
    if (!transaction.connectedOrderId) return null;
    
    // Handle both populated objects and raw ObjectIds
    let connectedOrderIdStr: string;
    if (typeof transaction.connectedOrderId === 'object' && transaction.connectedOrderId._id) {
      // If it's already populated, return it directly
      console.log('✅ Using populated order:', {
        transactionId: transaction.transactionId,
        orderNumber: transaction.connectedOrderId.orderNumber,
        orderId: transaction.connectedOrderId._id
      });
      return transaction.connectedOrderId as any; // Cast to Order type
    } else if (typeof transaction.connectedOrderId === 'object') {
      // If it's an ObjectId object, extract the string
      connectedOrderIdStr = String(transaction.connectedOrderId);
    } else {
      // If it's already a string
      connectedOrderIdStr = transaction.connectedOrderId;
    }
    
    const connectedOrder = orders.find(order => {
      const orderIdStr = String(order._id);
      return orderIdStr === connectedOrderIdStr;
    });
    
    // Debug: Log detailed information
    if (!connectedOrder && transaction.isConnectedToOrder) {
      console.warn('🔍 Connected transaction missing order:', {
        transactionId: transaction.transactionId,
        connectedOrderId: transaction.connectedOrderId,
        connectedOrderIdStr: connectedOrderIdStr,
        connectedOrderIdType: typeof transaction.connectedOrderId,
        totalOrdersLoaded: orders.length,
        availableOrderIds: orders.map(o => ({ id: o._id, idStr: String(o._id), orderNumber: o.orderNumber })).slice(0, 5),
        exactMatch: orders.find(o => String(o._id) === connectedOrderIdStr)
      });
    } else if (connectedOrder) {
      console.log('✅ Found connected order:', {
        transactionId: transaction.transactionId,
        orderNumber: connectedOrder.orderNumber,
        orderId: connectedOrder._id
      });
    }
    
    return connectedOrder;
  };

  // Helper function to format phone number and handle corrupted data
  const formatPhoneNumber = (phoneNumber: string | null | undefined) => {
    // Convert to string and handle null/undefined
    const phoneStr = phoneNumber ? String(phoneNumber) : '';
    
    // Check if it looks like a hash (64 characters, all hex)
    if (phoneStr && phoneStr.length === 64 && /^[a-f0-9]+$/i.test(phoneStr)) {
      return 'Data Error';
    }
    
    // Check if it's empty or 'Unknown'
    if (!phoneStr || phoneStr === 'Unknown') {
      return 'Unknown';
    }
    
    // Return the phone number as-is
    return phoneStr;
  };

  // Helper function to safely format order ID for display
  const formatOrderId = (orderId: any, maxLength: number = 8) => {
    if (!orderId) return 'Unknown';
    
    // Handle populated order objects with order number
    if (typeof orderId === 'object' && orderId.orderNumber) {
      return orderId.orderNumber; // Return the full order number for populated objects
    }
    
    // Handle MongoDB ObjectId or other objects
    let idStr: string;
    if (typeof orderId === 'object' && orderId._id) {
      idStr = String(orderId._id);
    } else if (typeof orderId === 'object' && orderId.$oid) {
      idStr = String(orderId.$oid);
    } else if (typeof orderId === 'object') {
      // If it's still an object, try to extract a meaningful ID
      idStr = orderId.toString ? orderId.toString() : JSON.stringify(orderId);
    } else {
      idStr = String(orderId);
    }
    
    // Avoid displaying "[object Object]"
    if (idStr === '[object Object]') {
      return 'Invalid ID';
    }
    
    return idStr.length > maxLength ? idStr.substring(0, maxLength) + '...' : idStr;
  };

  return (
    <ProtectedRoute requiredPermission="mpesa-transactions">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-emerald-600" />
            </div>
            M-Pesa Transactions
          </h1>
          <p className="text-gray-600 mt-2">View and manage all M-Pesa transaction records</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setAddTransactionDialogOpen(true)} 
            variant="outline" 
            size="sm" 
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Transaction</span>
          </Button>
          <Button 
            onClick={() => setRecalculateDialogOpen(true)} 
            variant="outline" 
            size="sm" 
            className="gap-2"
          >
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">Recalculate Payments</span>
          </Button>
          <Button onClick={loadData} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-blue-600" />
              </div>
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {transactions.length}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              All M-Pesa transactions
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              Connected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {transactions.filter(t => t.isConnectedToOrder && getConnectedOrder(t)).length}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Properly linked to orders
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              </div>
              Unconnected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {transactions.filter(t => !t.isConnectedToOrder || (t.isConnectedToOrder && !getConnectedOrder(t))).length}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Need connection/fixing
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Filter Transactions
          </CardTitle>
          <CardDescription>Search and filter M-Pesa transaction records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, phone, transaction ID, or receipt number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Connection Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="connected">Connected</SelectItem>
                <SelectItem value="unconnected">Unconnected</SelectItem>
                <SelectItem value="missing-order">Missing Order</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            M-Pesa Transactions ({filteredTransactions.length})
          </CardTitle>
          <CardDescription>
            All M-Pesa transaction records with order connection options
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              <p className="text-gray-500">Loading transactions...</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Client No</TableHead>
                      <TableHead>Amount Paid</TableHead>
                      <TableHead>Transaction Id</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center">
                          <div className="flex flex-col items-center space-y-2">
                            <Receipt className="w-8 h-8 text-gray-400" />
                            <p className="text-gray-500">No transactions found</p>
                            <p className="text-sm text-gray-400">
                              Transactions will appear here when customers make M-Pesa payments
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => {
                        const connectedOrder = getConnectedOrder(transaction);
                        return (
                          <TableRow key={transaction._id}>
                            <TableCell className="font-medium">
                              {transaction.customerName}
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-sm">
                                {(() => {
                                  if (connectedOrder && connectedOrder.customer && connectedOrder.customer.phone) {
                                    return connectedOrder.customer.phone;
                                  }
                                  // If not connected, show 'Null'
                                  return 'Null';
                                })()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-green-600">
                                KES {transaction.amountPaid.toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-sm">
                                {transaction.transactionId}
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(transaction.transactionDate), 'MMM dd, yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              {connectedOrder ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-blue-600">
                                    {connectedOrder.orderNumber}
                                  </span>
                                  {connectedOrder.paymentStatus === 'paid' && (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  )}
                                </div>
                              ) : transaction.isConnectedToOrder ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-red-600 text-sm">⚠️ Order Missing</span>
                                  <span className="text-xs text-gray-500">
                                    (ID: {formatOrderId(transaction.connectedOrderId, 8)})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">Not connected</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(transaction)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleConnectTransaction(transaction)}
                                  className="gap-2"
                                  variant={transaction.isConnectedToOrder ? "outline" : "default"}
                                >
                                  {transaction.isConnectedToOrder ? (
                                    <>
                                      <Edit className="w-4 h-4" />
                                      Edit
                                    </>
                                  ) : (
                                    <>
                                      <Link2 className="w-4 h-4" />
                                      Connect
                                    </>
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {filteredTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 space-y-2">
                    <Receipt className="w-8 h-8 text-gray-400" />
                    <p className="text-gray-500">No transactions found</p>
                    <p className="text-sm text-gray-400 text-center">
                      Transactions will appear here when customers make M-Pesa payments
                    </p>
                  </div>
                ) : (
                  filteredTransactions.map((transaction) => {
                    const connectedOrder = getConnectedOrder(transaction);
                    return (
                      <Card key={transaction._id} className="p-4">
                        <div className="space-y-3">
                          {/* Header with status */}
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">
                              {transaction.customerName}
                            </h3>
                            {getStatusBadge(transaction)}
                          </div>

                          {/* Amount and Phone */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-500">Amount</p>
                              <p className="font-bold text-green-600 text-lg">
                                KES {transaction.amountPaid.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Phone</p>
                              <p className="font-mono text-sm">
                                {(() => {
                                  if (connectedOrder && connectedOrder.customer && connectedOrder.customer.phone) {
                                    return connectedOrder.customer.phone;
                                  }
                                  // If not connected, show 'Null'
                                  return 'Null';
                                })()}
                              </p>
                            </div>
                          </div>

                          {/* Transaction details */}
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm text-gray-500">Transaction ID</p>
                              <p className="font-mono text-sm break-all">
                                {transaction.transactionId}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Date</p>
                              <p className="text-sm">
                                {format(new Date(transaction.transactionDate), 'MMM dd, yyyy HH:mm')}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Order Number</p>
                              {connectedOrder ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-blue-600">
                                    {connectedOrder.orderNumber}
                                  </span>
                                  {connectedOrder.paymentStatus === 'paid' && (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  )}
                                </div>
                              ) : transaction.isConnectedToOrder ? (
                                <div className="flex flex-col">
                                  <span className="text-red-600 text-sm">⚠️ Order Missing</span>
                                  <span className="text-xs text-gray-500">
                                    ID: {formatOrderId(transaction.connectedOrderId, 12)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">Not connected</span>
                              )}
                            </div>
                          </div>

                          {/* Action button */}
                          <Button 
                            size="sm" 
                            onClick={() => handleConnectTransaction(transaction)}
                            className="w-full gap-2"
                            variant={transaction.isConnectedToOrder ? "outline" : "default"}
                          >
                            {transaction.isConnectedToOrder ? (
                              <>
                                <Edit className="w-4 h-4" />
                                Edit Connection
                              </>
                            ) : (
                              <>
                                <Link2 className="w-4 h-4" />
                                Connect to Order
                              </>
                            )}
                          </Button>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Connection Dialog */}
      <Dialog open={connectionDialogOpen} onOpenChange={setConnectionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-600" />
              {selectedTransaction?.isConnectedToOrder ? 'Edit Transaction Connection' : 'Connect Transaction to Order'}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {selectedTransaction?.isConnectedToOrder 
                ? 'Select a different order to reconnect this M-Pesa transaction to'
                : 'Select an order to connect this M-Pesa transaction to'
              }
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4">
              {/* Transaction Details */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Customer:</span>
                    <span className="text-sm font-bold text-gray-900">{selectedTransaction.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Phone:</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">{formatPhoneNumber(selectedTransaction.phoneNumber)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Amount:</span>
                    <span className="text-sm font-bold text-green-600">KES {selectedTransaction.amountPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Transaction ID:</span>
                    <span className="text-sm font-mono text-gray-900">{selectedTransaction.transactionId}</span>
                  </div>
                </div>
              </div>
              
              {/* Order Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Order
                </label>
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an order..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {orders
                      .filter(order => order.paymentStatus !== 'paid')
                      .map((order) => (
                        <SelectItem key={order._id} value={order._id} className="text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">{order.orderNumber}</span>
                            <span className="text-xs text-gray-500">{order.customer.name}</span>
                            <span className="text-xs text-green-600">KES {(order.remainingBalance || order.totalAmount).toLocaleString()}</span>
                            {/* Show phone number comparison */}
                            {selectedTransaction && order.customer.phone !== formatPhoneNumber(selectedTransaction.phoneNumber) && (
                              <div className="text-xs text-orange-600 mt-1">
                                <span>⚠️ Phone mismatch</span>
                                <br />
                                <span className="text-gray-500">Order: {order.customer.phone}</span>
                                <br />
                                <span className="text-gray-500">Payment: {formatPhoneNumber(selectedTransaction.phoneNumber)}</span>
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Only showing orders that are not fully paid
                </p>
                
                {/* Phone Number Comparison Warning */}
                {selectedOrderId && selectedTransaction && (() => {
                  const selectedOrder = orders.find(order => order._id === selectedOrderId);
                  if (selectedOrder && selectedOrder.customer.phone !== formatPhoneNumber(selectedTransaction.phoneNumber)) {
                    return (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-800">Phone Number Mismatch</span>
                        </div>
                        <div className="text-xs text-orange-700 space-y-1">
                          <div><strong>Order Phone:</strong> {selectedOrder.customer.phone}</div>
                          <div><strong>Payment Phone:</strong> {formatPhoneNumber(selectedTransaction.phoneNumber)}</div>
                          <div className="mt-2 text-orange-600">
                            ⚠️ The payment phone number is different from the order phone number. 
                            The order will retain the original customer phone, but the payment details will show the actual payment phone.
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline" 
              onClick={() => {
                setConnectionDialogOpen(false);
                setSelectedTransaction(null);
                setSelectedOrderId('');
              }}
              disabled={connecting}
            >
              Cancel
            </Button>
            <Button
              onClick={connectTransactionToOrder}
              disabled={connecting || !selectedOrderId}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              {connecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  {selectedTransaction?.isConnectedToOrder ? 'Update Connection' : 'Connect Transaction'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={addTransactionDialogOpen} onOpenChange={setAddTransactionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600" />
              Add Manual M-Pesa Transaction
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Add a M-Pesa transaction manually when there was an issue with the automatic system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transactionId">Transaction ID *</Label>
                <Input
                  id="transactionId"
                  placeholder="e.g., QK123456789"
                  value={newTransaction.transactionId}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, transactionId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mpesaReceiptNumber">M-Pesa Receipt Number</Label>
                <Input
                  id="mpesaReceiptNumber"
                  placeholder="e.g., QK123456789"
                  value={newTransaction.mpesaReceiptNumber}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, mpesaReceiptNumber: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transactionDate">Transaction Date *</Label>
                <Input
                  id="transactionDate"
                  type="date"
                  value={newTransaction.transactionDate}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, transactionDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionTime">Transaction Time *</Label>
                <Input
                  id="transactionTime"
                  type="time"
                  value={newTransaction.transactionTime}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, transactionTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  placeholder="e.g., 254700000000"
                  value={newTransaction.phoneNumber}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, phoneNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amountPaid">Amount Paid (KES) *</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  placeholder="e.g., 1000"
                  value={newTransaction.amountPaid}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, amountPaid: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  placeholder="e.g., John Doe"
                  value={newTransaction.customerName}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, customerName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionType">Transaction Type</Label>
                <Select 
                  value={newTransaction.transactionType} 
                  onValueChange={(value) => setNewTransaction(prev => ({ ...prev, transactionType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C2B">C2B</SelectItem>
                    <SelectItem value="STK_PUSH">STK Push</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this transaction..."
                value={newTransaction.notes}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline" 
              onClick={() => {
                setAddTransactionDialogOpen(false);
                setNewTransaction({
                  transactionId: '',
                  mpesaReceiptNumber: '',
                  transactionDate: '',
                  transactionTime: '',
                  phoneNumber: '',
                  amountPaid: '',
                  customerName: '',
                  transactionType: 'C2B',
                  notes: ''
                });
              }}
              disabled={addingTransaction}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTransaction}
              disabled={addingTransaction || !newTransaction.transactionId || !newTransaction.amountPaid || !newTransaction.customerName}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              {addingTransaction ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Transaction
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recalculate Payment Status Dialog */}
      <Dialog open={recalculateDialogOpen} onOpenChange={setRecalculateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              Recalculate Payment Status
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              This will check all M-Pesa transactions and update order payment statuses based on the total amount paid.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">What this does:</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Checks all M-Pesa transactions connected to each order</li>
                    <li>Calculates total amount paid vs. order total</li>
                    <li>Updates payment status to 'paid', 'partial', or 'unpaid'</li>
                    <li>Updates remaining balance for each order</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline" 
              onClick={() => setRecalculateDialogOpen(false)}
              disabled={recalculating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecalculatePaymentStatus}
              disabled={recalculating}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              {recalculating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Recalculating...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  Recalculate Payments
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </motion.div>
    </ProtectedRoute>
  );
} 