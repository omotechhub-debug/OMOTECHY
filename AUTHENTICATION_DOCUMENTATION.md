# Authentication System Documentation

## Overview
This document provides a comprehensive guide to the authentication system used throughout the admin panel and client-facing pages of the OMOTECH HUB application.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Authentication Flow](#authentication-flow)
3. [Components & Files](#components--files)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Token Management](#token-management)
6. [Protected Routes](#protected-routes)
7. [API Route Protection](#api-route-protection)
8. [Current Implementation Details](#current-implementation-details)

---

## Architecture Overview

The authentication system uses a **JWT (JSON Web Token)** based approach with the following key components:

- **Frontend**: React Context API (`AuthContext`) and custom hooks (`useAuth`)
- **Backend**: JWT tokens signed with `JWT_SECRET` environment variable
- **Storage**: LocalStorage for token persistence
- **Database**: MongoDB with Mongoose User model
- **Password Hashing**: bcryptjs with salt rounds of 12

### Key Technologies
- **JWT**: `jsonwebtoken` library
- **Password Hashing**: `bcryptjs`
- **Token Expiry**: 7 days
- **Storage Keys**: 
  - Admin: `authToken` and `authUser`
  - Client: `clientAuthToken`

---

## Authentication Flow

### Admin Login Flow

```
1. User visits /admin/login
   ↓
2. User enters email and password
   ↓
3. Frontend calls POST /api/auth/admin-login
   ↓
4. Backend validates:
   - Email exists
   - User role is NOT 'user' (admin/superadmin/manager only)
   - User is active (isActive === true)
   - User is approved (approved === true)
   - Password matches (bcrypt.compare)
   ↓
5. Backend creates/updates pagePermissions if missing
   ↓
6. Backend generates JWT token with:
   - userId
   - email
   - role
   ↓
7. Backend returns:
   - success: true
   - user: { id, name, email, role, isActive, approved, pagePermissions, ... }
   - token: JWT string
   ↓
8. Frontend stores token in localStorage as 'authToken'
9. Frontend stores user object in localStorage as 'authUser'
10. Frontend updates AuthContext state
11. User redirected to /admin
```

### Client Login Flow

```
1. User visits /login
   ↓
2. User enters email and password
   ↓
3. Frontend calls POST /api/auth/client-login
   ↓
4. Backend validates:
   - Email exists
   - User is active and approved
   - Password matches
   ↓
5. Backend generates JWT token
   ↓
6. Frontend stores token in localStorage as 'clientAuthToken'
7. Frontend updates AuthContext state
8. User redirected to /shop
```

---

## Components & Files

### Frontend Components

#### 1. **`hooks/useAuth.ts`** - Admin Authentication Hook
**Location**: `hooks/useAuth.ts`

**Purpose**: Provides authentication state and methods for admin pages.

**Key Features**:
- Manages admin user state
- Handles login/logout
- Stores tokens in localStorage (`authToken`, `authUser`)
- Provides `isAuthenticated`, `isAdmin`, `isSuperAdmin`, `isManager` flags
- Refreshes user data from API

**Exported Functions**:
```typescript
login(email: string, password: string): Promise<{success, error?, pendingApproval?, message?}>
signup(name: string, email: string, password: string): Promise<{success, error?}>
logout(): void
refreshUserData(): Promise<boolean>
```

**State Management**:
- `user`: Current user object (from localStorage on mount)
- `token`: JWT token string
- `isLoading`: Initial load state

#### 2. **`contexts/AuthContext.tsx`** - Client Authentication Context
**Location**: `contexts/AuthContext.tsx`

**Purpose**: Provides authentication for client-facing pages (shop, user dashboard).

**Key Features**:
- Uses `clientAuthToken` in localStorage
- Auto-checks auth on mount and visibility change
- Debounced auth checks (2 second minimum interval)
- Syncs across browser tabs via storage events

**Exported Functions**:
```typescript
login(email: string, password: string): Promise<boolean>
signup(name: string, email: string, password: string): Promise<{success, error?}>
logout(): void
checkAuth(): Promise<void>
```

#### 3. **`components/AdminProtectedRoute.tsx`** - Route Protection Component
**Location**: `components/AdminProtectedRoute.tsx`

**Purpose**: Wraps admin pages to enforce authentication and authorization.

**Protection Levels**:
- **Basic**: Requires authentication (`isAuthenticated`)
- **Admin**: Requires admin/superadmin/manager role (`requireAdmin={true}`)
- **SuperAdmin**: Requires superadmin role (`requireSuperAdmin={true}`)
- **Manager**: Requires manager role (`requireManager={true}`)
- **Page-specific**: Checks `pagePermissions` for specific pages

**Behavior**:
- Redirects to `/admin/login` if not authenticated
- Redirects to `/dashboard` if regular user tries admin access
- Shows loading state during auth check
- Shows pending approval message if admin not approved
- Checks page permissions using `canViewPage()` from `lib/permissions.ts`

**Usage**:
```tsx
<AdminProtectedRoute requireAdmin={true} requiredPage="orders">
  <OrdersPage />
</AdminProtectedRoute>
```

#### 4. **`app/admin/layout.tsx`** - Admin Layout Wrapper
**Location**: `app/admin/layout.tsx`

**Purpose**: Provides consistent layout and navigation for all admin pages.

**Features**:
- Wraps all admin pages with `AuthProvider` and `AdminProtectedRoute`
- Provides sidebar navigation based on user permissions
- Handles logout functionality
- Skips layout rendering on login/signup/pending-approval pages

---

### Backend Components

#### 1. **`lib/auth.ts`** - Authentication Utilities
**Location**: `lib/auth.ts`

**Exported Functions**:

**`verifyToken(token: string): DecodedToken | null`**
- Verifies JWT token using `JWT_SECRET`
- Returns decoded token or null if invalid/expired

**`getTokenFromRequest(request: NextRequest): string | null`**
- Extracts Bearer token from Authorization header
- Returns token string or null

**`requireAuth(request: NextRequest): Promise<DecodedToken | null>`**
- Verifies token and returns decoded user info
- Returns null if invalid

**`requireAdmin(handler: Function)`**
- Middleware wrapper for API routes
- Requires valid token
- Requires role to be 'admin' or 'superadmin'
- Adds `user` to request object

**`requireSuperAdmin(handler: Function)`**
- Middleware wrapper for API routes
- Requires valid token
- Requires role to be 'superadmin'
- Adds `user` to request object

#### 2. **`app/api/auth/admin-login/route.ts`** - Admin Login Endpoint
**Location**: `app/api/auth/admin-login/route.ts`

**Method**: POST

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Validation Steps**:
1. Check email and password provided
2. Find user by email (with password field)
3. **Block regular users** (role === 'user') → 403 error
4. Check `isActive === true` → 401 if false
5. Check `approved === true` → 403 with `PENDING_APPROVAL` code if false
6. Verify password using `user.comparePassword()`
7. Create/update `pagePermissions` if missing
8. Generate JWT token (7 day expiry)
9. Return user data and token

**Response (Success)**:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "admin",
    "isActive": true,
    "approved": true,
    "pagePermissions": [...]
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Welcome back, Admin! Admin access granted."
}
```

**Response (Pending Approval)**:
```json
{
  "error": "Admin account is pending approval",
  "code": "PENDING_APPROVAL",
  "email": "admin@example.com"
}
```

#### 3. **`app/api/auth/client-login/route.ts`** - Client Login Endpoint
**Location**: `app/api/auth/client-login/route.ts`

**Method**: POST

**Similar to admin-login but**:
- Allows all user roles (including 'user')
- Uses `clientAuthToken` storage key
- Simpler permission structure

#### 4. **`app/api/auth/client-me/route.ts`** - Auth Check Endpoint
**Location**: `app/api/auth/client-me/route.ts`

**Method**: GET

**Headers**: `Authorization: Bearer <token>`

**Purpose**: Validates token and returns current user data.

**Used by**: `AuthContext.checkAuth()` to verify token validity.

---

### Database Models

#### **`lib/models/User.ts`** - User Schema
**Location**: `lib/models/User.ts`

**Schema Fields**:
```typescript
{
  name: string (required)
  email: string (required, unique, lowercase)
  password: string (required, minlength: 6)
  role: 'superadmin' | 'admin' | 'manager' | 'user' (default: 'user')
  isActive: boolean (default: true)
  approved: boolean (default: true for 'user', false for admin roles)
  reasonForAdminAccess?: string (required for admin roles)
  pagePermissions: IPagePermission[] (auto-generated based on role)
  stationId?: ObjectId (required for 'manager')
  managedStations?: ObjectId[]
  createdAt: Date
  updatedAt: Date
}
```

**Pre-save Hook**:
- Hashes password with bcrypt (salt rounds: 12) before saving
- Only hashes if password was modified

**Methods**:
- `comparePassword(candidatePassword: string): Promise<boolean>`
  - Compares plain password with hashed password

**Page Permissions Defaults**:

**Superadmin**:
- All pages: `canView: true`, `canEdit: true`, `canDelete: true`

**Admin**:
- View: All pages
- Edit: dashboard, orders, pos, customers, services, categories, stations
- Delete: orders, customers, stations

**Manager**:
- View: dashboard, orders, pos, expenses
- Edit: orders, pos, expenses
- Delete: orders

**User**:
- View: dashboard, orders, pos, customers
- Edit: orders, pos
- Delete: false

---

## User Roles & Permissions

### Role Hierarchy

1. **superadmin** - Full system access
   - Can view all pages
   - Can edit all pages
   - Can delete on all pages
   - Manages stations and inventory

2. **admin** - Standard admin access
   - Can view most pages
   - Limited edit permissions
   - Limited delete permissions
   - Cannot access superadmin-only features

3. **manager** - Station-specific access
   - Can only access: dashboard, orders, pos, expenses
   - Can edit: orders, pos, expenses
   - Can delete: orders
   - Restricted to their assigned station(s)

4. **user** - Regular customer
   - Cannot access admin pages
   - Can access client-facing pages (shop, profile)

### Permission System

**`lib/permissions.ts`** provides utility functions:

- `canViewPage(user, page): boolean`
- `canEditPage(user, page): boolean`
- `canDeletePage(user, page): boolean`
- `getAccessiblePages(user): string[]`
- `isAdminUser(user): boolean`
- `isSuperAdminUser(user): boolean`
- `isManagerUser(user): boolean`

**Page Keys**:
- dashboard, orders, pos, customers, services, categories
- reports, users, expenses, gallery, testimonials
- promotions, stations, settings, inventory, inventory-management
- mpesa-transactions, social-media

---

## Token Management

### Token Structure

**JWT Payload**:
```json
{
  "userId": "mongodb_object_id",
  "email": "user@example.com",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Token Storage

**Admin Pages**:
- `localStorage.getItem('authToken')` - JWT token
- `localStorage.getItem('authUser')` - User object (JSON stringified)

**Client Pages**:
- `localStorage.getItem('clientAuthToken')` - JWT token

### Token Lifecycle

1. **Creation**: On successful login
2. **Storage**: Saved to localStorage immediately
3. **Validation**: Checked on page load and API requests
4. **Expiry**: 7 days from creation
5. **Refresh**: Not implemented (user must re-login)
6. **Invalidation**: On logout or token expiry

### Token Usage in API Requests

**Headers**:
```
Authorization: Bearer <token>
```

**Example**:
```typescript
fetch('/api/orders', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

---

## Protected Routes

### Admin Routes Protection

**All admin routes** (except `/admin/login`, `/admin/signup`, `/admin/pending-approval`) are protected by:

1. **`app/admin/layout.tsx`**:
   - Wraps with `<AuthProvider>`
   - Wraps with `<AdminProtectedRoute requireAdmin={true}>`

2. **`components/AdminProtectedRoute.tsx`**:
   - Checks authentication
   - Checks user role
   - Checks page permissions
   - Redirects if unauthorized

### Page-Specific Protection

**Example**: Orders page
```tsx
<AdminProtectedRoute requiredPage="orders">
  <OrdersPage />
</AdminProtectedRoute>
```

This checks:
- User is authenticated
- User has `canView: true` for 'orders' page
- User role allows access

---

## API Route Protection

### Using Middleware Wrappers

**Example 1: Admin-only route**
```typescript
import { requireAdmin } from '@/lib/auth'

export const GET = requireAdmin(async (request: NextRequest) => {
  const user = (request as any).user // Decoded token info
  // ... route logic
})
```

**Example 2: Superadmin-only route**
```typescript
import { requireSuperAdmin } from '@/lib/auth'

export const POST = requireSuperAdmin(async (request: NextRequest) => {
  const user = (request as any).user
  // ... route logic
})
```

### Manual Token Verification

**Example**:
```typescript
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request)
  if (!token) {
    return NextResponse.json({ error: 'No token' }, { status: 401 })
  }
  
  const decoded = verifyToken(token)
  if (!decoded) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
  
  // Check role
  if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  
  // ... route logic
}
```

---

## Current Implementation Details

### Admin Login Page
**Location**: `app/admin/login/page.tsx`

**Features**:
- Email/password form
- Password visibility toggle
- Remember me checkbox (UI only, not implemented)
- Forgot password link (not implemented)
- Redirects if already authenticated
- Shows pending approval message
- Uses `useAuth()` hook from `hooks/useAuth.ts`

### Authentication State Management

**Admin Context** (`hooks/useAuth.ts`):
- Loads from localStorage on mount
- Updates state on login
- Clears state on logout
- Dispatches `auth:logout` event for cross-tab sync

**Client Context** (`contexts/AuthContext.tsx`):
- Checks auth on mount
- Re-checks on visibility change
- Debounces checks (2 second minimum)
- Syncs across tabs via storage events

### Security Features

1. **Password Hashing**: bcryptjs with 12 salt rounds
2. **JWT Signing**: Uses `JWT_SECRET` from environment
3. **Token Expiry**: 7 days
4. **Role-based Access Control**: Enforced at route and API level
5. **Page Permissions**: Granular control per page
6. **Account Status Checks**: `isActive` and `approved` flags
7. **Regular User Blocking**: Admin routes explicitly block 'user' role

### Error Handling

**Login Errors**:
- Invalid credentials → 401
- Account deactivated → 401
- Pending approval → 403 with `PENDING_APPROVAL` code
- Regular user attempting admin login → 403
- Network errors → Handled gracefully

**Token Errors**:
- Missing token → 401
- Invalid token → 401
- Expired token → 401
- Wrong role → 403

---

## Google Sign-In Integration ✅

Google Sign-In has been successfully integrated and works identically to email/password authentication.

### Implementation Status

✅ **Completed**:
- User model updated with `googleId` and `authProvider` fields
- Google login API route created (`/api/auth/google-login`)
- Admin login page updated with Google Sign-In button
- Auth hooks updated with `loginWithGoogle()` method
- Backward compatibility maintained (email/password still works)
- Same token format and storage
- Same permission checks and security

### How It Works

1. **User clicks Google Sign-In button** on `/admin/login`
2. **Google Identity Services** handles OAuth flow
3. **Frontend sends ID token** to `/api/auth/google-login`
4. **Backend verifies token** using `google-auth-library`
5. **Backend finds user** by email or Google ID
6. **Backend generates JWT token** (same format as email/password)
7. **Frontend stores token** in same localStorage keys
8. **User redirected** to admin panel (same flow)

### Security Features

- ✅ No auto-account creation (admin accounts must exist first)
- ✅ Role verification (regular users blocked)
- ✅ Approval check (pending approval handled)
- ✅ Token verification (server-side)
- ✅ Same JWT format and expiry
- ✅ Same permission system

### Setup Required

See `GOOGLE_SIGNIN_SETUP.md` for complete setup instructions.

**Required Environment Variables**:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Backward Compatibility

- ✅ Email/password login still works
- ✅ Existing users continue to work
- ✅ All admin pages work identically
- ✅ API routes work the same way
- ✅ Permissions system unchanged

---

## Summary

The current authentication system is a robust JWT-based system with:
- **Dual contexts**: Admin (`hooks/useAuth.ts`) and Client (`contexts/AuthContext.tsx`)
- **Role-based access**: superadmin, admin, manager, user
- **Page-level permissions**: Granular control per page
- **Token-based API auth**: JWT tokens in Authorization header
- **Protected routes**: Component-level and API-level protection
- **Security**: Password hashing, token expiry, account status checks

All admin pages use the same authentication flow, ensuring consistent security and user experience across the entire admin panel.

