"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Users, 
  UserCheck, 
  UserX, 
  Crown,
  Search,
  Filter,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  RefreshCw,
  Shield
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/useAuth"
import UserPermissionsModal from '@/components/UserPermissionsModal'
import AdminProtectedRoute from '@/components/AdminProtectedRoute'

interface User {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'manager' | 'user';
  isActive: boolean;
  approved: boolean;
  reasonForAdminAccess?: string;
  stationId?: string;
  station?: {
    _id: string;
    name: string;
    location: string;
  };
  createdAt: string;
  updatedAt: string;
  pagePermissions: any[];
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function UserManagement() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);

  // Fetch users from API
  const fetchUsers = async (page = 1, search = "", role = "all", status = "all") => {
    try {
      setLoading(true);
      setError("");
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(role !== "all" && { role }),
        ...(status !== "all" && { status })
      });

      const response = await fetch(`/api/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };


  // Initial fetch
  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  // Handle search and filter changes
  useEffect(() => {
    if (token) {
      const timeoutId = setTimeout(() => {
        fetchUsers(1, searchTerm, filterRole, filterStatus);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, filterRole, filterStatus, token]);

  // User management functions
  const promoteToAdmin = async (userId: string) => {
    try {
      const response = await fetch('/api/users/promote-to-admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? data.user : user
        ));
        setMessage(data.message);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.error || 'Failed to promote user');
        setTimeout(() => setError(""), 3000);
      }
    } catch (error) {
      console.error('Error promoting user:', error);
      setError('Failed to promote user');
      setTimeout(() => setError(""), 3000);
    }
  };

  const promoteToManager = async (userId: string) => {
    try {
      const response = await fetch('/api/users/promote-to-manager', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? data.user : user
        ));
        setMessage(data.message);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.error || 'Failed to promote user to manager');
        setTimeout(() => setError(""), 3000);
      }
    } catch (error) {
      console.error('Error promoting user to manager:', error);
      setError('Failed to promote user to manager');
      setTimeout(() => setError(""), 3000);
    }
  };

  const demoteToManager = async (userId: string) => {
    try {
      const response = await fetch('/api/users/demote-to-manager', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? data.user : user
        ));
        setMessage(data.message);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.error || 'Failed to demote user to manager');
        setTimeout(() => setError(""), 3000);
      }
    } catch (error) {
      console.error('Error demoting user to manager:', error);
      setError('Failed to demote user to manager');
      setTimeout(() => setError(""), 3000);
    }
  };

  const demoteToUser = async (userId: string, currentRole: string) => {
    try {
      // Use specific API based on current role
      const apiEndpoint = currentRole === 'manager' 
        ? '/api/users/demote-manager-to-user'
        : currentRole === 'admin'
        ? '/api/users/demote-admin-to-user'
        : '/api/users/demote';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? data.user : user
        ));
        setMessage(data.message);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.error || 'Failed to demote user');
        setTimeout(() => setError(""), 3000);
      }
    } catch (error) {
      console.error('Error demoting user:', error);
      setError('Failed to demote user');
      setTimeout(() => setError(""), 3000);
    }
  };

  const toggleUserStatus = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    try {
      const response = await fetch('/api/users/status', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, isActive: !user.isActive }),
      });

      const data = await response.json();

      if (data.success) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? data.user : user
        ));
        setMessage(data.message);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.error || 'Failed to update user status');
        setTimeout(() => setError(""), 3000);
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      setError('Failed to update user status');
      setTimeout(() => setError(""), 3000);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      const response = await fetch('/api/users/approve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? data.user : user
        ));
        setMessage(data.message);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.error || 'Failed to approve user');
        setTimeout(() => setError(""), 3000);
      }
    } catch (error) {
      console.error('Error approving user:', error);
      setError('Failed to approve user');
      setTimeout(() => setError(""), 3000);
    }
  };

  const handlePageChange = (page: number) => {
    fetchUsers(page, searchTerm, filterRole, filterStatus);
  };

  const handleRefresh = () => {
    fetchUsers(1, searchTerm, filterRole, filterStatus);
  };

  const handleOpenPermissions = (user: User) => {
    setSelectedUser(user);
    setIsPermissionsModalOpen(true);
  };

  const handleClosePermissions = () => {
    setIsPermissionsModalOpen(false);
    setSelectedUser(null);
  };

  const handleSavePermissions = async (userId: string, permissions: any[]) => {
    try {
      const response = await fetch('/api/users/permissions', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, pagePermissions: permissions }),
      });
      const data = await response.json();
      if (data.success) {
        setUsers(prev => prev.map(user => user.id === userId ? { ...user, pagePermissions: data.user.pagePermissions } : user));
      } else {
        throw new Error(data.error || 'Failed to update permissions');
      }
    } catch (error) {
      throw error;
    }
  };

  const fixPermissions = async (userId: string) => {
    try {
      const response = await fetch('/api/users/fix-permissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (data.success) {
        setUsers(prev => prev.map(user => user.id === userId ? { ...user, pagePermissions: data.user.pagePermissions } : user));
        setMessage('Permissions fixed successfully');
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.error || 'Failed to fix permissions');
        setTimeout(() => setError(""), 3000);
      }
    } catch (error) {
      console.error('Error fixing permissions:', error);
      setError('Failed to fix permissions');
      setTimeout(() => setError(""), 3000);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading users...</span>
      </div>
    );
  }

  const activeUsers = users.filter(u => u.isActive).length;
  const inactiveUsers = users.filter(u => !u.isActive).length;
  const superAdminUsers = users.filter(u => u.role === 'superadmin').length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const managerUsers = users.filter(u => u.role === 'manager').length;
  const pendingUsers = users.filter(u => !u.approved).length;

  return (
    <AdminProtectedRoute requireSuperAdmin={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-gray-600">Manage user accounts and permissions</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Messages */}
        {message && (
          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-600">
              {message}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-600">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterRole === "all" ? "default" : "outline"}
              onClick={() => setFilterRole("all")}
              size="sm"
            >
              All Roles
            </Button>
            <Button
              variant={filterRole === "superadmin" ? "default" : "outline"}
              onClick={() => setFilterRole("superadmin")}
              size="sm"
            >
              Super Admins
            </Button>
            <Button
              variant={filterRole === "admin" ? "default" : "outline"}
              onClick={() => setFilterRole("admin")}
              size="sm"
            >
              Admins
            </Button>
            <Button
              variant={filterRole === "manager" ? "default" : "outline"}
              onClick={() => setFilterRole("manager")}
              size="sm"
            >
              Managers
            </Button>
            <Button
              variant={filterRole === "user" ? "default" : "outline"}
              onClick={() => setFilterRole("user")}
              size="sm"
            >
              Users
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              onClick={() => setFilterStatus("all")}
              size="sm"
            >
              All Status
            </Button>
            <Button
              variant={filterStatus === "active" ? "default" : "outline"}
              onClick={() => setFilterStatus("active")}
              size="sm"
            >
              Active
            </Button>
            <Button
              variant={filterStatus === "inactive" ? "default" : "outline"}
              onClick={() => setFilterStatus("inactive")}
              size="sm"
            >
              Inactive
            </Button>
            <Button
              variant={filterStatus === "pending" ? "default" : "outline"}
              onClick={() => setFilterStatus("pending")}
              size="sm"
            >
              Pending Approval
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Manage user accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
            <div className="space-y-4">
                {users.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={
                            user.role === 'superadmin' ? 'default' : 
                            user.role === 'admin' ? 'secondary' : 
                            user.role === 'manager' ? 'outline' : 
                            'outline'
                          }>
                            {user.role === 'superadmin' ? 'Super Admin' : 
                             user.role === 'admin' ? 'Admin' : 
                             user.role === 'manager' ? 'Manager' : 
                             'User'}
                          </Badge>
                        {user.station && (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            {user.station.name}
                          </Badge>
                        )}
                        <Badge variant={user.isActive ? 'default' : 'destructive'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                          {!user.approved && (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              Pending Approval
                            </Badge>
                          )}
                        </div>
                        {user.reasonForAdminAccess && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">
                              <strong>Reason:</strong> {user.reasonForAdminAccess}
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                      {!user.approved && (
                        <Button
                          size="sm"
                          onClick={() => approveUser(user.id)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      {user.role === 'user' && user.approved ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => promoteToManager(user.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Promote to Manager
                          </Button>
                        </div>
                      ) : (user.role === 'manager' && user.approved) ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => promoteToAdmin(user.id)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Crown className="h-4 w-4 mr-1" />
                            Promote to Admin
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => demoteToUser(user.id, user.role)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Demote to User
                          </Button>
                        </div>
                      ) : (user.role === 'admin' && user.approved) ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => demoteToManager(user.id)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Demote to Manager
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => demoteToUser(user.id, user.role)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Demote to User
                          </Button>
                        </div>
                      ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleUserStatus(user.id)}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPermissions(user)}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Permissions
                      </Button>
                  </div>
                </motion.div>
              ))}
            </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Showing page {pagination.currentPage} of {pagination.totalPages} 
                  ({pagination.totalUsers} total users)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <UserPermissionsModal
          user={selectedUser}
          isOpen={isPermissionsModalOpen}
          onClose={handleClosePermissions}
          onSave={handleSavePermissions}
        />

      </div>
    </AdminProtectedRoute>
  )
} 