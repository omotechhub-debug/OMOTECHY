"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Package, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  ChevronDown,
  FileSpreadsheet
} from "lucide-react"
import { useAuth } from '@/hooks/useAuth'
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts'
import { toast } from "@/components/ui/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import * as XLSX from 'xlsx'

interface ReportData {
  salesReport: {
    totalRevenue: number
    totalOrders: number
    averageOrderValue: number
    revenueByMonth: Array<{ month: string; revenue: number }>
    ordersByStatus: Array<{ status: string; count: number }>
    grossRevenue?: number
    totalPickDropAmount?: number
    totalDiscounts?: number
  }
  customerReport: {
    totalCustomers: number
    newCustomers: number
    topCustomers: Array<{ name: string; totalSpent: number; orderCount: number }>
    customerStatus: Array<{ status: string; count: number }>
    customerRetentionRate?: number
    repeatCustomers?: number
  }
  expenseReport: {
    totalExpenses: number
    expensesByCategory: Array<{ category: string; amount: number }>
    monthlyExpenses: Array<{ month: string; amount: number }>
  }
  serviceReport: {
    topServices: Array<{ name: string; revenue: number; orderCount: number }>
    servicePerformance: Array<{ name: string; revenue: number; percentage: number }>
  }
  promotionReport?: {
    totalPromotions: number
    activePromotions: number
    promotionsByType: { [key: string]: number }
    totalPromotionValue: number
    promotions: Array<{
      title: string
      type: string
      discountAmount: number
      discountPercentage: number
      isActive: boolean
      startDate: string
      endDate: string
      createdAt: string
    }>
  }
  mpesaReport?: {
    totalTransactions: number
    totalAmount: number
    averageTransactionAmount: number
    fullyPaidCount: number
    partialCount: number
    unpaidCount: number
    fullyPaidAmount: number
    partialAmount: number
    unpaidAmount: number
    monthlyTransactions: Array<{ month: string; amount: number; count: number; averageAmount: number }>
    statusDistribution: Array<{ status: string; count: number }>
    statusAmountDistribution: Array<{ status: string; amount: number }>
    confirmationStatusBreakdown: Array<{ status: string; count: number }>
    connectedTransactionsRate: number
  }
  paymentStatusPie: Array<{ status: string; count: number }>
  paymentStatusAmountPie: Array<{ status: string; amount: number }>
  detailedData?: {
    expensesList: Array<{
      id: string
      description: string
      category: string
      amount: number
      date: string
      createdAt: string
      formattedAmount: string
      formattedDate: string
      formattedCreatedAt: string
    }>
    ordersList: Array<{
      id: string
      orderNumber: string
      customerName: string
      customerEmail: string
      customerPhone: string
      status: string
      paymentStatus: string
      totalAmount: number
      pickDropAmount: number
      discount: number
      netAmount: number
      servicesCount: number
      servicesNames: string
      createdAt: string
      updatedAt: string
      formattedTotalAmount: string
      formattedPickDropAmount: string
      formattedDiscount: string
      formattedNetAmount: string
      formattedCreatedAt: string
      formattedUpdatedAt: string
    }>
    unpaidOrdersList: Array<{
      id: string
      orderNumber: string
      customerName: string
      customerEmail: string
      customerPhone: string
      status: string
      paymentStatus: string
      totalAmount: number
      amountPaid: number
      amountDue: number
      pickDropAmount: number
      discount: number
      servicesNames: string
      daysPending: number
      createdAt: string
      updatedAt: string
      formattedTotalAmount: string
      formattedAmountPaid: string
      formattedAmountDue: string
      formattedPickDropAmount: string
      formattedDiscount: string
      formattedCreatedAt: string
      formattedUpdatedAt: string
    }>
    totalUnpaidAmount: number
    unpaidOrdersCount: number
    mpesaTransactionsList?: Array<{
      id: string
      transactionId: string
      mpesaReceiptNumber: string
      customerName: string
      phoneNumber: string
      amountPaid: number
      transactionType: string
      billRefNumber: string
      isConnectedToOrder: boolean
      connectedOrderId: string
      confirmationStatus: string
      pendingOrderId: string
      confirmedCustomerName: string
      confirmationNotes: string
      paymentCompletedAt: string
      transactionDate: string
      createdAt: string
      formattedAmount: string
      formattedTransactionDate: string
      formattedPaymentCompletedAt: string
      formattedCreatedAt: string
    }>
    fullyPaidMpesaList?: Array<any>
    partialMpesaList?: Array<any>
    unpaidMpesaList?: Array<any>
    totalMpesaAmount?: number
    totalMpesaTransactions?: number
  }
}

const STATUS_COLORS = [
  '#8884d8', // confirmed
  '#ffc658', // pending
  '#82ca9d', // delivered
  '#ff8042', // cancelled
  '#ffbb28', // in-progress
  '#d0ed57', // ready
  '#a4de6c', // picked
  '#d0ed57', // to-be-picked
];

const CUSTOMER_STATUS_COLORS = [
  '#10b981', // active - emerald
  '#6b7280', // inactive - gray
  '#8b5cf6', // vip - purple
  '#f59e0b', // premium - amber
  '#3b82f6', // new - blue
  '#ef4444', // suspended - red
];

export default function ReportsPage() {
  const { token } = useAuth()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const [activeTab, setActiveTab] = useState('sales')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchReportData()
    }
  }, [dateRange, token])

  const fetchReportData = async () => {
    if (!token) {
      setError('No authentication token found')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/reports?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch report data')
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-KE').format(num || 0)
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'pending': 'bg-amber-100 text-amber-800',
      'confirmed': 'bg-sky-100 text-sky-800',
      'in-progress': 'bg-orange-100 text-orange-800',
      'ready': 'bg-emerald-100 text-emerald-800',
      'delivered': 'bg-emerald-100 text-emerald-800',
      'cancelled': 'bg-red-100 text-red-800',
      'active': 'bg-emerald-100 text-emerald-800',
      'inactive': 'bg-gray-100 text-gray-800',
      'vip': 'bg-purple-100 text-purple-800',
      'premium': 'bg-amber-100 text-amber-800',
      'new': 'bg-blue-100 text-blue-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const exportReportsExcel = () => {
    if (!reportData || !reportData.detailedData) {
      toast({
        title: "No data to export",
        description: "Please wait for the reports to load before exporting.",
        variant: "destructive",
      });
      return;
    }

    const currentDate = new Date().toISOString().split('T')[0];
    const fileName = `econuru-comprehensive-report-${currentDate}.xlsx`;

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // 1. EXECUTIVE SUMMARY SHEET
    const summaryData = [
      ['ECONURU LAUNDRY SERVICES - EXECUTIVE SUMMARY'],
      [`Report Generated: ${new Date().toLocaleDateString('en-KE')}`],
      [`Period: Last ${dateRange} days`],
      [''],
      ['=== FINANCIAL OVERVIEW ==='],
      ['Metric', 'Value'],
      ['Total Revenue', formatCurrency(reportData.salesReport.totalRevenue)],
      ['Total Expenses', formatCurrency(reportData.expenseReport.totalExpenses)],
      ['Net Profit', formatCurrency(reportData.salesReport.totalRevenue - reportData.expenseReport.totalExpenses)],
      ['Profit Margin', `${reportData.salesReport.totalRevenue > 0 ? ((reportData.salesReport.totalRevenue - reportData.expenseReport.totalExpenses) / reportData.salesReport.totalRevenue * 100).toFixed(2) : 0}%`],
      [''],
      ['=== ORDERS SUMMARY ==='],
      ['Total Orders', reportData.salesReport.totalOrders.toLocaleString()],
      ['Paid Orders', reportData.detailedData.ordersList.filter(order => order.paymentStatus === 'paid').length.toLocaleString()],
      ['Unpaid Orders', reportData.detailedData.unpaidOrdersCount.toLocaleString()],
      ['Average Order Value', formatCurrency(reportData.salesReport.averageOrderValue)],
      [''],
      ['=== CUSTOMER SUMMARY ==='],
      ['Total Customers', reportData.customerReport.totalCustomers.toLocaleString()],
      ['New Customers', reportData.customerReport.newCustomers.toLocaleString()],
      ['Customer Retention', `${reportData.customerReport.customerRetentionRate || 0}%`],
      [''],
      ['=== UNPAID ORDERS ALERT ==='],
      ['Total Unpaid Amount', formatCurrency(reportData.detailedData.totalUnpaidAmount)],
      ['Number of Unpaid Orders', reportData.detailedData.unpaidOrdersCount.toLocaleString()],
      ['Avg Days Pending', Math.round(reportData.detailedData.unpaidOrdersList.reduce((sum, order) => sum + order.daysPending, 0) / Math.max(reportData.detailedData.unpaidOrdersCount, 1)).toString()]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

    // 2. PAID ORDERS SHEET
    const paidOrders = reportData.detailedData.ordersList.filter(order => order.paymentStatus === 'paid');
    const paidOrdersHeaders = [
      'Order Number',
      'Customer Name',
      'Customer Phone',
      'Customer Email',
      'Total Amount (KES)',
      'Pick & Drop (KES)',
      'Discount (KES)',
      'Net Amount (KES)',
      'Services',
      'Order Date',
      'Payment Status'
    ];
    const paidOrdersData = [
      ['PAID ORDERS REPORT'],
      [`Total Paid Orders: ${paidOrders.length}`],
      [`Total Paid Amount: ${formatCurrency(paidOrders.reduce((sum, order) => sum + order.totalAmount, 0))}`],
      [''],
      paidOrdersHeaders,
      ...paidOrders.map(order => [
        order.orderNumber,
        order.customerName,
        order.customerPhone,
        order.customerEmail,
        order.totalAmount,
        order.pickDropAmount,
        order.discount,
        order.netAmount,
        order.servicesNames,
        order.formattedCreatedAt,
        order.paymentStatus.toUpperCase()
      ])
    ];
    const paidOrdersSheet = XLSX.utils.aoa_to_sheet(paidOrdersData);
    XLSX.utils.book_append_sheet(workbook, paidOrdersSheet, 'Paid Orders');

    // 3. UNPAID ORDERS SHEET
    const unpaidHeaders = [
      'Order Number',
      'Customer Name', 
      'Customer Phone',
      'Customer Email',
      'Total Amount (KES)',
      'Amount Paid (KES)',
      'Amount Due (KES)',
      'Pick & Drop (KES)',
      'Services',
      'Days Pending',
      'Priority',
      'Order Date',
      'Payment Status'
    ];
    const unpaidData = [
      ['UNPAID ORDERS REPORT - IMMEDIATE ACTION REQUIRED'],
      [`Total Unpaid Orders: ${reportData.detailedData.unpaidOrdersCount}`],
      [`Total Amount Due: ${formatCurrency(reportData.detailedData.totalUnpaidAmount)}`],
      [`Average Days Pending: ${Math.round(reportData.detailedData.unpaidOrdersList.reduce((sum, order) => sum + order.daysPending, 0) / Math.max(reportData.detailedData.unpaidOrdersCount, 1))}`],
      [''],
      ['PRIORITY LEGEND: HIGH (>30 days) | MEDIUM (>14 days) | LOW (≤14 days)'],
      [''],
      unpaidHeaders,
      ...reportData.detailedData.unpaidOrdersList.map(order => [
        order.orderNumber,
        order.customerName,
        order.customerPhone,
        order.customerEmail,
        order.totalAmount,
        order.amountPaid,
        order.amountDue,
        order.pickDropAmount,
        order.servicesNames,
        order.daysPending,
        order.daysPending > 30 ? 'HIGH' : order.daysPending > 14 ? 'MEDIUM' : 'LOW',
        order.formattedCreatedAt,
        order.paymentStatus.toUpperCase()
      ])
    ];
    const unpaidSheet = XLSX.utils.aoa_to_sheet(unpaidData);
    XLSX.utils.book_append_sheet(workbook, unpaidSheet, 'Unpaid Orders');

    // 4. ALL EXPENSES SHEET
    const expensesHeaders = [
      'Date',
      'Description', 
      'Category',
      'Amount (KES)',
      'Created Date'
    ];
    const expensesData = [
      ['BUSINESS EXPENSES REPORT'],
      [`Total Expenses: ${formatCurrency(reportData.expenseReport.totalExpenses)}`],
      [`Number of Expenses: ${reportData.detailedData.expensesList.length}`],
      [`Average Expense: ${formatCurrency(reportData.expenseReport.totalExpenses / Math.max(reportData.detailedData.expensesList.length, 1))}`],
      [''],
      ['EXPENSE BREAKDOWN BY CATEGORY:'],
      ...reportData.expenseReport.expensesByCategory.map(cat => [
        `${cat.category}:`,
        '',
        '',
        formatCurrency(cat.amount),
        `${((cat.amount / reportData.expenseReport.totalExpenses) * 100).toFixed(1)}%`
      ]),
      [''],
      expensesHeaders,
      ...reportData.detailedData.expensesList.map(expense => [
        expense.formattedDate,
        expense.description,
        expense.category,
        expense.amount,
        expense.formattedCreatedAt
      ])
    ];
    const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData);
    XLSX.utils.book_append_sheet(workbook, expensesSheet, 'All Expenses');

    // 5. M-PESA TRANSACTIONS SUMMARY SHEET
    const mpesaSummaryData = [
      ['M-PESA TRANSACTIONS SUMMARY'],
      [`Total M-Pesa Transactions: ${reportData.mpesaReport?.totalTransactions || 0}`],
      [`Total M-Pesa Amount: ${formatCurrency(reportData.mpesaReport?.totalAmount || 0)}`],
      [`Average Transaction: ${formatCurrency(reportData.mpesaReport?.averageTransactionAmount || 0)}`],
      [`Connection Rate: ${(reportData.mpesaReport?.connectedTransactionsRate || 0).toFixed(1)}%`],
      [''],
      ['=== M-PESA STATUS BREAKDOWN ==='],
      ['Status', 'Count', 'Amount (KES)', 'Percentage by Count (%)', 'Percentage by Amount (%)'],
      ['Fully Paid', reportData.mpesaReport?.fullyPaidCount || 0, reportData.mpesaReport?.fullyPaidAmount || 0, 
       reportData.mpesaReport?.totalTransactions ? ((reportData.mpesaReport.fullyPaidCount / reportData.mpesaReport.totalTransactions) * 100).toFixed(1) : '0',
       reportData.mpesaReport?.totalAmount ? ((reportData.mpesaReport.fullyPaidAmount / reportData.mpesaReport.totalAmount) * 100).toFixed(1) : '0'],
      ['Partial Payments', reportData.mpesaReport?.partialCount || 0, reportData.mpesaReport?.partialAmount || 0,
       reportData.mpesaReport?.totalTransactions ? ((reportData.mpesaReport.partialCount / reportData.mpesaReport.totalTransactions) * 100).toFixed(1) : '0',
       reportData.mpesaReport?.totalAmount ? ((reportData.mpesaReport.partialAmount / reportData.mpesaReport.totalAmount) * 100).toFixed(1) : '0'],
      ['Unpaid/Unmatched', reportData.mpesaReport?.unpaidCount || 0, reportData.mpesaReport?.unpaidAmount || 0,
       reportData.mpesaReport?.totalTransactions ? ((reportData.mpesaReport.unpaidCount / reportData.mpesaReport.totalTransactions) * 100).toFixed(1) : '0',
       reportData.mpesaReport?.totalAmount ? ((reportData.mpesaReport.unpaidAmount / reportData.mpesaReport.totalAmount) * 100).toFixed(1) : '0'],
      [''],
      ['=== MONTHLY M-PESA TRANSACTIONS ==='],
      ['Month', 'Count', 'Amount (KES)', 'Average Amount (KES)'],
      ...(reportData.mpesaReport?.monthlyTransactions || []).map(month => [
        month.month,
        month.count,
        month.amount,
        month.averageAmount
      ]),
      [''],
      ['=== CONFIRMATION STATUS BREAKDOWN ==='],
      ['Status', 'Count', 'Percentage (%)'],
      ...(reportData.mpesaReport?.confirmationStatusBreakdown || []).map(status => [
        status.status.toUpperCase(),
        status.count,
        reportData.mpesaReport?.totalTransactions ? ((status.count / reportData.mpesaReport.totalTransactions) * 100).toFixed(1) : '0'
      ])
    ];
    const mpesaSummarySheet = XLSX.utils.aoa_to_sheet(mpesaSummaryData);
    XLSX.utils.book_append_sheet(workbook, mpesaSummarySheet, 'M-Pesa Summary');

    // 6. ALL M-PESA TRANSACTIONS SHEET
    if (reportData.detailedData?.mpesaTransactionsList && reportData.detailedData.mpesaTransactionsList.length > 0) {
      const mpesaHeaders = [
        'Transaction ID',
        'M-Pesa Receipt',
        'Customer Name',
        'Phone Number',
        'Amount (KES)',
        'Transaction Type',
        'Bill Ref Number',
        'Connected to Order',
        'Connected Order ID',
        'Confirmation Status',
        'Pending Order ID',
        'Confirmed Customer',
        'Notes',
        'Transaction Date',
        'Payment Completed',
        'Created Date'
      ];
      const mpesaTransactionsData = [
        ['ALL M-PESA TRANSACTIONS'],
        [`Total Transactions: ${reportData.detailedData.mpesaTransactionsList.length}`],
        [`Total Amount: ${formatCurrency(reportData.detailedData.totalMpesaAmount || 0)}`],
        [''],
        mpesaHeaders,
        ...reportData.detailedData.mpesaTransactionsList.map(transaction => [
          transaction.transactionId,
          transaction.mpesaReceiptNumber,
          transaction.customerName,
          transaction.phoneNumber,
          transaction.amountPaid,
          transaction.transactionType,
          transaction.billRefNumber,
          transaction.isConnectedToOrder ? 'Yes' : 'No',
          transaction.connectedOrderId,
          transaction.confirmationStatus.toUpperCase(),
          transaction.pendingOrderId,
          transaction.confirmedCustomerName,
          transaction.confirmationNotes,
          transaction.formattedTransactionDate,
          transaction.formattedPaymentCompletedAt,
          transaction.formattedCreatedAt
        ])
      ];
      const mpesaTransactionsSheet = XLSX.utils.aoa_to_sheet(mpesaTransactionsData);
      XLSX.utils.book_append_sheet(workbook, mpesaTransactionsSheet, 'All M-Pesa Transactions');
    }

    // 7. FULLY PAID M-PESA TRANSACTIONS SHEET
    if (reportData.detailedData?.fullyPaidMpesaList && reportData.detailedData.fullyPaidMpesaList.length > 0) {
      const fullyPaidHeaders = [
        'Transaction ID',
        'M-Pesa Receipt',
        'Customer Name',
        'Phone Number',
        'Amount (KES)',
        'Connected Order ID',
        'Confirmed Customer',
        'Transaction Date'
      ];
      const fullyPaidData = [
        ['FULLY PAID M-PESA TRANSACTIONS'],
        [`Successfully Connected Transactions: ${reportData.detailedData.fullyPaidMpesaList.length}`],
        [`Total Amount: ${formatCurrency(reportData.mpesaReport?.fullyPaidAmount || 0)}`],
        [''],
        fullyPaidHeaders,
        ...reportData.detailedData.fullyPaidMpesaList.map(transaction => [
          transaction.transactionId,
          transaction.mpesaReceiptNumber,
          transaction.customerName,
          transaction.phoneNumber,
          transaction.amountPaid,
          transaction.connectedOrderId,
          transaction.confirmedCustomerName,
          transaction.formattedTransactionDate
        ])
      ];
      const fullyPaidSheet = XLSX.utils.aoa_to_sheet(fullyPaidData);
      XLSX.utils.book_append_sheet(workbook, fullyPaidSheet, 'Fully Paid M-Pesa');
    }

    // 8. UNPAID M-PESA TRANSACTIONS SHEET (Action Required)
    if (reportData.detailedData?.unpaidMpesaList && reportData.detailedData.unpaidMpesaList.length > 0) {
      const unpaidMpesaHeaders = [
        'Transaction ID',
        'M-Pesa Receipt',
        'Customer Name',
        'Phone Number',
        'Amount (KES)',
        'Confirmation Status',
        'Pending Order ID',
        'Bill Ref Number',
        'Days Pending',
        'Priority',
        'Notes',
        'Transaction Date'
      ];
      const unpaidMpesaData = [
        ['UNPAID M-PESA TRANSACTIONS - ACTION REQUIRED'],
        [`Unmatched Transactions: ${reportData.detailedData.unpaidMpesaList.length}`],
        [`Total Amount: ${formatCurrency(reportData.mpesaReport?.unpaidAmount || 0)}`],
        [''],
        ['PRIORITY LEGEND: HIGH (>30 days) | MEDIUM (>14 days) | LOW (≤14 days)'],
        [''],
        unpaidMpesaHeaders,
        ...reportData.detailedData.unpaidMpesaList.map(transaction => [
          transaction.transactionId,
          transaction.mpesaReceiptNumber,
          transaction.customerName,
          transaction.phoneNumber,
          transaction.amountPaid,
          transaction.confirmationStatus.toUpperCase(),
          transaction.pendingOrderId,
          transaction.billRefNumber,
          transaction.daysPending,
          transaction.daysPending > 30 ? 'HIGH' : transaction.daysPending > 14 ? 'MEDIUM' : 'LOW',
          transaction.confirmationNotes,
          transaction.formattedTransactionDate
        ])
      ];
      const unpaidMpesaSheet = XLSX.utils.aoa_to_sheet(unpaidMpesaData);
      XLSX.utils.book_append_sheet(workbook, unpaidMpesaSheet, 'Unpaid M-Pesa');
    }

    // 9. BUSINESS ANALYTICS SHEET
    const analyticsData = [
      ['ECONURU BUSINESS ANALYTICS & INSIGHTS'],
      [`Analysis Period: Last ${dateRange} days`],
      [`Generated: ${new Date().toLocaleDateString('en-KE')}`],
      [''],
      
      // Revenue Analytics
      ['=== REVENUE ANALYTICS ==='],
      ['Metric', 'Value', 'Details'],
      ['Gross Revenue', reportData.salesReport.grossRevenue || reportData.salesReport.totalRevenue, formatCurrency(reportData.salesReport.grossRevenue || reportData.salesReport.totalRevenue)],
      ['Total Discounts', reportData.salesReport.totalDiscounts || 0, formatCurrency(reportData.salesReport.totalDiscounts || 0)],
      ['Pick & Drop Revenue', reportData.salesReport.totalPickDropAmount || 0, formatCurrency(reportData.salesReport.totalPickDropAmount || 0)],
      ['Net Revenue', reportData.salesReport.totalRevenue, formatCurrency(reportData.salesReport.totalRevenue)],
      ['Revenue per Order', reportData.salesReport.averageOrderValue, formatCurrency(reportData.salesReport.averageOrderValue)],
      ['Revenue per Customer', reportData.customerReport.totalCustomers > 0 ? reportData.salesReport.totalRevenue / reportData.customerReport.totalCustomers : 0, formatCurrency(reportData.customerReport.totalCustomers > 0 ? reportData.salesReport.totalRevenue / reportData.customerReport.totalCustomers : 0)],
      [''],
      
      // Monthly Performance
      ['=== MONTHLY PERFORMANCE ==='],
      ['Month', 'Revenue (KES)', 'Orders', 'Pick&Drop (KES)', 'Discounts (KES)', 'Net Revenue (KES)'],
      ...reportData.salesReport.revenueByMonth.map(month => [
        month.month,
        month.revenue,
        (month as any).orders || 0,
        (month as any).pickDrop || 0,
        (month as any).discounts || 0,
        month.revenue - ((month as any).discounts || 0)
      ]),
      [''],
      
      // Order Status Analysis
      ['=== ORDER STATUS ANALYSIS ==='],
      ['Status', 'Count', 'Revenue (KES)', 'Avg Order Value (KES)', 'Percentage (%)'],
      ...reportData.salesReport.ordersByStatus.map(status => [
        status.status.toUpperCase(),
        status.count,
        (status as any).revenue || 0,
        (status as any).averageValue || 0,
        ((status.count / reportData.salesReport.totalOrders) * 100).toFixed(1) + '%'
      ]),
      [''],
      
      // Payment Status Analysis
      ['=== PAYMENT STATUS ANALYSIS ==='],
      ['Payment Status', 'Orders Count', 'Total Amount (KES)', 'Percentage by Amount (%)'],
      ...reportData.paymentStatusAmountPie.map(payment => [
        payment.status.toUpperCase(),
        reportData.paymentStatusPie.find(p => p.status === payment.status)?.count || 0,
        payment.amount,
        ((payment.amount / reportData.salesReport.totalRevenue) * 100).toFixed(1) + '%'
      ]),
      [''],
      
      // Top Customers Analysis
      ['=== TOP CUSTOMERS ANALYSIS ==='],
      ['Rank', 'Customer Name', 'Total Spent (KES)', 'Orders', 'Avg Order (KES)', 'Customer Value Score'],
      ...reportData.customerReport.topCustomers.map((customer, index) => [
        index + 1,
        customer.name,
        customer.totalSpent,
        customer.orderCount,
        customer.orderCount > 0 ? (customer.totalSpent / customer.orderCount).toFixed(2) : 0,
        (customer.totalSpent * customer.orderCount / 1000).toFixed(1) // Simple scoring system
      ]),
      [''],
      
      // Service Performance Analysis
      ['=== SERVICE PERFORMANCE ANALYSIS ==='],
      ['Rank', 'Service Name', 'Revenue (KES)', 'Orders', 'Market Share (%)', 'Avg Price (KES)'],
      ...reportData.serviceReport.topServices.map((service, index) => [
        index + 1,
        service.name,
        service.revenue,
        service.orderCount,
        ((service.revenue / reportData.salesReport.totalRevenue) * 100).toFixed(1) + '%',
        service.orderCount > 0 ? (service.revenue / service.orderCount).toFixed(2) : 0
      ]),
      [''],
      
      // Expense Analysis
      ['=== EXPENSE ANALYSIS ==='],
      ['Category', 'Amount (KES)', 'Count', 'Avg Amount (KES)', 'Share of Expenses (%)'],
      ...reportData.expenseReport.expensesByCategory.map(expense => [
        expense.category,
        expense.amount,
        (expense as any).count || 1,
        (expense as any).averageAmount || expense.amount,
        ((expense.amount / reportData.expenseReport.totalExpenses) * 100).toFixed(1) + '%'
      ]),
      [''],
      
      // Profitability Analysis
      ['=== PROFITABILITY ANALYSIS ==='],
      ['Metric', 'Amount (KES)', 'Percentage (%)'],
      ['Total Revenue', reportData.salesReport.totalRevenue, '100.0%'],
      ['Total Expenses', reportData.expenseReport.totalExpenses, ((reportData.expenseReport.totalExpenses / reportData.salesReport.totalRevenue) * 100).toFixed(1) + '%'],
      ['Gross Profit', reportData.salesReport.totalRevenue - reportData.expenseReport.totalExpenses, ((((reportData.salesReport.totalRevenue - reportData.expenseReport.totalExpenses) / reportData.salesReport.totalRevenue) * 100) || 0).toFixed(1) + '%'],
      ['Revenue per Employee', 'Calculate manually', 'Based on staff count'],
      ['Break-even Point', 'Calculate manually', 'Based on fixed costs'],
      [''],
      
      // Key Performance Indicators
      ['=== KEY PERFORMANCE INDICATORS (KPIs) ==='],
      ['KPI', 'Current Value', 'Target/Benchmark', 'Status'],
      ['Customer Acquisition', reportData.customerReport.newCustomers, 'Set Target', 'Monitor'],
      ['Customer Retention Rate', `${reportData.customerReport.customerRetentionRate || 0}%`, '80%+', reportData.customerReport.customerRetentionRate > 80 ? 'Good' : 'Needs Improvement'],
      ['Average Order Value', formatCurrency(reportData.salesReport.averageOrderValue), 'Set Target', 'Monitor'],
      ['Profit Margin', `${((reportData.salesReport.totalRevenue - reportData.expenseReport.totalExpenses) / reportData.salesReport.totalRevenue * 100).toFixed(1)}%`, '20%+', ((reportData.salesReport.totalRevenue - reportData.expenseReport.totalExpenses) / reportData.salesReport.totalRevenue * 100) > 20 ? 'Good' : 'Needs Improvement'],
      ['Collection Efficiency', `${(((reportData.salesReport.totalRevenue - reportData.detailedData.totalUnpaidAmount) / reportData.salesReport.totalRevenue) * 100).toFixed(1)}%`, '95%+', (((reportData.salesReport.totalRevenue - reportData.detailedData.totalUnpaidAmount) / reportData.salesReport.totalRevenue) * 100) > 95 ? 'Excellent' : 'Monitor Collections'],
      [''],
      
      // Action Items
      ['=== RECOMMENDED ACTIONS ==='],
      ['Priority', 'Action Item', 'Expected Impact'],
      ['HIGH', `Follow up on ${reportData.detailedData.unpaidOrdersCount} unpaid orders worth ${formatCurrency(reportData.detailedData.totalUnpaidAmount)}`, 'Improve cash flow'],
      ['MEDIUM', 'Analyze top services performance for inventory planning', 'Optimize service offerings'],
      ['MEDIUM', 'Review expense categories for cost optimization', 'Improve profit margins'],
      ['LOW', 'Implement customer retention strategies', 'Increase repeat business'],
      ['LOW', 'Set up automated payment reminders', 'Reduce unpaid orders']
    ];
    const analyticsSheet = XLSX.utils.aoa_to_sheet(analyticsData);
    XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Business Analytics');

    // Write the file
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Comprehensive Excel Report exported successfully",
      description: `Complete business report with ${paidOrders.length} paid orders, ${reportData.detailedData.unpaidOrdersCount} unpaid orders, ${reportData.detailedData.expensesList.length} expenses, ${reportData.mpesaReport?.totalTransactions || 0} M-Pesa transactions, and detailed analytics downloaded as ${fileName}`,
    });
  };

  const exportReports = () => {
    if (!reportData) {
      toast({
        title: "No data to export",
        description: "Please wait for the reports to load before exporting.",
        variant: "destructive",
      });
      return;
    }

    const currentDate = new Date().toISOString().split('T')[0];
    const fileName = `econuru-reports-${currentDate}.json`;

    // Create comprehensive report data
    const exportData = {
      reportMetadata: {
        generatedAt: new Date().toISOString(),
        dateRange: `${dateRange} days`,
        reportPeriod: `${dateRange} days ending ${new Date().toISOString().split('T')[0]}`,
        businessName: "Econuru Laundry Services",
        reportType: "Comprehensive Business Report"
      },
      executiveSummary: {
        totalRevenue: reportData.salesReport.totalRevenue,
        totalOrders: reportData.salesReport.totalOrders,
        averageOrderValue: reportData.salesReport.averageOrderValue,
        totalCustomers: reportData.customerReport.totalCustomers,
        newCustomers: reportData.customerReport.newCustomers,
        totalExpenses: reportData.expenseReport.totalExpenses,
        netProfit: reportData.salesReport.totalRevenue - reportData.expenseReport.totalExpenses,
        profitMargin: reportData.salesReport.totalRevenue > 0 
          ? ((reportData.salesReport.totalRevenue - reportData.expenseReport.totalExpenses) / reportData.salesReport.totalRevenue * 100).toFixed(2) + '%'
          : '0%'
      },
      salesReport: {
        summary: {
          totalRevenue: reportData.salesReport.totalRevenue,
          totalOrders: reportData.salesReport.totalOrders,
          averageOrderValue: reportData.salesReport.averageOrderValue,
          revenuePerOrder: reportData.salesReport.totalOrders > 0 
            ? (reportData.salesReport.totalRevenue / reportData.salesReport.totalOrders).toFixed(2)
            : 0
        },
        revenueByMonth: reportData.salesReport.revenueByMonth.map(item => ({
          month: item.month,
          revenue: item.revenue,
          formattedRevenue: formatCurrency(item.revenue)
        })),
        ordersByStatus: reportData.salesReport.ordersByStatus.map(item => ({
          status: item.status,
          count: item.count,
          percentage: ((item.count / reportData.salesReport.totalOrders) * 100).toFixed(2) + '%'
        })),
        paymentStatusDistribution: {
          byCount: reportData.paymentStatusPie.map(item => ({
            status: item.status,
            count: item.count,
            percentage: ((item.count / reportData.salesReport.totalOrders) * 100).toFixed(2) + '%'
          })),
          byAmount: reportData.paymentStatusAmountPie.map(item => ({
            status: item.status,
            amount: item.amount,
            formattedAmount: formatCurrency(item.amount),
            percentage: ((item.amount / reportData.salesReport.totalRevenue) * 100).toFixed(2) + '%'
          }))
        }
      },
      customerReport: {
        summary: {
          totalCustomers: reportData.customerReport.totalCustomers,
          newCustomers: reportData.customerReport.newCustomers,
          newCustomerPercentage: reportData.customerReport.totalCustomers > 0 
            ? ((reportData.customerReport.newCustomers / reportData.customerReport.totalCustomers) * 100).toFixed(2) + '%'
            : '0%',
          averageCustomerValue: reportData.customerReport.totalCustomers > 0 
            ? (reportData.salesReport.totalRevenue / reportData.customerReport.totalCustomers).toFixed(2)
            : 0
        },
        topCustomers: reportData.customerReport.topCustomers.map((customer, index) => ({
          rank: index + 1,
          name: customer.name,
          totalSpent: customer.totalSpent,
          formattedTotalSpent: formatCurrency(customer.totalSpent),
          orderCount: customer.orderCount,
          averageOrderValue: customer.orderCount > 0 
            ? (customer.totalSpent / customer.orderCount).toFixed(2)
            : 0
        })),
        customerStatusDistribution: reportData.customerReport.customerStatus.map(item => ({
          status: item.status,
          count: item.count,
          percentage: ((item.count / reportData.customerReport.totalCustomers) * 100).toFixed(2) + '%'
        }))
      },
      serviceReport: {
        summary: {
          totalServices: reportData.serviceReport.topServices.length,
          totalServiceRevenue: reportData.serviceReport.topServices.reduce((sum, service) => sum + service.revenue, 0),
          averageServiceRevenue: reportData.serviceReport.topServices.length > 0 
            ? (reportData.serviceReport.topServices.reduce((sum, service) => sum + service.revenue, 0) / reportData.serviceReport.topServices.length).toFixed(2)
            : 0
        },
        topServices: reportData.serviceReport.topServices.map((service, index) => ({
          rank: index + 1,
          name: service.name,
          revenue: service.revenue,
          formattedRevenue: formatCurrency(service.revenue),
          orderCount: service.orderCount,
          averagePrice: service.orderCount > 0 
            ? (service.revenue / service.orderCount).toFixed(2)
            : 0
        })),
        servicePerformance: reportData.serviceReport.servicePerformance.map(service => ({
          name: service.name,
          revenue: service.revenue,
          formattedRevenue: formatCurrency(service.revenue),
          percentage: service.percentage.toFixed(2) + '%'
        }))
      },
      expenseReport: {
        summary: {
          totalExpenses: reportData.expenseReport.totalExpenses,
          formattedTotalExpenses: formatCurrency(reportData.expenseReport.totalExpenses),
          expenseRatio: reportData.salesReport.totalRevenue > 0 
            ? ((reportData.expenseReport.totalExpenses / reportData.salesReport.totalRevenue) * 100).toFixed(2) + '%'
            : '0%'
        },
        expensesByCategory: reportData.expenseReport.expensesByCategory.map(item => ({
          category: item.category,
          amount: item.amount,
          formattedAmount: formatCurrency(item.amount),
          percentage: ((item.amount / reportData.expenseReport.totalExpenses) * 100).toFixed(2) + '%'
        })),
        monthlyExpenses: reportData.expenseReport.monthlyExpenses.map(item => ({
          month: item.month,
          amount: item.amount,
          formattedAmount: formatCurrency(item.amount)
        }))
      },
      financialAnalysis: {
        profitability: {
          grossRevenue: reportData.salesReport.totalRevenue,
          totalExpenses: reportData.expenseReport.totalExpenses,
          netProfit: reportData.salesReport.totalRevenue - reportData.expenseReport.totalExpenses,
          profitMargin: reportData.salesReport.totalRevenue > 0 
            ? ((reportData.salesReport.totalRevenue - reportData.expenseReport.totalExpenses) / reportData.salesReport.totalRevenue * 100).toFixed(2) + '%'
            : '0%'
        },
        operationalMetrics: {
          ordersPerCustomer: reportData.customerReport.totalCustomers > 0 
            ? (reportData.salesReport.totalOrders / reportData.customerReport.totalCustomers).toFixed(2)
            : 0,
          revenuePerCustomer: reportData.customerReport.totalCustomers > 0 
            ? (reportData.salesReport.totalRevenue / reportData.customerReport.totalCustomers).toFixed(2)
            : 0,
          averageOrderValue: reportData.salesReport.averageOrderValue
        }
      }
    };

    // Create and download the file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Report exported successfully",
      description: `Comprehensive report downloaded as ${fileName}`,
    });
  };

  const exportReportsCSV = () => {
    if (!reportData) {
      toast({
        title: "No data to export",
        description: "Please wait for the reports to load before exporting.",
        variant: "destructive",
      });
      return;
    }

    const currentDate = new Date().toISOString().split('T')[0];
    const fileName = `econuru-business-report-${currentDate}.csv`;

    // Create simple, practical CSV content
    let csvContent = "Econuru Laundry Services - Business Report\n";
    csvContent += `Report Date: ${new Date().toLocaleDateString()}\n`;
    csvContent += `Period: Last ${dateRange} days\n\n`;

    // 1. SALES SUMMARY
    csvContent += "=== SALES SUMMARY ===\n";
    csvContent += "Total Revenue,KES " + reportData.salesReport.totalRevenue.toLocaleString() + "\n";
    csvContent += "Total Orders," + reportData.salesReport.totalOrders + "\n";
    csvContent += "Average Order Value,KES " + reportData.salesReport.averageOrderValue.toLocaleString() + "\n";
    csvContent += "Gross Revenue,KES " + (reportData.salesReport.grossRevenue || reportData.salesReport.totalRevenue).toLocaleString() + "\n\n";

    // 2. PICK & DROP SUMMARY
    csvContent += "=== PICK & DROP SUMMARY ===\n";
    csvContent += "Total Pick & Drop Revenue,KES " + (reportData.salesReport.totalPickDropAmount || 0).toLocaleString() + "\n";
    csvContent += "Orders with Pick & Drop," + (reportData.salesReport.totalPickDropAmount > 0 ? "Yes" : "No") + "\n\n";

    // 3. DISCOUNTS SUMMARY
    csvContent += "=== DISCOUNTS SUMMARY ===\n";
    csvContent += "Total Discounts Given,KES " + (reportData.salesReport.totalDiscounts || 0).toLocaleString() + "\n";
    csvContent += "Orders with Discounts," + (reportData.salesReport.totalDiscounts > 0 ? "Yes" : "No") + "\n\n";

    // 4. PROMOTIONS SUMMARY
    csvContent += "=== PROMOTIONS SUMMARY ===\n";
    csvContent += "Total Promotions Created," + (reportData.promotionReport?.totalPromotions || 0) + "\n";
    csvContent += "Active Promotions," + (reportData.promotionReport?.activePromotions || 0) + "\n";
    csvContent += "Total Promotion Value,KES " + (reportData.promotionReport?.totalPromotionValue || 0).toLocaleString() + "\n\n";

    // 5. SERVICES PERFORMANCE
    csvContent += "=== TOP SERVICES ===\n";
    csvContent += "Service Name,Revenue (KES),Orders,Quantity Sold,Average Price (KES)\n";
    reportData.serviceReport.topServices.forEach((service, index) => {
      csvContent += `${service.name},${service.revenue.toLocaleString()},${service.orderCount},${service.quantity || 0},${(service.averagePrice || 0).toLocaleString()}\n`;
    });
    csvContent += "\n";

    // 6. EXPENSES BREAKDOWN
    csvContent += "=== EXPENSES BREAKDOWN ===\n";
    csvContent += "Category,Amount (KES),Number of Expenses,Average per Expense (KES)\n";
    reportData.expenseReport.expensesByCategory.forEach(expense => {
      csvContent += `${expense.category},${expense.amount.toLocaleString()},${expense.count || 1},${(expense.averageAmount || expense.amount).toLocaleString()}\n`;
    });
    csvContent += "\n";

    // 7. MONTHLY REVENUE
    csvContent += "=== MONTHLY REVENUE ===\n";
    csvContent += "Month,Revenue (KES),Orders,Pick & Drop (KES),Discounts (KES)\n";
    reportData.salesReport.revenueByMonth.forEach(month => {
      csvContent += `${month.month},${month.revenue.toLocaleString()},${month.orders || 0},${(month.pickDrop || 0).toLocaleString()},${(month.discounts || 0).toLocaleString()}\n`;
    });
    csvContent += "\n";

    // 8. ORDER STATUS
    csvContent += "=== ORDER STATUS ===\n";
    csvContent += "Status,Count,Revenue (KES),Average Order Value (KES)\n";
    reportData.salesReport.ordersByStatus.forEach(status => {
      csvContent += `${status.status},${status.count},${status.revenue.toLocaleString()},${status.averageValue.toLocaleString()}\n`;
    });
    csvContent += "\n";

    // 9. PAYMENT STATUS
    csvContent += "=== PAYMENT STATUS ===\n";
    csvContent += "Status,Count,Total Amount (KES),Average Amount (KES)\n";
    reportData.paymentStatusAmountPie.forEach(payment => {
      const count = reportData.paymentStatusPie.find(p => p.status === payment.status)?.count || 0;
      const avgAmount = count > 0 ? payment.amount / count : 0;
      csvContent += `${payment.status},${count},${payment.amount.toLocaleString()},${avgAmount.toLocaleString()}\n`;
    });
    csvContent += "\n";

    // 10. M-PESA TRANSACTIONS SUMMARY
    csvContent += "=== M-PESA TRANSACTIONS SUMMARY ===\n";
    csvContent += "Total M-Pesa Transactions," + (reportData.mpesaReport?.totalTransactions || 0) + "\n";
    csvContent += "Total M-Pesa Amount,KES " + (reportData.mpesaReport?.totalAmount || 0).toLocaleString() + "\n";
    csvContent += "Average Transaction,KES " + (reportData.mpesaReport?.averageTransactionAmount || 0).toLocaleString() + "\n";
    csvContent += "Connection Rate," + (reportData.mpesaReport?.connectedTransactionsRate || 0).toFixed(1) + "%\n";
    csvContent += "\n";

    csvContent += "=== M-PESA STATUS BREAKDOWN ===\n";
    csvContent += "Status,Count,Amount (KES),Percentage by Count (%),Percentage by Amount (%)\n";
    csvContent += `Fully Paid,${reportData.mpesaReport?.fullyPaidCount || 0},${(reportData.mpesaReport?.fullyPaidAmount || 0).toLocaleString()},${reportData.mpesaReport?.totalTransactions ? ((reportData.mpesaReport.fullyPaidCount / reportData.mpesaReport.totalTransactions) * 100).toFixed(1) : '0'},${reportData.mpesaReport?.totalAmount ? ((reportData.mpesaReport.fullyPaidAmount / reportData.mpesaReport.totalAmount) * 100).toFixed(1) : '0'}\n`;
    csvContent += `Partial Payments,${reportData.mpesaReport?.partialCount || 0},${(reportData.mpesaReport?.partialAmount || 0).toLocaleString()},${reportData.mpesaReport?.totalTransactions ? ((reportData.mpesaReport.partialCount / reportData.mpesaReport.totalTransactions) * 100).toFixed(1) : '0'},${reportData.mpesaReport?.totalAmount ? ((reportData.mpesaReport.partialAmount / reportData.mpesaReport.totalAmount) * 100).toFixed(1) : '0'}\n`;
    csvContent += `Unpaid/Unmatched,${reportData.mpesaReport?.unpaidCount || 0},${(reportData.mpesaReport?.unpaidAmount || 0).toLocaleString()},${reportData.mpesaReport?.totalTransactions ? ((reportData.mpesaReport.unpaidCount / reportData.mpesaReport.totalTransactions) * 100).toFixed(1) : '0'},${reportData.mpesaReport?.totalAmount ? ((reportData.mpesaReport.unpaidAmount / reportData.mpesaReport.totalAmount) * 100).toFixed(1) : '0'}\n`;
    csvContent += "\n";

    csvContent += "=== MONTHLY M-PESA TRANSACTIONS ===\n";
    csvContent += "Month,Count,Amount (KES),Average Amount (KES)\n";
    (reportData.mpesaReport?.monthlyTransactions || []).forEach(month => {
      csvContent += `${month.month},${month.count},${month.amount.toLocaleString()},${month.averageAmount.toLocaleString()}\n`;
    });
    csvContent += "\n";

    // 11. TOP CUSTOMERS
    csvContent += "=== TOP CUSTOMERS ===\n";
    csvContent += "Rank,Customer Name,Total Spent (KES),Orders,Average Order (KES)\n";
    reportData.customerReport.topCustomers.forEach((customer, index) => {
      csvContent += `${index + 1},${customer.name},${customer.totalSpent.toLocaleString()},${customer.orderCount},${customer.averageOrderValue.toLocaleString()}\n`;
    });
    csvContent += "\n";

    // Create and download the file
    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Business Report exported successfully",
      description: `Simple business report downloaded as ${fileName}`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading reports...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="text-red-600 text-lg font-medium">Error Loading Reports</div>
          <div className="text-gray-600 text-center max-w-md">{error}</div>
          <Button onClick={fetchReportData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="text-gray-600 text-lg">No data available</div>
          <Button onClick={fetchReportData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Load Data
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={fetchReportData} variant="outline" size="sm" className="flex-1 sm:flex-none">
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">↻</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Export</span>
                  <span className="sm:hidden">↓</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportReportsExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                  <span className="ml-2 text-xs text-gray-500">(Complete Lists)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportReportsCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as CSV
                  <span className="ml-2 text-xs text-gray-500">(Summary)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportReports}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as JSON
                  <span className="ml-2 text-xs text-gray-500">(Raw Data)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{formatCurrency(reportData.salesReport.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {reportData.salesReport.totalOrders} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{formatNumber(reportData.salesReport.totalOrders)}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatCurrency(reportData.salesReport.averageOrderValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{formatNumber(reportData.customerReport.totalCustomers)}</div>
            <p className="text-xs text-muted-foreground">
              +{reportData.customerReport.newCustomers} new
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">M-Pesa Transactions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{formatNumber(reportData.mpesaReport?.totalTransactions || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(reportData.mpesaReport?.totalAmount || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{formatCurrency(reportData.expenseReport.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              Net: {formatCurrency(reportData.salesReport.totalRevenue - reportData.expenseReport.totalExpenses)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto sm:h-10">
          <TabsTrigger value="sales" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-0 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" />
            <span>Sales</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-0 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            <span>Customers</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-0 text-xs sm:text-sm">
            <Package className="h-4 w-4" />
            <span>Services</span>
          </TabsTrigger>
          <TabsTrigger value="mpesa" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-0 text-xs sm:text-sm">
            <DollarSign className="h-4 w-4" />
            <span>M-Pesa</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-0 text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4" />
            <span>Expenses</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Revenue by Month</CardTitle>
                <CardDescription className="text-sm">Monthly revenue breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {reportData.salesReport.revenueByMonth.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.month}</span>
                      <span className="text-sm font-bold">{formatCurrency(item.revenue)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Orders by Status</CardTitle>
                <CardDescription className="text-sm">Order status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: '200px', minHeight: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.salesReport.ordersByStatus}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {reportData.salesReport.ordersByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Orders by Payment Status (Count)</CardTitle>
                <CardDescription className="text-sm">Paid vs Unpaid vs Partial (by order count)</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: '200px', minHeight: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.paymentStatusPie}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {reportData.paymentStatusPie.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Orders by Payment Status (Amount)</CardTitle>
                <CardDescription className="text-sm">Paid vs Unpaid vs Partial (by total KES)</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: '200px', minHeight: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.paymentStatusAmountPie}
                        dataKey="amount"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {reportData.paymentStatusAmountPie.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={formatCurrency} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Top Customers</CardTitle>
                <CardDescription className="text-sm">Highest spending customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {reportData.customerReport.topCustomers.map((customer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{customer.name}</p>
                        <p className="text-sm text-gray-600">{customer.orderCount} orders</p>
                      </div>
                      <span className="font-bold text-sm sm:text-base ml-2">{formatCurrency(customer.totalSpent)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Customer Status Distribution</CardTitle>
                <CardDescription className="text-sm">Customer status breakdown and analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 sm:gap-6">
                  {/* Pie Chart */}
                  <div className="w-full lg:w-1/2 h-48 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportData.customerReport.customerStatus}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          fill="#8884d8"
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {reportData.customerReport.customerStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CUSTOMER_STATUS_COLORS[index % CUSTOMER_STATUS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name) => [`${value} customers`, name]}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Stats and Legend */}
                  <div className="w-full lg:w-1/2 space-y-4 sm:space-y-6">
                    {/* Key Stats */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                        <div className="text-lg sm:text-2xl font-bold text-gray-900">
                          {formatNumber(reportData.customerReport.totalCustomers)}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Total Customers</div>
                      </div>
                      <div className="text-center p-3 sm:p-4 bg-emerald-50 rounded-lg">
                        <div className="text-lg sm:text-2xl font-bold text-emerald-600">
                          {formatNumber(reportData.customerReport.newCustomers)}
                        </div>
                        <div className="text-xs sm:text-sm text-emerald-600">New This Period</div>
                      </div>
                    </div>

                    {/* Detailed Legend */}
                    <div className="space-y-2 sm:space-y-3">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Status Breakdown</h4>
                      {reportData.customerReport.customerStatus.map((item, index) => {
                        const percentage = ((item.count / reportData.customerReport.totalCustomers) * 100).toFixed(1);
                        return (
                          <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                              <div 
                                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: CUSTOMER_STATUS_COLORS[index % CUSTOMER_STATUS_COLORS.length] }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="font-medium capitalize text-gray-900 text-sm sm:text-base truncate">{item.status}</div>
                                <div className="text-xs sm:text-sm text-gray-500">{percentage}% of total</div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <div className="font-bold text-gray-900 text-sm sm:text-base">{formatNumber(item.count)}</div>
                              <div className="text-xs text-gray-500">customers</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Top Services</CardTitle>
                <CardDescription className="text-sm">Most popular services by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {reportData.serviceReport.topServices.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{service.name}</p>
                        <p className="text-sm text-gray-600">{service.orderCount} orders</p>
                      </div>
                      <span className="font-bold text-sm sm:text-base ml-2">{formatCurrency(service.revenue)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Service Performance</CardTitle>
                <CardDescription className="text-sm">Revenue contribution by service</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {reportData.serviceReport.servicePerformance.map((service, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{service.name}</span>
                        <span className="text-sm font-bold ml-2">{(service.percentage || 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${service.percentage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mpesa" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">M-Pesa Transaction Status</CardTitle>
                <CardDescription className="text-sm">Transaction status distribution by count</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: '200px', minHeight: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.mpesaReport?.statusDistribution || []}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label={({ name, percent }) => `${name.replace('_', ' ')}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {(reportData.mpesaReport?.statusDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">M-Pesa Transaction Amount Distribution</CardTitle>
                <CardDescription className="text-sm">Transaction status distribution by total amount (KES)</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: '200px', minHeight: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.mpesaReport?.statusAmountDistribution || []}
                        dataKey="amount"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label={({ name, percent }) => `${name.replace('_', ' ')}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {(reportData.mpesaReport?.statusAmountDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={formatCurrency} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Monthly M-Pesa Transactions</CardTitle>
                <CardDescription className="text-sm">M-Pesa transaction trends by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {(reportData.mpesaReport?.monthlyTransactions || []).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium">{item.month}</span>
                        <p className="text-xs text-gray-600">{item.count} transactions</p>
                      </div>
                      <span className="text-sm font-bold ml-2">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">M-Pesa Transaction Summary</CardTitle>
                <CardDescription className="text-sm">Key M-Pesa transaction metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                      <div className="text-lg font-bold text-emerald-600">
                        {formatNumber(reportData.mpesaReport?.fullyPaidCount || 0)}
                      </div>
                      <div className="text-xs text-emerald-600">Fully Paid</div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(reportData.mpesaReport?.fullyPaidAmount || 0)}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-lg font-bold text-yellow-600">
                        {formatNumber(reportData.mpesaReport?.partialCount || 0)}
                      </div>
                      <div className="text-xs text-yellow-600">Partial</div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(reportData.mpesaReport?.partialAmount || 0)}
                      </div>
                    </div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-lg font-bold text-red-600">
                      {formatNumber(reportData.mpesaReport?.unpaidCount || 0)}
                    </div>
                    <div className="text-xs text-red-600">Unpaid/Unmatched</div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(reportData.mpesaReport?.unpaidAmount || 0)}
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Connection Rate:</span>
                      <span className="text-sm font-bold">
                        {(reportData.mpesaReport?.connectedTransactionsRate || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Average Transaction:</span>
                      <span className="text-sm font-bold">
                        {formatCurrency(reportData.mpesaReport?.averageTransactionAmount || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* M-Pesa Transaction Details */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">M-Pesa Transaction Breakdown</CardTitle>
                <CardDescription className="text-sm">Detailed breakdown by confirmation status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(reportData.mpesaReport?.confirmationStatusBreakdown || []).map((item, index) => {
                    const percentage = reportData.mpesaReport?.totalTransactions 
                      ? ((item.count / reportData.mpesaReport.totalTransactions) * 100).toFixed(1) 
                      : '0';
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(item.status)}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Badge>
                          <span className="text-sm text-gray-600">{percentage}% of total</span>
                        </div>
                        <span className="font-bold">{formatNumber(item.count)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Action Items for M-Pesa */}
            {reportData.mpesaReport && (reportData.mpesaReport.unpaidCount > 0 || reportData.mpesaReport.partialCount > 0) && (
              <Card className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Badge variant="outline" className="bg-orange-50 text-orange-700">Action Required</Badge>
                    M-Pesa Transaction Management
                  </CardTitle>
                  <CardDescription className="text-sm">Transactions requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reportData.mpesaReport.unpaidCount > 0 && (
                      <div className="p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-red-800">
                              {reportData.mpesaReport.unpaidCount} Unmatched Transactions
                            </p>
                            <p className="text-sm text-red-600">
                              Total: {formatCurrency(reportData.mpesaReport.unpaidAmount)} requiring connection to orders
                            </p>
                          </div>
                          <Badge variant="destructive">High Priority</Badge>
                        </div>
                      </div>
                    )}
                    {reportData.mpesaReport.partialCount > 0 && (
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-yellow-800">
                              {reportData.mpesaReport.partialCount} Partial Payments
                            </p>
                            <p className="text-sm text-yellow-600">
                              Total: {formatCurrency(reportData.mpesaReport.partialAmount)} in partial payments
                            </p>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-800">Review</Badge>
                        </div>
                      </div>
                    )}
                    {reportData.mpesaReport.fullyPaidCount > 0 && (
                      <div className="p-3 bg-emerald-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-emerald-800">
                              {reportData.mpesaReport.fullyPaidCount} Successfully Connected
                            </p>
                            <p className="text-sm text-emerald-600">
                              Total: {formatCurrency(reportData.mpesaReport.fullyPaidAmount)} processed successfully
                            </p>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-800">Completed</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Expenses by Category</CardTitle>
                <CardDescription className="text-sm">Expense breakdown by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {reportData.expenseReport.expensesByCategory.map((expense, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium truncate">{expense.category}</span>
                      <span className="font-bold text-sm sm:text-base ml-2">{formatCurrency(expense.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Monthly Expenses</CardTitle>
                <CardDescription className="text-sm">Expense trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {reportData.expenseReport.monthlyExpenses.map((expense, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{expense.month}</span>
                      <span className="text-sm font-bold">{formatCurrency(expense.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 