"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  FileText, 
  DollarSign, 
  Loader2, 
  Calendar, 
  Tag, 
  StickyNote, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  MoreHorizontal,
  Receipt,
  CreditCard,
  Building,
  Car,
  Wrench,
  Megaphone,
  ShoppingCart,
  Zap
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Expense {
  _id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  notes?: string;
}

const expenseCategories = [
  { value: "Supplies", label: "Supplies", icon: ShoppingCart, color: "bg-blue-100 text-blue-800" },
  { value: "Utilities", label: "Utilities", icon: Zap, color: "bg-yellow-100 text-yellow-800" },
  { value: "Salaries", label: "Salaries", icon: Building, color: "bg-green-100 text-green-800" },
  { value: "Maintenance", label: "Maintenance", icon: Wrench, color: "bg-orange-100 text-orange-800" },
  { value: "Transport", label: "Transport", icon: Car, color: "bg-purple-100 text-purple-800" },
  { value: "Marketing", label: "Marketing", icon: Megaphone, color: "bg-pink-100 text-pink-800" },
  { value: "Other", label: "Other", icon: Receipt, color: "bg-gray-100 text-gray-800" },
];

const getCategoryIcon = (category: string) => {
  const cat = expenseCategories.find(c => c.value === category);
  return cat ? cat.icon : Receipt;
};

const getCategoryColor = (category: string) => {
  const cat = expenseCategories.find(c => c.value === category);
  return cat ? cat.color : "bg-gray-100 text-gray-800";
};

export default function ExpensesPage() {
  const { token } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [downloadRange, setDownloadRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    date: "",
    category: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New state for enhanced functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showStats, setShowStats] = useState(true);

  const ITEMS_PER_PAGE = 12;

  // Calculate statistics
  const calculateStats = () => {
    const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const thisMonth = filteredExpenses.filter(exp => {
      const expDate = new Date(exp.date);
      const now = new Date();
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    }).reduce((sum, exp) => sum + exp.amount, 0);
    
    const categoryStats = expenseCategories.map(cat => ({
      ...cat,
      total: filteredExpenses.filter(exp => exp.category === cat.value).reduce((sum, exp) => sum + exp.amount, 0),
      count: filteredExpenses.filter(exp => exp.category === cat.value).length
    })).filter(cat => cat.total > 0);

    return { total, thisMonth, categoryStats };
  };

  // Filter and sort expenses
  const filterAndSortExpenses = () => {
    let filtered = [...expenses];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(exp => 
        exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exp.notes && exp.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(exp => exp.category === categoryFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(exp => {
        const expDate = new Date(exp.date);
        switch (dateFilter) {
          case "today":
            return expDate >= today;
          case "week":
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return expDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return expDate >= monthAgo;
          case "year":
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            return expDate >= yearAgo;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "amount":
          aValue = a.amount;
          bValue = b.amount;
          break;
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "category":
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        default: // date
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredExpenses(filtered);
  };

  // Fetch expenses
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/expenses");
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses);
      }
    } catch (e) {
      // handle error
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    filterAndSortExpenses();
  }, [expenses, searchTerm, categoryFilter, dateFilter, sortBy, sortOrder]);

  // Handle form input
  const handleInput = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
    setSuccess("");
  };

  // Handle download range input
  const handleDownloadRangeInput = (field: string, value: string) => {
    setDownloadRange((prev) => ({ ...prev, [field]: value }));
  };

  // Download expenses for specific period
  const handleDownloadExpenses = async () => {
    if (!downloadRange.startDate || !downloadRange.endDate) {
      setError("Please select both start and end dates");
      return;
    }

    if (new Date(downloadRange.startDate) > new Date(downloadRange.endDate)) {
      setError("Start date cannot be after end date");
      return;
    }

    setIsDownloading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/expenses/download?startDate=${downloadRange.startDate}&endDate=${downloadRange.endDate}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses_${downloadRange.startDate}_to_${downloadRange.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setSuccess("Expense report downloaded successfully!");
        setIsDownloadDialogOpen(false);
        setDownloadRange({ startDate: "", endDate: "" });
      } else {
        const data = await res.json();
        setError(data.error || "Failed to download expenses");
      }
    } catch (e) {
      setError("Failed to download expenses");
    }
    setIsDownloading(false);
  };

  // Open edit dialog
  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      title: expense.title,
      amount: expense.amount.toString(),
      date: expense.date,
      category: expense.category,
      notes: expense.notes || "",
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Expense deleted successfully!");
        fetchExpenses();
        // Reset to first page if current page becomes empty
        const totalPages = Math.ceil((expenses.length - 1) / ITEMS_PER_PAGE);
        if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(totalPages);
        }
      } else {
        setError(data.error || "Failed to delete expense");
      }
    } catch (e) {
      setError("Failed to delete expense");
    }
  };

  // Add/Edit expense
  const handleSubmitExpense = async () => {
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const url = isEditMode ? `/api/expenses/${editingExpense?._id}` : "/api/expenses";
      const method = isEditMode ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: form.title.trim(),
          amount: Number(form.amount),
          date: form.date,
          category: form.category,
          notes: form.notes.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(isEditMode ? "Expense updated successfully!" : "Expense added successfully!");
        setForm({ title: "", amount: "", date: "", category: "", notes: "" });
        setIsDialogOpen(false);
        setIsEditMode(false);
        setEditingExpense(null);
        fetchExpenses();
      } else {
        setError(data.error || `Failed to ${isEditMode ? 'update' : 'add'} expense`);
      }
    } catch (e) {
      setError(`Failed to ${isEditMode ? 'update' : 'add'} expense`);
    }
    setIsSubmitting(false);
  };

  // Close dialog and reset form
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    setEditingExpense(null);
    setForm({ title: "", amount: "", date: "", category: "", notes: "" });
    setError("");
    setSuccess("");
  };

  // Close download dialog
  const handleCloseDownloadDialog = () => {
    setIsDownloadDialogOpen(false);
    setDownloadRange({ startDate: "", endDate: "" });
    setError("");
    setSuccess("");
  };

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentExpenses = filteredExpenses.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, dateFilter, sortBy, sortOrder]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Expense Management</h1>
            <p className="text-gray-600">Track, analyze, and manage your business expenses efficiently</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl">
                <Download className="mr-2 w-4 h-4" />
                  Export Report
              </Button>
            </DialogTrigger>
              <DialogContent className="max-w-md">
              <DialogHeader>
                  <DialogTitle>Export Expense Report</DialogTitle>
                <DialogDescription>Select a date range to download expenses for that period.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                  <div className="space-y-2">
                  <label className="font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={downloadRange.startDate}
                    onChange={(e) => handleDownloadRangeInput("startDate", e.target.value)}
                  />
                </div>
                  <div className="space-y-2">
                  <label className="font-medium">End Date</label>
                  <Input
                    type="date"
                    value={downloadRange.endDate}
                    onChange={(e) => handleDownloadRangeInput("endDate", e.target.value)}
                  />
                </div>
                  {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                  {success && <Alert><AlertDescription className="text-green-600">{success}</AlertDescription></Alert>}
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDownloadDialog}>Cancel</Button>
                  <Button onClick={handleDownloadExpenses} disabled={isDownloading}>
                  {isDownloading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Download className="mr-2 w-4 h-4" />}
                  Download CSV
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl">
                <Plus className="mr-2 w-4 h-4" />
                Add Expense
              </Button>
            </DialogTrigger>
              <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{isEditMode ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
                  <DialogDescription>Fill in the details below to {isEditMode ? 'update' : 'add'} an expense.</DialogDescription>
              </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                  <label className="font-medium">Title</label>
                  <Input
                      placeholder="e.g. Office Supplies"
                    value={form.title}
                    onChange={(e) => handleInput("title", e.target.value)}
                    maxLength={60}
                  />
                </div>
                  <div className="space-y-2">
                  <label className="font-medium">Amount (Ksh)</label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 1500"
                    value={form.amount}
                    onChange={(e) => handleInput("amount", e.target.value)}
                  />
                </div>
                  <div className="space-y-2">
                  <label className="font-medium">Date</label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => handleInput("date", e.target.value)}
                  />
                </div>
                  <div className="space-y-2">
                  <label className="font-medium">Category</label>
                    <Select value={form.category} onValueChange={(value) => handleInput("category", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((cat) => {
                          const IconComponent = cat.icon;
                          return (
                            <SelectItem key={cat.value} value={cat.value}>
                              <div className="flex items-center gap-2">
                                <IconComponent className="w-4 h-4" />
                                {cat.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                </div>
                  <div className="space-y-2">
                  <label className="font-medium">Notes (optional)</label>
                  <Textarea
                    placeholder="Additional details..."
                    value={form.notes}
                    onChange={(e) => handleInput("notes", e.target.value)}
                    maxLength={120}
                  />
                </div>
                  {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                  {success && <Alert><AlertDescription className="text-green-600">{success}</AlertDescription></Alert>}
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                  <Button onClick={handleSubmitExpense} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <DollarSign className="mr-2 w-4 h-4" />}
                  {isEditMode ? 'Update Expense' : 'Add Expense'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      </div>

      {/* Statistics Cards */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Expenses</p>
                  <p className="text-2xl font-bold">Ksh {stats.total.toLocaleString()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">This Month</p>
                  <p className="text-2xl font-bold">Ksh {stats.thisMonth.toLocaleString()}</p>
                </div>
                <Calendar className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Total Records</p>
                  <p className="text-2xl font-bold">{filteredExpenses.length}</p>
                </div>
                <FileText className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Categories</p>
                  <p className="text-2xl font-bold">{stats.categoryStats.length}</p>
                </div>
                <PieChart className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {expenseCategories.map((cat) => {
                  const IconComponent = cat.icon;
                  return (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        {cat.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Sort */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field);
              setSortOrder(order as "asc" | "desc");
            }}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date (Newest)</SelectItem>
                <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
                <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
                <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                <SelectItem value="title-desc">Title (Z-A)</SelectItem>
              </SelectContent>
            </Select>
            
            {/* View Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="px-3"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="px-3"
              >
                <FileText className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Display */}
      <div className="space-y-6">
        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {filteredExpenses.length} {filteredExpenses.length === 1 ? 'Expense' : 'Expenses'}
            </h2>
            {(searchTerm || categoryFilter !== "all" || dateFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                  setDateFilter("all");
                }}
                className="text-gray-500"
              >
                Clear Filters
              </Button>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredExpenses.length)} of {filteredExpenses.length}
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                <p className="text-lg font-medium text-gray-900">Loading expenses...</p>
                <p className="text-sm text-gray-500">Please wait while we fetch your data</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredExpenses.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {expenses.length === 0 ? 'No expenses recorded yet' : 'No expenses match your filters'}
                </h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  {expenses.length === 0 
                    ? 'Start tracking your business expenses to get better insights and analytics.'
                    : 'Try adjusting your search terms or filters to find what you\'re looking for.'
                  }
                </p>
                {expenses.length === 0 && (
                  <Button onClick={() => setIsDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 w-4 h-4" />
                    Add Your First Expense
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          ) : (
            <>
            {/* Grid View */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentExpenses.map((exp) => {
                  const CategoryIcon = getCategoryIcon(exp.category);
                  const categoryColor = getCategoryColor(exp.category);
                  
                  return (
                    <Card key={exp._id} className="hover:shadow-lg transition-all duration-200 group">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${categoryColor}`}>
                              <CategoryIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{exp.title}</h3>
                              <p className="text-sm text-gray-500">{exp.category}</p>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(exp)}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(exp._id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-gray-900">Ksh {exp.amount.toLocaleString()}</span>
                            <Badge variant="outline" className="text-xs">
                              {new Date(exp.date).toLocaleDateString()}
                            </Badge>
                          </div>
                          
                          {exp.notes && (
                            <p className="text-sm text-gray-600 line-clamp-2">{exp.notes}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* List View */
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expense</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentExpenses.map((exp) => {
                          const CategoryIcon = getCategoryIcon(exp.category);
                          const categoryColor = getCategoryColor(exp.category);
                          
                          return (
                            <tr key={exp._id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${categoryColor}`}>
                                    <CategoryIcon className="w-4 h-4" />
                      </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{exp.title}</div>
                      </div>
                    </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge variant="outline" className={categoryColor}>
                        {exp.category}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">Ksh {exp.amount.toLocaleString()}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(exp.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                {exp.notes || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(exp)}
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                                    <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(exp._id)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                                    <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
                
            {/* Pagination */}
                {totalPages > 1 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
                      
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  </div>
                </CardContent>
              </Card>
                )}
            </>
          )}
      </div>
    </div>
  );
} 