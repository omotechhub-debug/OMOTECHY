"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, DollarSign, Loader2, Calendar, Tag, StickyNote, Edit, Trash2, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  "Supplies",
  "Utilities",
  "Salaries",
  "Maintenance",
  "Transport",
  "Marketing",
  "Other",
];

export default function ExpensesPage() {
  const { token } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
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

  const ITEMS_PER_PAGE = 10;

  // Fetch expenses
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/expenses");
      const data = await res.json();
      if (data.success) {
        // Sort by latest first
        const sortedExpenses = data.expenses.sort((a: Expense, b: Expense) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setExpenses(sortedExpenses);
      }
    } catch (e) {
      // handle error
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

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
  const totalPages = Math.ceil(expenses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentExpenses = expenses.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Expenses</h1>
          <p className="text-text-light text-sm sm:text-base">Track and manage your business expenses</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl w-full sm:w-auto">
                <Download className="mr-2 w-4 h-4" />
                Download Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>Download Expense Report</DialogTitle>
                <DialogDescription>Select a date range to download expenses for that period.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <label className="font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={downloadRange.startDate}
                    onChange={(e) => handleDownloadRangeInput("startDate", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium">End Date</label>
                  <Input
                    type="date"
                    value={downloadRange.endDate}
                    onChange={(e) => handleDownloadRangeInput("endDate", e.target.value)}
                  />
                </div>
                {error && <div className="text-red-600 text-sm pt-1">{error}</div>}
                {success && <div className="text-green-600 text-sm pt-1">{success}</div>}
              </div>
              <DialogFooter>
                <Button variant="outline" className="rounded-xl" onClick={handleCloseDownloadDialog}>
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl"
                  onClick={handleDownloadExpenses}
                  disabled={isDownloading}
                >
                  {isDownloading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Download className="mr-2 w-4 h-4" />}
                  Download CSV
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl w-full sm:w-auto">
                <Plus className="mr-2 w-4 h-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>{isEditMode ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
                <DialogDescription>Fill in the details below to {isEditMode ? 'update' : 'add'} an expense (in Ksh).</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <label className="font-medium">Title</label>
                  <Input
                    placeholder="e.g. Cleaning Supplies"
                    value={form.title}
                    onChange={(e) => handleInput("title", e.target.value)}
                    maxLength={60}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium">Amount (Ksh)</label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 1500"
                    value={form.amount}
                    onChange={(e) => handleInput("amount", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium">Date</label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => handleInput("date", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium">Category</label>
                  <select
                    className="luxury-input w-full"
                    value={form.category}
                    onChange={(e) => handleInput("category", e.target.value)}
                  >
                    <option value="">Select category</option>
                    {expenseCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium">Notes (optional)</label>
                  <Textarea
                    placeholder="Additional details..."
                    value={form.notes}
                    onChange={(e) => handleInput("notes", e.target.value)}
                    maxLength={120}
                  />
                </div>
                {error && <div className="text-red-600 text-sm pt-1">{error}</div>}
                {success && <div className="text-green-600 text-sm pt-1">{success}</div>}
              </div>
              <DialogFooter>
                <Button variant="outline" className="rounded-xl" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl"
                  onClick={handleSubmitExpense}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <DollarSign className="mr-2 w-4 h-4" />}
                  {isEditMode ? 'Update Expense' : 'Add Expense'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Expenses List */}
      <Card className="luxury-card">
        <CardHeader>
          <CardTitle>Expenses List</CardTitle>
          <CardDescription>All your business expenses will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-text-light">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-accent/60" />
              <p className="text-base font-medium">Loading expenses...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-text-light">
              <FileText className="w-12 h-12 mb-4 text-accent/60" />
              <p className="text-lg font-semibold mb-2">No expenses recorded yet</p>
              <p className="text-sm mb-4">Start tracking your business expenses to get better insights.</p>
              <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl" onClick={() => setIsDialogOpen(true)}>
                <DollarSign className="mr-2 w-4 h-4" />
                Add Your First Expense
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-secondary">
                      <th className="px-4 py-2 text-left font-semibold">Title</th>
                      <th className="px-4 py-2 text-left font-semibold">Amount (Ksh)</th>
                      <th className="px-4 py-2 text-left font-semibold">Date</th>
                      <th className="px-4 py-2 text-left font-semibold">Category</th>
                      <th className="px-4 py-2 text-left font-semibold">Notes</th>
                      <th className="px-4 py-2 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp._id} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium text-gray-900">{exp.title}</td>
                        <td className="px-4 py-2 text-primary font-semibold">Ksh {exp.amount.toLocaleString()}</td>
                        <td className="px-4 py-2">{new Date(exp.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2">{exp.category}</td>
                        <td className="px-4 py-2 text-text-light max-w-xs truncate">{exp.notes}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(exp)}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(exp._id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Card/List */}
              <div className="md:hidden space-y-4">
                {currentExpenses.map((exp) => (
                  <div key={exp._id} className="rounded-2xl border bg-white p-4 flex flex-col gap-2 shadow luxury-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                          <DollarSign className="w-5 h-5 text-primary" />
                        </span>
                        <span className="font-inter font-semibold text-base text-gray-900 capitalize truncate max-w-[9rem]">{exp.title}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-lg font-bold text-primary font-inter">Ksh {exp.amount.toLocaleString()}</span>
                        <span className="block text-xs text-gray-400 mt-0.5 flex items-center gap-1 justify-end">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          {new Date(exp.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-0.5 rounded-full text-xs font-medium font-inter">
                        <Tag className="w-3.5 h-3.5" />
                        {exp.category}
                      </span>
                    </div>
                    {exp.notes && (
                      <div className="flex items-start gap-2 text-xs text-gray-500 italic border-t pt-2 mt-2 font-inter">
                        <StickyNote className="w-3.5 h-3.5 mt-0.5 text-gray-400" />
                        <span>{exp.notes}</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-2 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(exp)}
                        className="flex-1 h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(exp._id)}
                        className="flex-1 h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
                
                {/* Mobile Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
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
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
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
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 