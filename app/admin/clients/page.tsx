"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import * as XLSX from 'xlsx'
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Download,
  Plus,
  Mail,
  Phone,
  MapPin,
  User,
  RefreshCw,
  MessageSquare,
  Send,
  Users,
  UserPlus,
  ChevronDown,
  X,
  Check,
  Upload,
  FileText,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', address: '' })
  const [adding, setAdding] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<any>(null)
  const [error, setError] = useState("")
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', address: '' })
  const [editing, setEditing] = useState(false)
  const fileDownloadRef = useRef(null)
  const [submitting, setSubmitting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  
  // Messaging state
  const [showMessageDialog, setShowMessageDialog] = useState(false)
  const [messageType, setMessageType] = useState<'all' | 'new' | 'specific'>('all')
  const [messageContent, setMessageContent] = useState('')
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messageSentCount, setMessageSentCount] = useState(0)
  const [messageFailedCount, setMessageFailedCount] = useState(0)
  const [sendingComplete, setSendingComplete] = useState(false)
  
  // CSV Upload state
  const [showCsvDialog, setShowCsvDialog] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvPreview, setCsvPreview] = useState<any[]>([])
  const [uploadingCsv, setUploadingCsv] = useState(false)
  const [csvResults, setCsvResults] = useState<any>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchClients() {
      setLoading(true)
      try {
        // Fetch customers from database
        const customersRes = await fetch('/api/customers')
        const customersData = await customersRes.json()
        const customers = customersData.customers || []
        
        // Fetch orders for additional data
        const ordersRes = await fetch('/api/orders')
        const ordersData = await ordersRes.json()
        const orders = ordersData.orders || []
        
        // Create a map of customers from database
        const customerMap = new Map()
        customers.forEach((customer: any) => {
          customerMap.set(customer.phone, {
            id: customer._id,
            clientNo: customer.phone.slice(-6),
            fullName: customer.name,
            phone: customer.phone,
            email: customer.email || '',
            address: customer.address || '',
            joinDate: customer.createdAt,
            lastOrder: customer.lastOrder || customer.createdAt,
            totalOrders: customer.totalOrders || 0,
            totalSpent: customer.totalSpent || 0,
            status: customer.status || 'active',
            avatar: '',
            monthlySpent: {},
            preferences: customer.preferences || [],
            notes: customer.notes || '',
            isFromDatabase: true,
          })
        })
        
        // Process orders and update customer data
        orders.forEach((order: any) => {
          const key = order.customer?.phone || order.customer?.email
          if (!key) return
          
          if (customerMap.has(key)) {
            // Update existing customer from database
            const customer = customerMap.get(key)
            customer.totalOrders += 1
            customer.totalSpent += order.totalAmount || 0
            if (new Date(order.createdAt) > new Date(customer.lastOrder)) {
              customer.lastOrder = order.createdAt
            }
          } else {
            // Create new customer from order
            customerMap.set(key, {
              id: key,
              clientNo: key.slice(-6),
              fullName: order.customer?.name || order.customer?.email || order.customer?.phone || 'Unknown',
              phone: order.customer?.phone || '',
              email: order.customer?.email || '',
              address: order.customer?.address || '',
              joinDate: order.createdAt,
              lastOrder: order.createdAt,
              totalOrders: 1,
              totalSpent: order.totalAmount || 0,
              status: 'active',
              avatar: '',
              monthlySpent: {},
              preferences: [],
              notes: '',
              isFromDatabase: false,
            })
          }
          
          // Track monthly spent
          const customer = customerMap.get(key)
          const d = new Date(order.createdAt)
          const ym = `${d.getFullYear()}-${d.getMonth()}`
          if (!customer.monthlySpent[ym]) customer.monthlySpent[ym] = 0
          customer.monthlySpent[ym] += order.totalAmount || 0
        })
        
        // Assign status and format data
        const now = new Date()
        const twoWeeksAgo = new Date()
        twoWeeksAgo.setDate(now.getDate() - 14) // 2 weeks = 14 days
        const thisMonth = now.getMonth()
        const thisYear = now.getFullYear()
        const thisYM = `${thisYear}-${thisMonth}`
        
        const clientArr = Array.from(customerMap.values()).map((c: any) => {
          const join = new Date(c.joinDate)
          if (c.monthlySpent[thisYM] > 20000) {
            c.status = 'vip'
          } else if (join >= twoWeeksAgo) {
            c.status = 'new'
          } else if (c.totalSpent > 1000) {
            c.status = 'premium'
          } else if (!c.isFromDatabase) {
            c.status = 'active'
          }
          
          c.totalSpent = `Ksh ${c.totalSpent.toLocaleString()}`
          return c
        })
        
        setClients(clientArr)
      } catch (error) {
        console.error('Error fetching clients:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchClients()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "vip":
        return "bg-yellow-400 text-white border-yellow-400"
      case "premium":
        return "bg-accent/10 text-accent border-accent"
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "new":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const filteredClients = clients.filter(
    (client) =>
      client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm) ||
      client.clientNo.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  function exportClientsToCSV() {
    const csvContent = [
      ['Client No', 'Full Name', 'Phone', 'Email', 'Address', 'Status', 'Total Orders', 'Total Spent', 'Join Date'],
      ...clients.map(client => [
        client.clientNo,
        client.fullName,
        client.phone,
        client.email,
        client.address,
        client.status,
        client.totalOrders,
        client.totalSpent,
        new Date(client.joinDate).toLocaleDateString()
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clients.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  async function syncCustomers() {
    setSyncing(true)
    setError("")
    
    try {
      const response = await fetch('/api/customers/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh the clients list
        window.location.reload()
      } else {
        setError(data.message || 'Failed to sync customers')
      }
    } catch (error) {
      setError('Failed to sync customers. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  // Validation functions
  function validateClientData(clientData: any) {
    setError("")
    
    // Check for duplicate phone number
    if (clientData.phone && clients.some(c => c.phone === clientData.phone)) {
      setError("A client with this phone number already exists")
      return false
    }
    
    // Check for duplicate email
    if (clientData.email && clients.some(c => c.email === clientData.email)) {
      setError("A client with this email already exists")
      return false
    }
    
    // Validate phone number format (basic validation)
    if (clientData.phone && !/^[\d\s\-\+\(\)]+$/.test(clientData.phone)) {
      setError("Please enter a valid phone number")
      return false
    }
    
    // Validate email format (basic validation)
    if (clientData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.email)) {
      setError("Please enter a valid email address")
      return false
    }
    
    return true
  }

  // Delete client functions
  function openDeleteDialog(client: any) {
    setClientToDelete(client)
    setDeleteDialogOpen(true)
  }

  function handleDeleteClient() {
    if (!clientToDelete) return
    
    // Only allow deleting customers from database
    if (!clientToDelete.isFromDatabase) {
      setError("Cannot delete customers created from orders. Please add them manually first to manage them.")
      setDeleteDialogOpen(false)
      setClientToDelete(null)
      return
    }
    
    setSubmitting(true)
    
    fetch(`/api/customers/${clientToDelete.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        setClients(prev => prev.filter(c => c.id !== clientToDelete.id))
        setDeleteDialogOpen(false)
        setClientToDelete(null)
        setError("")
      } else {
        setError(data.message || 'Failed to delete client')
      }
    })
    .catch(error => {
      setError('Failed to delete client. Please try again.')
    })
    .finally(() => {
      setSubmitting(false)
    })
  }

  // Messaging functions
  function openMessageDialog(type: 'all' | 'new' | 'specific') {
    setMessageType(type)
    setShowMessageDialog(true)
    setSelectedClients([])
    setMessageContent('')
    setError('')
    setMessageSentCount(0)
    setMessageFailedCount(0)
    setSendingComplete(false)
  }

  function toggleClientSelection(clientId: string) {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  function selectAllClients() {
    const allClientIds = filteredClients.map(client => client.id)
    setSelectedClients(allClientIds)
  }

  function deselectAllClients() {
    setSelectedClients([])
  }

  async function sendMessage() {
    if (!messageContent.trim()) {
      setError('Please enter a message')
      return
    }

    setSendingMessage(true)
    setError('')
    setMessageSentCount(0)
    setMessageFailedCount(0)

    let targetClients = []

    switch (messageType) {
      case 'all':
        targetClients = clients.filter(client => client.phone)
        break
      case 'new':
        targetClients = clients.filter(client => client.status === 'new' && client.phone)
        break
      case 'specific':
        targetClients = clients.filter(client => selectedClients.includes(client.id) && client.phone)
        break
    }

    if (targetClients.length === 0) {
      setError('No clients selected or no phone numbers available')
      setSendingMessage(false)
      return
    }

    let sent = 0
    let failed = 0

    // Send messages one by one to avoid rate limiting
    for (const client of targetClients) {
      try {
        const response = await fetch('/api/sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mobile: client.phone,
            message: messageContent,
            type: 'custom'
          })
        })

        const data = await response.json()
        
        if (data.success) {
          sent++
        } else {
          failed++
          console.error(`Failed to send to ${client.fullName}:`, data.error)
        }
      } catch (error) {
        failed++
        console.error(`Error sending to ${client.fullName}:`, error)
      }

      // Update counters in real-time
      setMessageSentCount(sent)
      setMessageFailedCount(failed)

      // Small delay to avoid overwhelming the SMS service
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setSendingMessage(false)
    setSendingComplete(true)

    // Show completion toast
    if (sent > 0) {
      toast({
        title: "Messages Sent",
        description: `Successfully sent ${sent} message(s). ${failed > 0 ? `${failed} failed.` : ''}`,
      })
    }

    if (failed === targetClients.length) {
      setError('All messages failed to send. Please check your SMS configuration.')
    }

    // Auto-close modal after 3 seconds
    setTimeout(() => {
      setShowMessageDialog(false)
      // Reset states when closing
      setSendingComplete(false)
      setMessageSentCount(0)
      setMessageFailedCount(0)
      setError('')
    }, 3000)
  }

  function getMessageTargetInfo() {
    switch (messageType) {
      case 'all':
        const allWithPhone = clients.filter(client => client.phone).length
        return `All clients with phone numbers (${allWithPhone})`
      case 'new':
        const newWithPhone = clients.filter(client => client.status === 'new' && client.phone).length
        return `New clients (last 2 weeks) (${newWithPhone})`
      case 'specific':
        return `Selected clients (${selectedClients.length})`
      default:
        return ''
    }
  }

  // Edit client functions
  function openEditDialog(client: any) {
    setEditingClient(client)
    setEditForm({
      name: client.fullName,
      phone: client.phone,
      email: client.email,
      address: client.address
    })
    setEditDialogOpen(true)
  }

  function handleEditClient(e: any) {
    e.preventDefault()
    setEditing(true)
    setError("")
    
    // Only allow editing customers from database
    if (!editingClient.isFromDatabase) {
      setError("Cannot edit customers created from orders. Please add them manually first.")
      setEditing(false)
      return
    }
    
    // Create a temporary client data for validation (excluding current client)
    const tempClientData = {
      ...editForm,
      id: editingClient.id
    }
    
    // Check for duplicates excluding the current client
    const otherClients = clients.filter(c => c.id !== editingClient.id)
    
    // Check for duplicate phone number
    if (tempClientData.phone && otherClients.some(c => c.phone === tempClientData.phone)) {
      setError("A client with this phone number already exists")
      setEditing(false)
      return
    }
    
    // Check for duplicate email
    if (tempClientData.email && otherClients.some(c => c.email === tempClientData.email)) {
      setError("A client with this email already exists")
      setEditing(false)
      return
    }
    
    // Validate phone number format
    if (tempClientData.phone && !/^[\d\s\-\+\(\)]+$/.test(tempClientData.phone)) {
      setError("Please enter a valid phone number")
      setEditing(false)
      return
    }
    
    // Validate email format
    if (tempClientData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tempClientData.email)) {
      setError("Please enter a valid email address")
      setEditing(false)
      return
    }
    
    // Update via API
    fetch(`/api/customers/${editingClient.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify(editForm),
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Update the client in the list
        setClients(prev => prev.map(c => 
          c.id === editingClient.id 
            ? {
                ...c,
                fullName: editForm.name,
                phone: editForm.phone,
                email: editForm.email,
                address: editForm.address
              }
            : c
        ))
        setEditDialogOpen(false)
        setEditingClient(null)
        setEditForm({ name: '', phone: '', email: '', address: '' })
        setError("")
      } else {
        setError(data.message || 'Failed to update client')
      }
    })
    .catch(error => {
      setError('Failed to update client. Please try again.')
    })
    .finally(() => {
      setEditing(false)
    })
  }

  // CSV Upload functions
  function handleCsvFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setCsvFile(file)
    
    // Read and parse the CSV file
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      if (jsonData.length > 0) {
        const headers = jsonData[0] as string[]
        const rows = jsonData.slice(1) as any[][]
        
        console.log('CSV Headers:', headers)
        console.log('First few rows:', rows.slice(0, 3))
        
        // Map CSV columns to our expected format
        const mappedData = rows.map((row, index) => {
          const rowData: any = {}
          headers.forEach((header, headerIndex) => {
            rowData[header] = row[headerIndex] || ''
          })
          
          // Map CSV fields to Customer model (ignore CSV ID - we use our own database IDs)
          const mappedItem = {
            name: rowData.ClientName || rowData['Client Name'] || rowData.clientname || '',
            phone: rowData.ClientNo || rowData['Client No'] || rowData.clientno || rowData.Phone || rowData.phone || '',
            email: rowData.Email || rowData.email || '',
            address: rowData.ClientLocation || rowData['Client Location'] || rowData.clientlocation || rowData.Address || rowData.address || '',
            originalData: rowData,
            rowNumber: index + 2, // +2 because we removed header and arrays are 0-indexed
            // Note: CSV ID is ignored - system will generate unique database IDs
          }
          
          console.log(`Row ${index + 1}:`, mappedItem)
          return mappedItem
        }).filter(item => item.name && item.phone) // Only include rows with required fields
        
        console.log('Mapped data count:', mappedData.length)
        console.log('Valid records:', mappedData)
        
        setCsvData(mappedData)
        setCsvPreview(mappedData.slice(0, 20)) // Show first 20 rows as preview
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function resetCsvUpload() {
    setCsvFile(null)
    setCsvData([])
    setCsvPreview([])
    setCsvResults(null)
    if (csvInputRef.current) {
      csvInputRef.current.value = ''
    }
  }

  async function handleCsvUpload() {
    if (!csvData.length) return

    setUploadingCsv(true)
    setCsvResults(null)

    try {
      const response = await fetch('/api/customers/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ customers: csvData }),
      })

      const result = await response.json()
      
      if (result.success) {
        setCsvResults(result.results)
        
        // Don't refresh immediately - let user see the results first
        console.log('Import Results:', result.results)
        
        // Show detailed results for a few seconds before refreshing
        setTimeout(() => {
          // Refresh the clients list
          window.location.reload()
        }, 10000) // 10 seconds to review results
      } else {
        setError(result.message || 'Failed to upload CSV')
      }
    } catch (error) {
      setError('Failed to upload CSV. Please try again.')
    } finally {
      setUploadingCsv(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Management</h1>
          <p className="text-text-light">Manage customer relationships and information</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button variant="outline" className="rounded-xl" onClick={exportClientsToCSV}>
            <Download className="mr-2 w-4 h-4" />
            <a ref={fileDownloadRef} download="clients.csv" className="outline-none text-inherit no-underline">Export</a>
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => setShowCsvDialog(true)}>
            <Upload className="mr-2 w-4 h-4" />
            Import CSV
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={syncCustomers} disabled={syncing}>
            <RefreshCw className={`mr-2 w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
          
          {/* Message Clients Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <MessageSquare className="mr-2 w-4 h-4" />
                Message Clients
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => openMessageDialog('all')}>
                <Users className="mr-2 w-4 h-4" />
                <div className="flex flex-col">
                  <span>All Clients</span>
                  <span className="text-xs text-gray-500">
                    {clients.filter(client => client.phone).length} with phone numbers
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openMessageDialog('new')}>
                <UserPlus className="mr-2 w-4 h-4" />
                <div className="flex flex-col">
                  <span>New Clients</span>
                  <span className="text-xs text-gray-500">
                    {clients.filter(client => client.status === 'new' && client.phone).length} joined in last 2 weeks
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openMessageDialog('specific')}>
                <User className="mr-2 w-4 h-4" />
                <div className="flex flex-col">
                  <span>Specific Clients</span>
                  <span className="text-xs text-gray-500">Select individual clients</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button className="bg-accent hover:bg-accent/90 text-white rounded-xl" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 w-4 h-4" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{clients.length}</p>
              <p className="text-sm text-text-light">Total Clients</p>
            </div>
          </CardContent>
        </Card>
        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{clients.filter((c) => c.status === "active").length}</p>
              <p className="text-sm text-text-light">Active Clients</p>
            </div>
          </CardContent>
        </Card>
        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{clients.filter((c) => c.status === "premium").length}</p>
              <p className="text-sm text-text-light">Premium Clients</p>
            </div>
          </CardContent>
        </Card>
        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{clients.filter((c) => c.status === "new").length}</p>
              <p className="text-sm text-text-light">New in 2 Weeks</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="luxury-card">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light w-4 h-4" />
                <Input
                  placeholder="Search clients by name, email, phone, or client number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 luxury-input"
                />
              </div>
            </div>
            <Button variant="outline" className="rounded-xl">
              <Filter className="mr-2 w-4 h-4" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="luxury-card">
        <CardHeader>
          <CardTitle>Clients ({filteredClients.length})</CardTitle>
          <CardDescription>Manage your customer database</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile: Card list */}
          <div className="block md:hidden space-y-4">
            {filteredClients.map((client, index) => (
              <Card key={client.id} className="relative p-5 flex flex-col items-center gap-3 luxury-card bg-gradient-to-br from-white via-secondary to-accent/10 border-2 border-accent/20 shadow-lg">
                {/* Three dots menu at top right */}
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem 
                        onClick={() => openEditDialog(client)}
                        className={!client.isFromDatabase ? "opacity-50 cursor-not-allowed" : ""}
                        disabled={!client.isFromDatabase}
                      >
                        <Edit className="mr-2 w-4 h-4" />
                        Edit Client
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Phone className="mr-2 w-4 h-4" />
                        Call Client
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          setMessageType('specific')
                          setSelectedClients([client.id])
                          setShowMessageDialog(true)
                        }}
                        disabled={!client.phone}
                      >
                        <MessageSquare className="mr-2 w-4 h-4" />
                        Message Client
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`text-red-600 ${!client.isFromDatabase ? "opacity-50 cursor-not-allowed" : ""}`}
                        onClick={() => openDeleteDialog(client)}
                        disabled={!client.isFromDatabase}
                      >
                        <Trash2 className="mr-2 w-4 h-4" />
                        Delete Client
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Avatar className="w-16 h-16 mb-2 mx-auto ring-2 ring-accent">
                  <AvatarImage src={client.avatar || "/placeholder.svg"} alt={client.fullName} />
                  <AvatarFallback className="text-lg">{client.fullName.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-center gap-1 w-full">
                  <div className="font-semibold text-responsive-lg">{client.fullName}</div>
                  <div className="text-xs text-text-light">{client.clientNo}</div>
                  <Badge className={`${getStatusColor(client.status)} mt-1 text-xs px-3 py-1 rounded-full`}>{client.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full mt-2 text-xs text-text-light">
                  <span className="flex items-center gap-1 justify-center"><Phone className="w-4 h-4" />{client.phone}</span>
                  <span className="flex items-center gap-1 justify-center"><Mail className="w-4 h-4" />{client.email}</span>
                </div>
              </Card>
            ))}
          </div>
          {/* Desktop: Table */}
          <div className="hidden md:block overflow-x-auto">
            {messageType === 'specific' && showMessageDialog && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    Select clients to message ({selectedClients.length} selected)
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllClients}>
                      <Check className="w-4 h-4 mr-1" />
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllClients}>
                      <X className="w-4 h-4 mr-1" />
                      Clear All
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  {messageType === 'specific' && showMessageDialog && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            selectAllClients()
                          } else {
                            deselectAllClients()
                          }
                        }}
                      />
                    </TableHead>
                  )}
                  <TableHead>Client No</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client, index) => (
                  <motion.tr
                    key={client.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-secondary/50"
                  >
                    {messageType === 'specific' && showMessageDialog && (
                      <TableCell>
                        <Checkbox
                          checked={selectedClients.includes(client.id)}
                          onCheckedChange={() => toggleClientSelection(client.id)}
                          disabled={!client.phone}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{client.clientNo}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={client.avatar || "/placeholder.svg"} alt={client.fullName} />
                          <AvatarFallback>
                            {client.fullName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{client.fullName}</div>
                          <div className="text-sm text-text-light">
                            Member since {new Date(client.joinDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-text-light" />
                        {client.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-text-light" />
                        {client.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-1 max-w-[200px]">
                        <MapPin className="w-3 h-3 text-text-light mt-0.5 flex-shrink-0" />
                        <span className="text-sm truncate">{client.address}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(client.status)}`}>{client.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full"
                              onClick={() => setSelectedClient(client)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl w-full p-2 sm:p-6">
                            <DialogHeader>
                              <DialogTitle>Client Profile - {selectedClient?.fullName}</DialogTitle>
                              <DialogDescription>Complete client information and history</DialogDescription>
                            </DialogHeader>
                            {selectedClient && (
                              <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                  <Avatar className="w-16 h-16">
                                    <AvatarImage
                                      src={selectedClient.avatar || "/placeholder.svg"}
                                      alt={selectedClient.fullName}
                                    />
                                    <AvatarFallback className="text-lg">
                                      {selectedClient.fullName
                                        .split(" ")
                                        .map((n: string) => n[0])
                                        .join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h3 className="text-xl font-semibold">{selectedClient.fullName}</h3>
                                    <p className="text-text-light">{selectedClient.clientNo}</p>
                                    <Badge className={`${getStatusColor(selectedClient.status)} mt-1`}>
                                      {selectedClient.status}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">Contact Information</h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                          <Phone className="w-4 h-4 text-primary" />
                                          {selectedClient.phone}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Mail className="w-4 h-4 text-primary" />
                                          {selectedClient.email}
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <MapPin className="w-4 h-4 text-primary mt-0.5" />
                                          <span>{selectedClient.address}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-2">Preferences</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedClient.preferences.map((pref: string, i: number) => (
                                          <Badge key={i} variant="outline" className="text-xs">
                                            {pref}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">Statistics</h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span>Total Orders:</span>
                                          <span className="font-medium">{selectedClient.totalOrders}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Total Spent:</span>
                                          <span className="font-medium">{selectedClient.totalSpent}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Last Order:</span>
                                          <span className="font-medium">{selectedClient.lastOrder}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Join Date:</span>
                                          <span className="font-medium">
                                            {new Date(selectedClient.joinDate).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-2">Notes</h4>
                                      <p className="text-sm bg-secondary p-3 rounded-lg">{selectedClient.notes}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                  <Button variant="outline" className="rounded-xl" onClick={() => openEditDialog(selectedClient)}>
                                    <Edit className="mr-2 w-4 h-4" />
                                    Edit Client
                                  </Button>
                                  <Button 
                                    className="bg-accent hover:bg-accent/90 text-white rounded-xl"
                                    onClick={() => {
                                      setMessageType('specific')
                                      setSelectedClients([selectedClient.id])
                                      setShowMessageDialog(true)
                                    }}
                                    disabled={!selectedClient?.phone}
                                  >
                                    <MessageSquare className="mr-2 w-4 h-4" />
                                    Send Message
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="rounded-full">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => openEditDialog(client)}>
                              <Edit className="mr-2 w-4 h-4" />
                              Edit Client
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Phone className="mr-2 w-4 h-4" />
                              Call Client
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setMessageType('specific')
                                setSelectedClients([client.id])
                                setShowMessageDialog(true)
                              }}
                              disabled={!client.phone}
                            >
                              <MessageSquare className="mr-2 w-4 h-4" />
                              Message Client
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => openDeleteDialog(client)}>
                              <Trash2 className="mr-2 w-4 h-4" />
                              Delete Client
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md w-full p-0 overflow-hidden bg-gradient-to-br from-white via-secondary to-accent/10 rounded-2xl shadow-2xl">
          <div className="flex flex-col items-center p-6 luxury-card bg-transparent">
            <Avatar className="w-20 h-20 mb-4 ring-2 ring-accent bg-white">
              <AvatarFallback className="text-3xl">+</AvatarFallback>
            </Avatar>
            <DialogHeader className="w-full text-center mb-2">
              <DialogTitle className="text-2xl font-bold mb-1">Add New Client</DialogTitle>
              <DialogDescription className="text-text-light mb-4">Fill in the details below to add a new client to your database.</DialogDescription>
            </DialogHeader>
            <form onSubmit={async e => {
              e.preventDefault()
              setAdding(true)
              setError("")
              
              // Validate client data
              if (!validateClientData(newClient)) {
                setAdding(false)
                return
              }
              
              try {
                const response = await fetch('/api/customers', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                  },
                  body: JSON.stringify(newClient),
                })
                
                const data = await response.json()
                
                if (!data.success) {
                  setError(data.message || 'Failed to add client')
                  setAdding(false)
                  return
                }
                
                // Add the new client to the list
                const newClientData = {
                  id: data.customer._id,
                  clientNo: data.customer.phone.slice(-6),
                  fullName: data.customer.name,
                  phone: data.customer.phone,
                  email: data.customer.email || '',
                  address: data.customer.address || '',
                  joinDate: data.customer.createdAt,
                  lastOrder: data.customer.createdAt,
                  totalOrders: 0,
                  totalSpent: 0,
                  status: 'active',
                  avatar: '',
                  monthlySpent: {},
                  preferences: data.customer.preferences || [],
                  notes: data.customer.notes || '',
                  isFromDatabase: true,
                }
                
                setClients(prev => [newClientData, ...prev])
                setShowAddDialog(false)
                setNewClient({ name: '', phone: '', email: '', address: '' })
                setError("")
              } catch (error) {
                setError('Failed to add client. Please try again.')
              } finally {
                setAdding(false)
              }
            }} className="w-full space-y-4">
              <Input required placeholder="Full Name" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} className="luxury-input text-lg py-4" />
              <Input required placeholder="Phone" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} className="luxury-input text-lg py-4" />
              <Input placeholder="Email" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} className="luxury-input text-lg py-4" />
              <Input placeholder="Address" value={newClient.address} onChange={e => setNewClient({ ...newClient, address: e.target.value })} className="luxury-input text-lg py-4" />
              {error && <div className="text-red-500 text-sm text-center">{error}</div>}
              <div className="h-px bg-secondary my-2" />
              <div className="flex flex-col gap-2 w-full">
                <Button type="submit" className="w-full bg-accent text-white rounded-xl font-semibold shadow-lg py-3 text-lg" disabled={adding}>{adding ? 'Adding...' : 'Add Client'}</Button>
                <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => setShowAddDialog(false)} disabled={adding}>Cancel</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{clientToDelete?.fullName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteClient} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md w-full p-0 overflow-hidden bg-gradient-to-br from-white via-secondary to-accent/10 rounded-2xl shadow-2xl">
          <div className="flex flex-col items-center p-6 luxury-card bg-transparent">
            <Avatar className="w-20 h-20 mb-4 ring-2 ring-accent bg-white">
              <AvatarFallback className="text-3xl">
                {editingClient?.fullName?.split(" ").map((n: string) => n[0]).join("") || "E"}
              </AvatarFallback>
            </Avatar>
            <DialogHeader className="w-full text-center mb-2">
              <DialogTitle className="text-2xl font-bold mb-1">Edit Client</DialogTitle>
              <DialogDescription className="text-text-light mb-4">Update the client information below.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditClient} className="w-full space-y-4">
              <Input 
                required 
                placeholder="Full Name" 
                value={editForm.name} 
                onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                className="luxury-input text-lg py-4" 
              />
              <Input 
                required 
                placeholder="Phone" 
                value={editForm.phone} 
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })} 
                className="luxury-input text-lg py-4" 
              />
              <Input 
                placeholder="Email" 
                value={editForm.email} 
                onChange={e => setEditForm({ ...editForm, email: e.target.value })} 
                className="luxury-input text-lg py-4" 
              />
              <Input 
                placeholder="Address" 
                value={editForm.address} 
                onChange={e => setEditForm({ ...editForm, address: e.target.value })} 
                className="luxury-input text-lg py-4" 
              />
              {error && <div className="text-red-500 text-sm text-center">{error}</div>}
              <div className="h-px bg-secondary my-2" />
              <div className="flex flex-col gap-2 w-full">
                <Button type="submit" className="w-full bg-accent text-white rounded-xl font-semibold shadow-lg py-3 text-lg" disabled={editing}>
                  {editing ? 'Updating...' : 'Update Client'}
                </Button>
                <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => setEditDialogOpen(false)} disabled={editing}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Clients Dialog */}
      <Dialog 
        open={showMessageDialog} 
        onOpenChange={(open) => {
          if (!open) {
            // Reset states when dialog is closed
            setSendingComplete(false)
            setMessageSentCount(0)
            setMessageFailedCount(0)
            setError('')
          }
          setShowMessageDialog(open)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Message Clients
            </DialogTitle>
            <DialogDescription>
              Send SMS messages to your clients. Target: {getMessageTargetInfo()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Message Type Indicator */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {messageType === 'all' && <Users className="w-5 h-5 text-blue-600" />}
                {messageType === 'new' && <UserPlus className="w-5 h-5 text-green-600" />}
                {messageType === 'specific' && <User className="w-5 h-5 text-purple-600" />}
                                 <span className="font-medium">
                   {messageType === 'all' && 'All Clients'}
                   {messageType === 'new' && 'New Clients (Last 2 Weeks)'}
                   {messageType === 'specific' && 'Specific Clients'}
                 </span>
              </div>
              <div className="text-sm text-gray-600">
                {getMessageTargetInfo()}
              </div>
            </div>

            {/* Message Content */}
            <div className="space-y-2">
              <Label htmlFor="message">Message Content</Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <div className="text-right text-sm text-gray-500">
                {messageContent.length}/160 characters
              </div>
            </div>

            {/* Client Selection for Specific Mode */}
            {messageType === 'specific' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Select Clients ({selectedClients.length} selected)</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllClients}>
                      <Check className="w-4 h-4 mr-1" />
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllClients}>
                      <X className="w-4 h-4 mr-1" />
                      Clear All
                    </Button>
                  </div>
                </div>
                
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className={`flex items-center gap-3 p-2 rounded hover:bg-gray-50 ${
                        !client.phone ? 'opacity-50' : ''
                      }`}
                    >
                      <Checkbox
                        checked={selectedClients.includes(client.id)}
                        onCheckedChange={() => toggleClientSelection(client.id)}
                        disabled={!client.phone}
                      />
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {client.fullName.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{client.fullName}</div>
                        <div className="text-xs text-gray-500">{client.phone || 'No phone'}</div>
                      </div>
                      <Badge className={`${getStatusColor(client.status)} text-xs`}>
                        {client.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sending Progress */}
            {sendingMessage && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Sending messages...</span>
                </div>
                <div className="text-sm text-gray-600">
                  Sent: {messageSentCount} | Failed: {messageFailedCount}
                </div>
              </div>
            )}

            {/* Completion Summary */}
            {sendingComplete && (
              <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="rounded-full h-5 w-5 bg-green-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-medium text-green-800">Sending Complete!</span>
                </div>
                <div className="text-sm text-green-700">
                  <div className="flex justify-between items-center mb-1">
                    <span>✅ Successfully sent:</span>
                    <span className="font-bold">{messageSentCount} messages</span>
                  </div>
                  {messageFailedCount > 0 && (
                    <div className="flex justify-between items-center">
                      <span>❌ Failed to send:</span>
                      <span className="font-bold">{messageFailedCount} messages</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-green-600 text-center mt-2">
                  This dialog will close automatically in 3 seconds...
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            {!sendingComplete && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowMessageDialog(false)}
                  disabled={sendingMessage}
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={sendingMessage || !messageContent.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendingMessage ? 'Sending...' : 'Send Messages'}
                </Button>
              </>
            )}
            {sendingComplete && (
              <Button
                variant="outline"
                onClick={() => setShowMessageDialog(false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                Close
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Upload Dialog */}
      <Dialog open={showCsvDialog} onOpenChange={setShowCsvDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Import Clients from CSV
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file with your client data. System will generate unique IDs - CSV ID column is ignored. Existing customers (by phone/email) will be skipped automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 overflow-y-auto flex-1 pr-2">
            {/* File Upload Section */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleCsvFileSelect}
                  className="hidden"
                />
                {!csvFile ? (
                  <div className="space-y-2">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <Button
                        variant="outline"
                        onClick={() => csvInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Select CSV File
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Supports CSV, Excel (.xlsx, .xls) files
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Check className="w-12 h-12 text-green-500 mx-auto" />
                    <div className="font-medium">{csvFile.name}</div>
                    <div className="text-lg font-bold text-green-600">
                      {csvData.length} valid records found
                    </div>
                    {csvData.length > 100 && (
                      <div className="text-sm text-blue-600 font-medium">
                        Large dataset detected - scroll down to import button
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetCsvUpload}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove File
                    </Button>
                  </div>
                )}
              </div>

              {/* CSV Field Mapping Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-800">CSV Format & Import Rules</h4>
                    <div className="text-sm text-blue-700">
                      <p><strong>Required columns:</strong> ClientName, ClientNo (used as phone number)</p>
                      <p><strong>Optional columns:</strong> Email, ClientLocation (used as address)</p>
                      <p><strong>Alternative names:</strong> "Client Name", "Client No", "Client Location" are also accepted</p>
                      <p><strong>ID Handling:</strong> CSV ID column is ignored - system generates unique database IDs</p>
                      <p><strong>Duplicate Prevention:</strong> Existing customers (same phone/email) are automatically skipped</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Debug Section */}
            {csvFile && csvData.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Debugging CSV Upload</h4>
                <p className="text-sm text-yellow-700 mb-2">
                  File uploaded but no valid records found. Please check the browser console for details
                  or ensure your CSV has the correct column names.
                </p>
                <div className="text-xs text-yellow-600">
                  Expected columns: ClientName, ClientNo (or "Client Name", "Client No")
                </div>
              </div>
            )}

            {/* Preview Section */}
            {csvPreview.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Preview ({csvPreview.length} of {csvData.length} records)</h4>
                  <div className="text-sm text-gray-500">
                    Total: {csvData.length} records ready to import
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvData.slice(0, 20).map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.phone}</TableCell>
                            <TableCell>{item.email || '-'}</TableCell>
                            <TableCell>{item.address || '-'}</TableCell>
                          </TableRow>
                        ))}
                        {csvData.length > 20 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-gray-500 py-4">
                              ... and {csvData.length - 20} more records
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploadingCsv && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Importing customers...</span>
                </div>
              </div>
            )}

            {/* Results Section */}
            {csvResults && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-3">📊 Import Summary</h4>
                  <div className="text-sm text-blue-700">
                    <div className="mb-2">
                      <strong>CSV File:</strong> {csvFile?.name} ({csvResults.total} records processed)
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>✅ <strong>{csvResults.imported}</strong> new customers added</div>
                      <div>⚠️ <strong>{csvResults.skipped}</strong> duplicates skipped</div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">{csvResults.imported}</div>
                    <div className="text-sm text-green-700 font-medium">New Customers</div>
                    <div className="text-xs text-green-600">Successfully Added</div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-600">{csvResults.skipped}</div>
                    <div className="text-sm text-yellow-700 font-medium">Duplicates</div>
                    <div className="text-xs text-yellow-600">Already in Database</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-gray-600">{csvResults.total}</div>
                    <div className="text-sm text-gray-700 font-medium">Total Processed</div>
                    <div className="text-xs text-gray-600">From CSV File</div>
                  </div>
                </div>

                {(csvResults.imported + csvResults.skipped) !== csvResults.total && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <h5 className="font-medium text-red-600 mb-2">⚠️ Discrepancy Detected</h5>
                    <div className="text-sm text-red-700">
                      Expected: {csvResults.total} | Processed: {csvResults.imported + csvResults.skipped}
                      <br />Some records may have had validation errors.
                    </div>
                  </div>
                )}

                {csvResults.errors.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-red-600">🚫 Issues Found ({csvResults.errors.length})</h5>
                    <div className="max-h-40 overflow-y-auto bg-red-50 border border-red-200 rounded-lg p-3">
                      {csvResults.errors.map((error: any, index: number) => (
                        <div key={index} className="text-sm text-red-700 mb-2 border-b border-red-200 pb-1">
                          <div className="font-medium">Row {error.row}:</div>
                          <div className="text-xs">{error.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-sm text-green-700">
                    <strong>✅ Import completed!</strong> Page will refresh in 10 seconds to show updated client list.
                    <br />
                    <span className="text-xs">Your total client count should now be: Previous count + {csvResults.imported} new customers</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 flex-shrink-0 pt-4 border-t border-gray-200 bg-white">
            <Button
              variant="outline"
              onClick={() => {
                setShowCsvDialog(false)
                resetCsvUpload()
                setError('')
              }}
              disabled={uploadingCsv}
            >
              Cancel
            </Button>
            {csvFile && csvData.length > 0 && !csvResults && (
              <Button
                onClick={handleCsvUpload}
                disabled={uploadingCsv}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadingCsv ? 'Importing...' : `Import ${csvData.length} Customers`}
              </Button>
            )}
            {csvFile && csvData.length === 0 && !uploadingCsv && (
              <div className="text-red-500 text-sm">
                No valid records found. Please check your CSV format.
              </div>
            )}
            {csvResults && (
              <Button
                onClick={() => {
                  setShowCsvDialog(false)
                  resetCsvUpload()
                  setError('')
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Done
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
