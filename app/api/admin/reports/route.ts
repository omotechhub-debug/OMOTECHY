import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Customer from '@/lib/models/Customer';
import Expense from '@/lib/models/Expense';
import Service from '@/lib/models/Service';
import Promotion from '@/lib/models/Promotion';
import MpesaTransaction from '@/lib/models/MpesaTransaction';
import { requireAdmin } from '@/lib/auth';

// GET reports data
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30';
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '7':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '365':
        startDate.setDate(endDate.getDate() - 365);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Fetch orders within date range
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('customer');

    // Fetch customers
    const customers = await Customer.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Fetch expenses within date range
    const expenses = await Expense.find({
      date: { $gte: startDate, $lte: endDate }
    });

    // Fetch services
    const services = await Service.find({});

    // Fetch promotions within date range
    const promotions = await Promotion.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Fetch M-Pesa transactions within date range
    const mpesaTransactions = await MpesaTransaction.find({
      transactionDate: { $gte: startDate, $lte: endDate }
    }).populate('connectedOrderId');

    // Calculate sales report
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Additional sales metrics
    const totalPickDropAmount = orders.reduce((sum, order) => sum + (order.pickDropAmount || 0), 0);
    const totalDiscounts = orders.reduce((sum, order) => sum + (order.discount || 0), 0);
    const grossRevenue = totalRevenue + totalDiscounts - totalPickDropAmount;

    // Revenue by month
    const revenueByMonth = [];
    const months = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      months.unshift(monthName);
    }

    months.forEach(month => {
      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        const orderMonth = orderDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        return orderMonth === month;
      });
      const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const monthOrdersCount = monthOrders.length;
      const monthPickDrop = monthOrders.reduce((sum, order) => sum + (order.pickDropAmount || 0), 0);
      const monthDiscounts = monthOrders.reduce((sum, order) => sum + (order.discount || 0), 0);
      
      revenueByMonth.push({ 
        month, 
        revenue: monthRevenue,
        orders: monthOrdersCount,
        pickDrop: monthPickDrop,
        discounts: monthDiscounts
      });
    });

    // Orders by status
    const ordersByStatus = [];
    const statusCounts: { [key: string]: number } = {};
    const statusRevenue: { [key: string]: number } = {};
    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      statusRevenue[order.status] = (statusRevenue[order.status] || 0) + (order.totalAmount || 0);
    });
    Object.entries(statusCounts).forEach(([status, count]) => {
      ordersByStatus.push({ 
        status, 
        count,
        revenue: statusRevenue[status] || 0,
        averageValue: count > 0 ? (statusRevenue[status] || 0) / count : 0
      });
    });

    // Customer report
    const totalCustomers = customers.length;
    const newCustomers = customers.filter(customer => {
      const customerDate = new Date(customer.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return customerDate >= weekAgo;
    }).length;

    // Enhanced customer analytics
    const customerOrderStats = {};
    orders.forEach(order => {
      const customerId = order.customer?._id?.toString() || order.customer?.toString();
      if (customerId) {
        if (!customerOrderStats[customerId]) {
          customerOrderStats[customerId] = {
            totalSpent: 0,
            orderCount: 0,
            averageOrderValue: 0,
            lastOrderDate: null,
            firstOrderDate: null
          };
        }
        customerOrderStats[customerId].totalSpent += order.totalAmount || 0;
        customerOrderStats[customerId].orderCount += 1;
        const orderDate = new Date(order.createdAt);
        if (!customerOrderStats[customerId].firstOrderDate || orderDate < customerOrderStats[customerId].firstOrderDate) {
          customerOrderStats[customerId].firstOrderDate = orderDate;
        }
        if (!customerOrderStats[customerId].lastOrderDate || orderDate > customerOrderStats[customerId].lastOrderDate) {
          customerOrderStats[customerId].lastOrderDate = orderDate;
        }
      }
    });

    // Calculate average order values for customers
    Object.keys(customerOrderStats).forEach(customerId => {
      const stats = customerOrderStats[customerId];
      stats.averageOrderValue = stats.orderCount > 0 ? stats.totalSpent / stats.orderCount : 0;
    });

    // Top customers by total spent
    const topCustomers = customers
      .map(customer => {
        const stats = customerOrderStats[customer._id.toString()] || {
          totalSpent: 0,
          orderCount: 0,
          averageOrderValue: 0
        };
        return {
          name: customer.name || 'Unknown',
          email: customer.email || '',
          phone: customer.phone || '',
          totalSpent: stats.totalSpent,
          orderCount: stats.orderCount,
          averageOrderValue: stats.averageOrderValue,
          lastOrderDate: stats.lastOrderDate,
          firstOrderDate: stats.firstOrderDate
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Customer status distribution
    const customerStatus = [];
    const statusCountsCustomer: { [key: string]: number } = {};
    customers.forEach(customer => {
      statusCountsCustomer[customer.status] = (statusCountsCustomer[customer.status] || 0) + 1;
    });
    Object.entries(statusCountsCustomer).forEach(([status, count]) => {
      customerStatus.push({ status, count });
    });

    // Customer retention metrics
    const repeatCustomers = Object.values(customerOrderStats).filter(stats => stats.orderCount > 1).length;
    const customerRetentionRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers * 100) : 0;

    // Expense report
    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

    // Expenses by category
    const expensesByCategory = [];
    const categoryCounts: { [key: string]: number } = {};
    const categoryExpenseCounts: { [key: string]: number } = {};
    expenses.forEach(expense => {
      categoryCounts[expense.category] = (categoryCounts[expense.category] || 0) + (expense.amount || 0);
      categoryExpenseCounts[expense.category] = (categoryExpenseCounts[expense.category] || 0) + 1;
    });
    Object.entries(categoryCounts).forEach(([category, amount]) => {
      expensesByCategory.push({ 
        category, 
        amount,
        count: categoryExpenseCounts[category] || 0,
        averageAmount: (categoryExpenseCounts[category] || 0) > 0 ? amount / (categoryExpenseCounts[category] || 0) : 0
      });
    });

    // Monthly expenses
    const monthlyExpenses = [];
    months.forEach(month => {
      const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        const expenseMonth = expenseDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        return expenseMonth === month;
      });
      const monthAmount = monthExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      const monthExpenseCount = monthExpenses.length;
      monthlyExpenses.push({ 
        month, 
        amount: monthAmount,
        count: monthExpenseCount,
        averageAmount: monthExpenseCount > 0 ? monthAmount / monthExpenseCount : 0
      });
    });

    // Service report
    const serviceStats: { [key: string]: { revenue: number; orderCount: number; quantity: number; averagePrice: number } } = {};
    
    orders.forEach(order => {
      order.services.forEach(service => {
        if (!serviceStats[service.serviceName]) {
          serviceStats[service.serviceName] = { 
            revenue: 0, 
            orderCount: 0, 
            quantity: 0,
            averagePrice: 0
          };
        }
        const servicePrice = parseFloat(service.price) || 0;
        const serviceQuantity = service.quantity || 0;
        serviceStats[service.serviceName].revenue += servicePrice * serviceQuantity;
        serviceStats[service.serviceName].orderCount += 1;
        serviceStats[service.serviceName].quantity += serviceQuantity;
      });
    });

    // Calculate average prices for services
    Object.keys(serviceStats).forEach(serviceName => {
      const stats = serviceStats[serviceName];
      stats.averagePrice = stats.quantity > 0 ? stats.revenue / stats.quantity : 0;
    });

    const topServices = Object.entries(serviceStats)
      .map(([name, stats]) => ({
        name,
        revenue: stats.revenue,
        orderCount: stats.orderCount,
        quantity: stats.quantity,
        averagePrice: stats.averagePrice
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);

    // Service performance (percentage of total revenue)
    const servicePerformance = Object.entries(serviceStats)
      .map(([name, stats]) => ({
        name,
        revenue: stats.revenue || 0,
        percentage: totalRevenue > 0 ? ((stats.revenue || 0) / totalRevenue) * 100 : 0,
        orderCount: stats.orderCount,
        quantity: stats.quantity,
        averagePrice: stats.averagePrice
      }))
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0));

    // Payment status distribution (count)
    const paymentStatusCounts = {};
    const paymentStatusAmounts = {};
    const paymentStatusDetails = {};
    orders.forEach(order => {
      const status = order.paymentStatus || 'unpaid';
      paymentStatusCounts[status] = (paymentStatusCounts[status] || 0) + 1;
      paymentStatusAmounts[status] = (paymentStatusAmounts[status] || 0) + (order.totalAmount || 0);
      
      if (!paymentStatusDetails[status]) {
        paymentStatusDetails[status] = {
          count: 0,
          amount: 0,
          averageAmount: 0,
          orders: []
        };
      }
      paymentStatusDetails[status].count += 1;
      paymentStatusDetails[status].amount += order.totalAmount || 0;
      paymentStatusDetails[status].orders.push({
        orderNumber: order.orderNumber,
        amount: order.totalAmount || 0,
        customerName: order.customer?.name || 'Unknown',
        createdAt: order.createdAt
      });
    });

    // Calculate average amounts for payment statuses
    Object.keys(paymentStatusDetails).forEach(status => {
      const details = paymentStatusDetails[status];
      details.averageAmount = details.count > 0 ? details.amount / details.count : 0;
    });

    const paymentStatusPie = Object.entries(paymentStatusCounts).map(([status, count]) => ({ status, count }));
    const paymentStatusAmountPie = Object.entries(paymentStatusAmounts).map(([status, amount]) => ({ status, amount }));

    // Additional analytics
    const orderTrends = {
      dailyOrders: {},
      weeklyOrders: {},
      monthlyOrders: {}
    };

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const dayKey = orderDate.toISOString().split('T')[0];
      const weekKey = `${orderDate.getFullYear()}-W${Math.ceil((orderDate.getDate() + new Date(orderDate.getFullYear(), orderDate.getMonth(), 1).getDay()) / 7)}`;
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;

      orderTrends.dailyOrders[dayKey] = (orderTrends.dailyOrders[dayKey] || 0) + 1;
      orderTrends.weeklyOrders[weekKey] = (orderTrends.weeklyOrders[weekKey] || 0) + 1;
      orderTrends.monthlyOrders[monthKey] = (orderTrends.monthlyOrders[monthKey] || 0) + 1;
    });

    // Financial metrics
    const financialMetrics = {
      grossRevenue,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100) : 0,
      expenseRatio: totalRevenue > 0 ? (totalExpenses / totalRevenue * 100) : 0,
      totalPickDropAmount,
      totalDiscounts,
      averageOrderValue,
      customerRetentionRate,
      repeatCustomers,
      totalCustomers
    };

    // Promotion analysis
    const promotionReport = {
      totalPromotions: promotions.length,
      activePromotions: promotions.filter(promo => promo.isActive).length,
      promotionsByType: promotions.reduce((acc, promo) => {
        const type = promo.type || 'general';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      totalPromotionValue: promotions.reduce((sum, promo) => sum + (promo.discountAmount || 0), 0),
      promotions: promotions.map(promo => ({
        title: promo.title,
        type: promo.type,
        discountAmount: promo.discountAmount,
        discountPercentage: promo.discountPercentage,
        isActive: promo.isActive,
        startDate: promo.startDate,
        endDate: promo.endDate,
        createdAt: promo.createdAt
      }))
    };

    // M-Pesa Transaction Analysis
    const totalMpesaTransactions = mpesaTransactions.length;
    const totalMpesaAmount = mpesaTransactions.reduce((sum, transaction) => sum + (transaction.amountPaid || 0), 0);
    
    // Categorize M-Pesa transactions by connection status
    const fullyPaidMpesa = mpesaTransactions.filter(transaction => 
      transaction.isConnectedToOrder && transaction.confirmationStatus === 'confirmed'
    );
    const partialMpesa = mpesaTransactions.filter(transaction => 
      transaction.isConnectedToOrder && 
      transaction.confirmationStatus === 'confirmed' && 
      transaction.connectedOrderId && 
      orders.find(order => order._id.toString() === transaction.connectedOrderId?.toString())?.paymentStatus === 'partial'
    );
    const unpaidMpesa = mpesaTransactions.filter(transaction => 
      !transaction.isConnectedToOrder || 
      transaction.confirmationStatus === 'pending' || 
      transaction.confirmationStatus === 'rejected'
    );

    // M-Pesa transaction status distribution
    const mpesaStatusCounts = {
      'fully_paid': fullyPaidMpesa.length,
      'partial': partialMpesa.length,
      'unpaid': unpaidMpesa.length
    };
    
    const mpesaStatusAmounts = {
      'fully_paid': fullyPaidMpesa.reduce((sum, transaction) => sum + (transaction.amountPaid || 0), 0),
      'partial': partialMpesa.reduce((sum, transaction) => sum + (transaction.amountPaid || 0), 0),
      'unpaid': unpaidMpesa.reduce((sum, transaction) => sum + (transaction.amountPaid || 0), 0)
    };

    const mpesaStatusPie = Object.entries(mpesaStatusCounts).map(([status, count]) => ({ status, count }));
    const mpesaStatusAmountPie = Object.entries(mpesaStatusAmounts).map(([status, amount]) => ({ status, amount }));

    // Monthly M-Pesa transactions
    const monthlyMpesaTransactions = [];
    months.forEach(month => {
      const monthTransactions = mpesaTransactions.filter(transaction => {
        const transactionDate = new Date(transaction.transactionDate);
        const transactionMonth = transactionDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        return transactionMonth === month;
      });
      const monthAmount = monthTransactions.reduce((sum, transaction) => sum + (transaction.amountPaid || 0), 0);
      const monthCount = monthTransactions.length;
      monthlyMpesaTransactions.push({ 
        month, 
        amount: monthAmount,
        count: monthCount,
        averageAmount: monthCount > 0 ? monthAmount / monthCount : 0
      });
    });

    // M-Pesa confirmation status breakdown
    const mpesaConfirmationStatus = {};
    mpesaTransactions.forEach(transaction => {
      const status = transaction.confirmationStatus || 'pending';
      mpesaConfirmationStatus[status] = (mpesaConfirmationStatus[status] || 0) + 1;
    });

    const mpesaReport = {
      totalTransactions: totalMpesaTransactions,
      totalAmount: totalMpesaAmount,
      averageTransactionAmount: totalMpesaTransactions > 0 ? totalMpesaAmount / totalMpesaTransactions : 0,
      fullyPaidCount: fullyPaidMpesa.length,
      partialCount: partialMpesa.length,
      unpaidCount: unpaidMpesa.length,
      fullyPaidAmount: mpesaStatusAmounts.fully_paid,
      partialAmount: mpesaStatusAmounts.partial,
      unpaidAmount: mpesaStatusAmounts.unpaid,
      monthlyTransactions: monthlyMpesaTransactions,
      statusDistribution: mpesaStatusPie,
      statusAmountDistribution: mpesaStatusAmountPie,
      confirmationStatusBreakdown: Object.entries(mpesaConfirmationStatus).map(([status, count]) => ({ status, count })),
      connectedTransactionsRate: totalMpesaTransactions > 0 ? (fullyPaidMpesa.length / totalMpesaTransactions * 100) : 0
    };

    // Detailed data for Excel export
    const detailedExpensesList = expenses.map(expense => ({
      id: expense._id,
      description: expense.description || 'No description',
      category: expense.category,
      amount: expense.amount || 0,
      date: expense.date,
      createdAt: expense.createdAt,
      formattedAmount: expense.amount?.toLocaleString('en-KE', { style: 'currency', currency: 'KES' }) || 'KES 0',
      formattedDate: new Date(expense.date).toLocaleDateString('en-KE'),
      formattedCreatedAt: new Date(expense.createdAt).toLocaleDateString('en-KE')
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const detailedOrdersList = orders.map(order => ({
      id: order._id,
      orderNumber: order.orderNumber || 'N/A',
      customerName: order.customer?.name || 'Unknown Customer',
      customerEmail: order.customer?.email || 'N/A',
      customerPhone: order.customer?.phone || 'N/A',
      status: order.status || 'pending',
      paymentStatus: order.paymentStatus || 'unpaid',
      totalAmount: order.totalAmount || 0,
      pickDropAmount: order.pickDropAmount || 0,
      discount: order.discount || 0,
      netAmount: (order.totalAmount || 0) - (order.discount || 0),
      servicesCount: order.services?.length || 0,
      servicesNames: order.services?.map(s => s.serviceName).join(', ') || 'No services',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      formattedTotalAmount: (order.totalAmount || 0).toLocaleString('en-KE', { style: 'currency', currency: 'KES' }),
      formattedPickDropAmount: (order.pickDropAmount || 0).toLocaleString('en-KE', { style: 'currency', currency: 'KES' }),
      formattedDiscount: (order.discount || 0).toLocaleString('en-KE', { style: 'currency', currency: 'KES' }),
      formattedNetAmount: ((order.totalAmount || 0) - (order.discount || 0)).toLocaleString('en-KE', { style: 'currency', currency: 'KES' }),
      formattedCreatedAt: new Date(order.createdAt).toLocaleDateString('en-KE'),
      formattedUpdatedAt: new Date(order.updatedAt).toLocaleDateString('en-KE')
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unpaidOrdersList = orders
      .filter(order => order.paymentStatus === 'unpaid' || order.paymentStatus === 'partial')
      .map(order => ({
        id: order._id,
        orderNumber: order.orderNumber || 'N/A',
        customerName: order.customer?.name || 'Unknown Customer',
        customerEmail: order.customer?.email || 'N/A',
        customerPhone: order.customer?.phone || 'N/A',
        status: order.status || 'pending',
        paymentStatus: order.paymentStatus || 'unpaid',
        totalAmount: order.totalAmount || 0,
        amountPaid: order.amountPaid || 0,
        amountDue: (order.totalAmount || 0) - (order.amountPaid || 0),
        pickDropAmount: order.pickDropAmount || 0,
        discount: order.discount || 0,
        servicesNames: order.services?.map(s => s.serviceName).join(', ') || 'No services',
        daysPending: Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        formattedTotalAmount: (order.totalAmount || 0).toLocaleString('en-KE', { style: 'currency', currency: 'KES' }),
        formattedAmountPaid: (order.amountPaid || 0).toLocaleString('en-KE', { style: 'currency', currency: 'KES' }),
        formattedAmountDue: ((order.totalAmount || 0) - (order.amountPaid || 0)).toLocaleString('en-KE', { style: 'currency', currency: 'KES' }),
        formattedPickDropAmount: (order.pickDropAmount || 0).toLocaleString('en-KE', { style: 'currency', currency: 'KES' }),
        formattedDiscount: (order.discount || 0).toLocaleString('en-KE', { style: 'currency', currency: 'KES' }),
        formattedCreatedAt: new Date(order.createdAt).toLocaleDateString('en-KE'),
        formattedUpdatedAt: new Date(order.updatedAt).toLocaleDateString('en-KE')
      }))
      .sort((a, b) => b.daysPending - a.daysPending);

    const reportData = {
      salesReport: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        revenueByMonth,
        ordersByStatus,
        grossRevenue,
        totalPickDropAmount,
        totalDiscounts
      },
      customerReport: {
        totalCustomers,
        newCustomers,
        topCustomers,
        customerStatus,
        customerRetentionRate,
        repeatCustomers
      },
      expenseReport: {
        totalExpenses,
        expensesByCategory,
        monthlyExpenses
      },
      serviceReport: {
        topServices,
        servicePerformance
      },
      promotionReport,
      paymentStatusPie,
      paymentStatusAmountPie,
      paymentStatusDetails,
      orderTrends,
      financialMetrics,
      mpesaReport,
      // Detailed lists for Excel export
      detailedData: {
        expensesList: detailedExpensesList,
        ordersList: detailedOrdersList,
        unpaidOrdersList: unpaidOrdersList,
        totalUnpaidAmount: unpaidOrdersList.reduce((sum, order) => sum + order.amountDue, 0),
        unpaidOrdersCount: unpaidOrdersList.length,
        // M-Pesa transaction detailed lists
        mpesaTransactionsList: mpesaTransactions.map(transaction => ({
          id: transaction._id,
          transactionId: transaction.transactionId,
          mpesaReceiptNumber: transaction.mpesaReceiptNumber,
          customerName: transaction.customerName,
          phoneNumber: transaction.phoneNumber,
          amountPaid: transaction.amountPaid || 0,
          transactionType: transaction.transactionType,
          billRefNumber: transaction.billRefNumber || '',
          isConnectedToOrder: transaction.isConnectedToOrder,
          connectedOrderId: transaction.connectedOrderId?.toString() || '',
          confirmationStatus: transaction.confirmationStatus,
          pendingOrderId: transaction.pendingOrderId?.toString() || '',
          confirmedCustomerName: transaction.confirmedCustomerName || '',
          confirmationNotes: transaction.confirmationNotes || '',
          paymentCompletedAt: transaction.paymentCompletedAt,
          transactionDate: transaction.transactionDate,
          createdAt: transaction.createdAt,
          formattedAmount: (transaction.amountPaid || 0).toLocaleString('en-KE', { style: 'currency', currency: 'KES' }),
          formattedTransactionDate: new Date(transaction.transactionDate).toLocaleDateString('en-KE'),
          formattedPaymentCompletedAt: new Date(transaction.paymentCompletedAt).toLocaleDateString('en-KE'),
          formattedCreatedAt: new Date(transaction.createdAt).toLocaleDateString('en-KE')
        })).sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()),
        fullyPaidMpesaList: fullyPaidMpesa.map(transaction => ({
          id: transaction._id,
          transactionId: transaction.transactionId,
          mpesaReceiptNumber: transaction.mpesaReceiptNumber,
          customerName: transaction.customerName,
          phoneNumber: transaction.phoneNumber,
          amountPaid: transaction.amountPaid || 0,
          connectedOrderId: transaction.connectedOrderId?.toString() || '',
          confirmationStatus: transaction.confirmationStatus,
          confirmedCustomerName: transaction.confirmedCustomerName || '',
          transactionDate: transaction.transactionDate,
          formattedAmount: (transaction.amountPaid || 0).toLocaleString('en-KE', { style: 'currency', currency: 'KES' }),
          formattedTransactionDate: new Date(transaction.transactionDate).toLocaleDateString('en-KE')
        })).sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()),
        partialMpesaList: partialMpesa.map(transaction => ({
          id: transaction._id,
          transactionId: transaction.transactionId,
          mpesaReceiptNumber: transaction.mpesaReceiptNumber,
          customerName: transaction.customerName,
          phoneNumber: transaction.phoneNumber,
          amountPaid: transaction.amountPaid || 0,
          connectedOrderId: transaction.connectedOrderId?.toString() || '',
          confirmationStatus: transaction.confirmationStatus,
          confirmedCustomerName: transaction.confirmedCustomerName || '',
          transactionDate: transaction.transactionDate,
          formattedAmount: (transaction.amountPaid || 0).toLocaleString('en-KE', { style: 'currency', currency: 'KES' }),
          formattedTransactionDate: new Date(transaction.transactionDate).toLocaleDateString('en-KE')
        })).sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()),
        unpaidMpesaList: unpaidMpesa.map(transaction => ({
          id: transaction._id,
          transactionId: transaction.transactionId,
          mpesaReceiptNumber: transaction.mpesaReceiptNumber,
          customerName: transaction.customerName,
          phoneNumber: transaction.phoneNumber,
          amountPaid: transaction.amountPaid || 0,
          confirmationStatus: transaction.confirmationStatus,
          pendingOrderId: transaction.pendingOrderId?.toString() || '',
          billRefNumber: transaction.billRefNumber || '',
          confirmationNotes: transaction.confirmationNotes || '',
          transactionDate: transaction.transactionDate,
          daysPending: Math.floor((new Date().getTime() - new Date(transaction.transactionDate).getTime()) / (1000 * 60 * 60 * 24)),
          formattedAmount: (transaction.amountPaid || 0).toLocaleString('en-KE', { style: 'currency', currency: 'KES' }),
          formattedTransactionDate: new Date(transaction.transactionDate).toLocaleDateString('en-KE')
        })).sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()),
        totalMpesaAmount: totalMpesaAmount,
        totalMpesaTransactions: totalMpesaTransactions
      }
    };

    return NextResponse.json(reportData);

  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}); 