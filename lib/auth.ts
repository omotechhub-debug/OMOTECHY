import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables');
}

export interface DecodedToken {
  userId: string;
  email: string;
  role: string;
  name: string;
  iat: number;
  exp: number;
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch (error) {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function requireAuth(request: NextRequest) {
  const token = getTokenFromRequest(request);
  
  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);
  
  if (!decoded) {
    return null;
  }

  return decoded;
}

export function requireAuthWrapper(handler: Function) {
  return async (request: NextRequest, context?: { params: Promise<{ [key: string]: string }> }) => {
    const user = await requireAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Add user info to request
    (request as any).user = user;
    
    return handler(request, context);
  };
}

export function requireAdmin(handler: Function) {
  return async (request: NextRequest, context?: { params: Promise<{ [key: string]: string }> }) => {
    const token = getTokenFromRequest(request);
    console.log("requireAdmin: Authorization header token:", token);

    if (!token) {
      console.log("requireAdmin: No token found");
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    console.log("requireAdmin: Decoded token:", decoded);

    if (!decoded) {
      console.log("requireAdmin: Invalid or expired token");
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      console.log("requireAdmin: Not admin or superadmin, role is:", decoded.role);
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Add user info to request
    (request as any).user = decoded;
    return handler(request, context);
  };
}

export function requireSuperAdmin(handler: Function) {
  return async (request: NextRequest, context?: { params: Promise<{ [key: string]: string }> }) => {
    const token = getTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Superadmin access required' },
        { status: 403 }
      );
    }

    // Add user info to request
    (request as any).user = decoded;
    
    return handler(request, context);
  };
} 