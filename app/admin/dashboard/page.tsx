"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  TrendingUp,
  Users,
  ShoppingBag,
  DollarSign,
  Calendar,
  Star,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Building,
} from "lucide-react"
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChartContainer } from '@/components/ui/chart';

export default function AdminDashboard() {
  const { user, refreshUserData } = useAuth();
  const [allTime, setAllTime] = useState({
    revenue: 0,
    orders: 0,
    clients: 0,
    expenses: 0,
    revenueChange: '',
    ordersChange: '',
    clientsChange: '',
    expensesChange: '',
    revenueChangeType: '',
    ordersChangeType: '',
    clientsChangeType: '',
    expensesChangeType: '',
  });
  const [monthly, setMonthly] = useState({
    income: 0,
    expenses: 0,
    unpaid: 0,
    profit: 0,
    dailyProfit: 0,
    incomeChange: '',
    expensesChange: '',
    unpaidChange: '',
    profitChange: '',
    incomeChangeType: '',
    expensesChangeType: '',
    unpaidChangeType: '',
    profitChangeType: '',
  });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);
  const [serviceStats, setServiceStats] = useState([]);
  const [stationInfo, setStationInfo] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // Fetch station information if user has one
      if (user?.stationId || (user?.managedStations && user.managedStations.length > 0)) {
        try {
          const stationId = user.stationId || user.managedStations[0];
          const token = localStorage.getItem('authToken');
          const stationRes = await fetch(`/api/stations/${stationId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (stationRes.ok) {
            const stationData = await stationRes.json();
            setStationInfo(stationData.station);
          }
        } catch (error) {
          console.error('Error fetching station info:', error);
        }
      }
      
      // Fetch orders
      const ordersRes = await fetch('/api/orders');
      const ordersData = await ordersRes.json();
      const orders = ordersData.orders || [];
      // Fetch expenses
      const expensesRes = await fetch('/api/expenses');
      const expensesData = await expensesRes.json();
      const expenses = expensesData.expenses || [];
      // Fetch services
      const servicesRes = await fetch('/api/services');
      const servicesData = await servicesRes.json();
      const services = servicesData.services || [];

      // Yearly metrics
      const now = new Date();
      const thisYear = now.getFullYear();
      const lastYear = thisYear - 1;
      // This year
      const yearOrders = orders.filter(o => new Date(o.createdAt).getFullYear() === thisYear);
      const yearPaidOrders = yearOrders.filter(o => o.paymentStatus === 'paid');
      const yearRevenue = yearPaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const yearClients = new Set(yearOrders.map(o => o.customer?.phone || o.customer?.email)).size;
      const yearExpenses = expenses.filter(e => new Date(e.date).getFullYear() === thisYear).reduce((sum, e) => sum + (e.amount || 0), 0);
      // Last year
      const lastYearOrders = orders.filter(o => new Date(o.createdAt).getFullYear() === lastYear);
      const lastYearPaidOrders = lastYearOrders.filter(o => o.paymentStatus === 'paid');
      const lastYearRevenue = lastYearPaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const lastYearClients = new Set(lastYearOrders.map(o => o.customer?.phone || o.customer?.email)).size;
      const lastYearExpenses = expenses.filter(e => new Date(e.date).getFullYear() === lastYear).reduce((sum, e) => sum + (e.amount || 0), 0);

      // Monthly metrics
      const thisMonth = now.getMonth();
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
      // This month
      const monthOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      });
      const monthIncome = monthOrders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const monthUnpaid = monthOrders.filter(o => o.paymentStatus !== 'paid').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const monthExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).reduce((sum, e) => sum + (e.amount || 0), 0);
      // Last month
      const lastMonthOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      });
      const lastMonthIncome = lastMonthOrders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const lastMonthUnpaid = lastMonthOrders.filter(o => o.paymentStatus !== 'paid').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const lastMonthExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      }).reduce((sum, e) => sum + (e.amount || 0), 0);

      // Daily profit
      const todayStr = now.toISOString().slice(0, 10);
      const todayIncome = monthOrders.filter(o => o.paymentStatus === 'paid' && o.createdAt.slice(0,10) === todayStr).reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const todayExpenses = expenses.filter(e => e.date.slice(0,10) === todayStr).reduce((sum, e) => sum + (e.amount || 0), 0);
      const dailyProfit = todayIncome - todayExpenses;
      // Monthly profit
      const monthProfit = monthIncome - monthExpenses;
      const lastMonthProfit = lastMonthIncome - lastMonthExpenses;

      // Percentage change helpers
      function percentChange(current, prev) {
        if (prev === 0) return current === 0 ? '0%' : 'N/A';
        const change = ((current - prev) / prev) * 100;
        return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
      }
      function changeType(current, prev) {
        if (prev === 0) return current >= 0 ? 'positive' : 'negative';
        return current - prev >= 0 ? 'positive' : 'negative';
      }

      setAllTime({
        revenue: yearRevenue,
        orders: yearOrders.length,
        clients: yearClients,
        expenses: yearExpenses,
        revenueChange: percentChange(yearRevenue, lastYearRevenue),
        ordersChange: percentChange(yearOrders.length, lastYearOrders.length),
        clientsChange: percentChange(yearClients, lastYearClients),
        expensesChange: percentChange(yearExpenses, lastYearExpenses),
        revenueChangeType: changeType(yearRevenue, lastYearRevenue),
        ordersChangeType: changeType(yearOrders.length, lastYearOrders.length),
        clientsChangeType: changeType(yearClients, lastYearClients),
        expensesChangeType: changeType(yearExpenses, lastYearExpenses),
      });
      setMonthly({
        income: monthIncome,
        expenses: monthExpenses,
        unpaid: monthUnpaid,
        profit: monthProfit,
        dailyProfit,
        incomeChange: percentChange(monthIncome, lastMonthIncome),
        expensesChange: percentChange(monthExpenses, lastMonthExpenses),
        unpaidChange: percentChange(monthUnpaid, lastMonthUnpaid),
        profitChange: percentChange(monthProfit, lastMonthProfit),
        incomeChangeType: changeType(monthIncome, lastMonthIncome),
        expensesChangeType: changeType(monthExpenses, lastMonthExpenses),
        unpaidChangeType: changeType(monthUnpaid, lastMonthUnpaid),
        profitChangeType: changeType(monthProfit, lastMonthProfit),
      });

      // 1. Recent Orders
      const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const latestOrders = sortedOrders.slice(0, 5).map(o => ({
        id: o.orderNumber || o._id,
        customer: o.customer?.name || o.customer?.email || o.customer?.phone || 'Unknown',
        service: o.services && o.services.length > 0 ? o.services[0].serviceName : 'N/A',
        amount: o.totalAmount ? `Ksh ${o.totalAmount.toLocaleString()}` : 'N/A',
        status: o.status || o.paymentStatus || 'unknown',
        date: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '',
      }));
      setRecentOrders(latestOrders);

      // 2. Service Distribution (this month)
      const monthServiceCounts = {};
      monthOrders.forEach(o => {
        (o.services || []).forEach(s => {
          if (!monthServiceCounts[s.serviceName]) monthServiceCounts[s.serviceName] = 0;
          monthServiceCounts[s.serviceName] += 1;
        });
      });
      const totalServiceOrders = Object.values(monthServiceCounts).reduce((a, b) => a + b, 0);
      const serviceStatsArr = Object.entries(monthServiceCounts).map(([name, count]) => ({
        name,
        value: totalServiceOrders ? Math.round((count / totalServiceOrders) * 100) : 0,
      })).sort((a, b) => b.value - a.value);
      setServiceStats(serviceStatsArr);

      setLoading(false);
    }
    fetchData();
  }, [user]);

  const statCards = [
    {
      title: "Revenue This Year",
      value: `$${allTime.revenue.toLocaleString()}`,
      change: allTime.revenueChange,
      changeType: allTime.revenueChangeType,
      icon: <DollarSign className="w-6 h-6" />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      vsText: "vs last year",
    },
    {
      title: "Orders This Year",
      value: allTime.orders.toLocaleString(),
      change: allTime.ordersChange,
      changeType: allTime.ordersChangeType,
      icon: <ShoppingBag className="w-6 h-6" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      vsText: "vs last year",
    },
    {
      title: "Clients This Year",
      value: allTime.clients.toLocaleString(),
      change: allTime.clientsChange,
      changeType: allTime.clientsChangeType,
      icon: <Users className="w-6 h-6" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      vsText: "vs last year",
    },
    {
      title: "Expenses This Year",
      value: `$${allTime.expenses ? allTime.expenses.toLocaleString() : '0'}`,
      change: allTime.expensesChange,
      changeType: allTime.expensesChangeType,
      icon: <Star className="w-6 h-6" />,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      vsText: "vs last year",
    },
  ]

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-emerald-500 text-white";
      case "processing":
        return "bg-blue-500 text-white";
      case "pickup":
        return "bg-amber-500 text-white";
      case "delivery":
        return "bg-purple-500 text-white";
      case "confirmed":
        return "bg-sky-500 text-white";
      case "cancelled":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  const serviceStatsArr = [
    { name: "Dry Cleaning", value: 45, color: "bg-primary" },
    { name: "Wash & Fold", value: 30, color: "bg-accent" },
    { name: "Luxury Care", value: 15, color: "bg-purple-500" },
    { name: "Business Attire", value: 10, color: "bg-blue-500" },
  ]

  const statCardClass = "luxury-card flex justify-between items-center p-6 min-h-[120px]";

  // Add monthlyCards array for monthly stats with change and vsText
  const monthlyCards = [
    {
      title: "Month Income",
      value: `Ksh ${monthly.income.toLocaleString()}`,
      change: monthly.incomeChange,
      changeType: monthly.incomeChangeType,
      icon: <DollarSign className="w-6 h-6 text-emerald-600" />,
      bgColor: "bg-emerald-50",
      vsText: "vs last month",
    },
    {
      title: "Month Expenses",
      value: `Ksh ${monthly.expenses.toLocaleString()}`,
      change: monthly.expensesChange,
      changeType: monthly.expensesChangeType,
      icon: <ShoppingBag className="w-6 h-6 text-red-600" />,
      bgColor: "bg-red-50",
      vsText: "vs last month",
    },
    {
      title: "Month Unpaid Laundry",
      value: `Ksh ${monthly.unpaid.toLocaleString()}`,
      change: monthly.unpaidChange,
      changeType: monthly.unpaidChangeType,
      icon: <Users className="w-6 h-6 text-yellow-600" />,
      bgColor: "bg-yellow-50",
      vsText: "vs last month",
    },
    {
      title: "Month Profit/Loss",
      value: `Ksh ${monthly.profit.toLocaleString()}`,
      change: monthly.profitChange,
      changeType: monthly.profitChangeType,
      icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
      bgColor: "bg-blue-50",
      vsText: "vs last month",
      daily: `Ksh ${monthly.dailyProfit.toLocaleString()}`,
      dailyType: monthly.dailyProfit >= 0 ? "positive" : "negative",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.name || 'Manager'}!
          </h1>
          <p className="text-text-light">
            {stationInfo ? (
              <>Managing <span className="font-semibold text-primary">{stationInfo.name}</span> - {stationInfo.location}</>
            ) : user?.role === 'superadmin' ? (
              "Full system access - Manage all stations and business operations"
            ) : (
              "You are not currently assigned to any station. Contact your administrator for station access."
            )}
          </p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button variant="outline" className="rounded-xl">
            <Calendar className="mr-2 w-4 h-4" />
            Last 30 days
          </Button>
          <Button className="bg-accent hover:bg-accent/90 text-white rounded-xl">Export Report</Button>
        </div>
      </div>

      {/* Station Information Card */}
      {stationInfo ? (
        <Card className="luxury-card bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Building className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary">{stationInfo.name}</h3>
                  <p className="text-text-light">{stationInfo.location}</p>
                  <p className="text-sm text-text-light">
                    Station ID: {stationInfo._id?.slice(-8) || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-primary border-primary">
                  {user?.role === 'manager' ? 'Station Manager' : 'Station Admin'}
                </Badge>
                <p className="text-sm text-text-light mt-1">
                  {stationInfo.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="luxury-card bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-gray-100">
                  <Building className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-600">No Station Assigned</h3>
                  <p className="text-text-light">You are not currently assigned to any station</p>
                  <p className="text-sm text-text-light">
                    Contact your administrator to get station access
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-gray-500 border-gray-300 bg-gray-100">
                  No Station
                </Badge>
                <p className="text-sm text-text-light mt-1">
                  Unassigned
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Time Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={card.title} className={statCardClass}>
            <div>
              <p className="text-sm font-medium text-text-light">{card.title}</p>
              <p className="text-2xl font-bold">{card.value}</p>
              <div className="flex items-center mt-2">
                {card.changeType === "positive" ? (
                  <ArrowUp className="w-4 h-4 text-emerald-600 mr-1" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-red-600 mr-1" />
                )}
                <span className={`text-sm font-medium ${card.changeType === "positive" ? "text-emerald-600" : "text-red-600"}`}>{card.change}</span>
                <span className="text-sm text-text-light ml-1">{card.vsText}</span>
              </div>
            </div>
            <div className={`p-4 rounded-full ${card.bgColor} flex items-center justify-center`}>
              <div className={card.color}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly/Daily Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
        {monthlyCards.map((card, index) => (
          <div key={card.title} className={statCardClass}>
            <div>
              <p className="text-sm font-medium text-text-light">{card.title}</p>
              <p className={`text-2xl font-bold ${card.title === 'Month Expenses' ? 'text-red-600' : card.title === 'Month Unpaid Laundry' ? 'text-yellow-600' : card.title === 'Month Profit/Loss' && monthly.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{card.value}</p>
              <div className="flex items-center mt-2">
                {card.changeType === "positive" ? (
                  <ArrowUp className="w-4 h-4 text-emerald-600 mr-1" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-red-600 mr-1" />
                )}
                <span className={`text-sm font-medium ${card.changeType === "positive" ? "text-emerald-600" : "text-red-600"}`}>{card.change}</span>
                <span className="text-sm text-text-light ml-1">{card.vsText}</span>
              </div>
              {card.title === 'Month Profit/Loss' && (
                <p className="text-xs text-gray-500 mt-1">Daily: <span className={card.dailyType === 'positive' ? 'text-emerald-700' : 'text-red-600'}>{card.daily}</span></p>
              )}
            </div>
            <div className={`p-4 rounded-full ${card.bgColor} flex items-center justify-center`}>{card.icon}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <Card className="luxury-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest customer orders and their status</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => router.push('/admin/orders')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.slice(0, 4).map((order, index) => (
                  <motion.div
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-xl hover:bg-secondary/50 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {order.customer
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{order.customer}</p>
                        <p className="text-sm text-text-light">{order.service}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={`${getStatusColor(order.status)} border-0`}>{order.status}</Badge>
                      <span className="font-semibold">{order.amount}</span>
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => router.push('/admin/orders')}>View Details</Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Service Distribution */}
        <div className="space-y-6">
          <Card className="luxury-card">
            <CardHeader>
              <CardTitle>Service Distribution</CardTitle>
              <CardDescription>Popular services this month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {serviceStats.map((service, index) => (
                <motion.div
                  key={service.name}
                  className="space-y-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{service.name}</span>
                    <span className="text-text-light">{service.value}%</span>
                  </div>
                  <Progress value={service.value} className="h-2" />
                </motion.div>
              ))}
            </CardContent>
          </Card>

          <Card className="luxury-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start bg-accent hover:bg-accent/90 text-white rounded-xl" onClick={() => router.push('/admin/pos')}>
                <ShoppingBag className="mr-2 w-4 h-4" />
                New Order
              </Button>
              <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => router.push('/admin/clients')}>
                <Users className="mr-2 w-4 h-4" />
                Add Customer
              </Button>
              <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => router.push('/admin/reports')}>
                <TrendingUp className="mr-2 w-4 h-4" />
                View Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
