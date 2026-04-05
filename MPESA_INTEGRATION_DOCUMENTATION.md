# M-Pesa PayBill Integration - Complete Documentation

This document provides a complete guide to implementing M-Pesa PayBill integration for order payments. Follow this guide step-by-step to recreate the entire integration without errors.

---

## Table of Contents

1. [Overview](#overview)
2. [Environment Variables Setup](#environment-variables-setup)
3. [Database Models](#database-models)
4. [M-Pesa Service Implementation](#m-pesa-service-implementation)
5. [API Routes](#api-routes)
6. [C2B Registration](#c2b-registration)
7. [STK Push Implementation](#stk-push-implementation)
8. [Frontend Integration](#frontend-integration)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This integration supports two M-Pesa payment methods:
1. **STK Push (Lipa na M-Pesa Online)**: Customer receives a prompt on their phone to enter M-Pesa PIN
2. **C2B (Customer to Business)**: Customer initiates payment directly from their M-Pesa menu

### Architecture Flow

```
Customer → Frontend → API Route → M-Pesa Service → Safaricom API
                                    ↓
                              Database (Order, MpesaTransaction)
                                    ↓
                              Callback Handler → Update Order Status
```

---

## Environment Variables Setup

Add these environment variables to your `.env.local` file:

```env
# M-Pesa API Credentials (Get from Safaricom Developer Portal)
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_PASSKEY=your_passkey_here
MPESA_SHORT_CODE=your_paybill_number_here
MPESA_TILL_NUMBER=your_till_number_here  # Optional: Only if using Till Number
MPESA_ENVIRONMENT=sandbox  # or 'production' for live

# M-Pesa Callback URLs (Must be HTTPS in production)
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
MPESA_C2B_VALIDATION_URL=https://yourdomain.com/api/payments/c2b/validation
MPESA_C2B_CONFIRMATION_URL=https://yourdomain.com/api/payments/c2b/confirmation
MPESA_C2B_RESPONSE_TYPE=Completed  # or 'Cancelled'
MPESA_C2B_ENABLE_VALIDATION=true  # Set to false to skip validation

# Base URL for your application
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### Getting M-Pesa Credentials

1. **Register at Safaricom Developer Portal**: https://developer.safaricom.co.ke
2. **Create an App** to get `Consumer Key` and `Consumer Secret`
3. **Get Passkey** from your PayBill account settings
4. **Short Code** is your PayBill number (e.g., 174379 for sandbox)
5. **Till Number** (optional) - Only if you have a separate Till Number

---

## Database Models

### Order Model Extensions

Add these fields to your Order model:

```typescript
// In lib/models/Order.ts

import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // M-Pesa STK Push fields
  checkoutRequestId: String,
  merchantRequestId: String,
  phoneNumber: String,
  paymentMethod: {
    type: String,
    enum: ['mpesa_stk', 'mpesa_c2b', 'cash', 'bank_transfer'],
    default: 'mpesa_stk'
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'pending', 'paid', 'partial', 'failed'],
    default: 'unpaid'
  },
  paymentInitiatedAt: Date,
  paymentCompletedAt: Date,
  
  // M-Pesa payment details
  mpesaReceiptNumber: String,
  transactionDate: Date,
  amountPaid: Number,
  resultCode: Number,
  resultDescription: String,
  
  // Pending payment tracking
  pendingMpesaPayment: {
    checkoutRequestId: String,
    merchantRequestId: String,
    amount: Number,
    phoneNumber: String,
    paymentType: {
      type: String,
      enum: ['full', 'partial']
    },
    initiatedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed']
    }
  },
  
  // Partial payments array
  partialPayments: [{
    amount: Number,
    date: Date,
    mpesaReceiptNumber: String,
    phoneNumber: String,
    method: {
      type: String,
      enum: ['mpesa_stk', 'mpesa_c2b', 'cash', 'bank_transfer']
    }
  }],
  
  remainingBalance: {
    type: Number,
    default: 0
  },
  
  // C2B payment details (nested for backward compatibility)
  c2bPayment: {
    transactionId: String,
    mpesaReceiptNumber: String,
    transactionDate: Date,
    phoneNumber: String,
    amountPaid: Number,
    transactionType: String,
    billRefNumber: String,
    thirdPartyTransID: String,
    orgAccountBalance: String,
    customerName: String,
    paymentCompletedAt: Date
  }
}, {
  timestamps: true
});

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
```

### MpesaTransaction Model

Create a new model to track all M-Pesa transactions:

```typescript
// lib/models/MpesaTransaction.ts

import mongoose from 'mongoose';

const MpesaTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  transactionType: {
    type: String,
    enum: ['STK_PUSH', 'C2B'],
    required: true
  },
  phoneNumber: String,
  amountPaid: Number,
  mpesaReceiptNumber: String,
  transactionDate: Date,
  paymentCompletedAt: Date,
  
  // STK Push specific fields
  checkoutRequestId: String,
  merchantRequestId: String,
  resultCode: String,
  resultDescription: String,
  customerMessage: String,
  
  // C2B specific fields
  billRefNumber: String,
  thirdPartyTransID: String,
  orgAccountBalance: String,
  customerName: String,
  firstName: String,
  middleName: String,
  lastName: String,
  
  // Order connection
  isConnectedToOrder: {
    type: Boolean,
    default: false
  },
  connectedOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  connectedAt: Date,
  connectedBy: String,
  
  // Pending order reference
  pendingOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  
  // Confirmation status
  confirmationStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected'],
    default: 'pending'
  },
  confirmationNotes: String,
  confirmedCustomerName: String,
  
  // Status tracking
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Cancelled'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
MpesaTransactionSchema.index({ checkoutRequestId: 1 });
MpesaTransactionSchema.index({ transactionId: 1 });
MpesaTransactionSchema.index({ connectedOrderId: 1 });
MpesaTransactionSchema.index({ phoneNumber: 1 });
MpesaTransactionSchema.index({ transactionDate: 1 });

export default mongoose.models.MpesaTransaction || mongoose.model('MpesaTransaction', MpesaTransactionSchema);
```

---

## M-Pesa Service Implementation

Create the M-Pesa service file:

```typescript
// lib/mpesa.ts

import axios from 'axios';

// ==================== INTERFACES ====================

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortCode: string;
  tillNumber: string;
  environment: 'sandbox' | 'production';
}

export interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  orderId: string;
  callbackUrl: string;
  paymentType?: 'full' | 'partial';
}

export interface STKPushResponse {
  success: boolean;
  checkoutRequestId?: string;
  responseCode?: string;
  responseDescription?: string;
  customerMessage?: string;
  merchantRequestId?: string;
  error?: string;
  details?: any;
}

export interface C2BRegisterURLResponse {
  success: boolean;
  originatorCoversationID?: string;
  responseCode?: string;
  responseDescription?: string;
  error?: string;
  details?: any;
}

// ==================== MPESA SERVICE CLASS ====================

class MpesaService {
  private config: MpesaConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.config = {
      consumerKey: process.env.MPESA_CONSUMER_KEY || '',
      consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
      passkey: process.env.MPESA_PASSKEY || '',
      shortCode: process.env.MPESA_SHORT_CODE || '',
      tillNumber: process.env.MPESA_TILL_NUMBER || '',
      environment: (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
    };
    
    this.validateConfiguration();
  }

  private validateConfiguration(): void {
    const errors: string[] = [];
    
    if (!this.config.consumerKey || this.config.consumerKey.length < 10) {
      errors.push('Invalid MPESA_CONSUMER_KEY');
    }
    
    if (!this.config.consumerSecret || this.config.consumerSecret.length < 10) {
      errors.push('Invalid MPESA_CONSUMER_SECRET');
    }
    
    if (!this.config.passkey || this.config.passkey.length < 10) {
      errors.push('Invalid MPESA_PASSKEY');
    }
    
    if (!this.config.shortCode || this.config.shortCode.length < 5) {
      errors.push('Invalid MPESA_SHORT_CODE');
    }
    
    if (!['sandbox', 'production'].includes(this.config.environment)) {
      errors.push('Invalid MPESA_ENVIRONMENT (must be sandbox or production)');
    }
    
    if (errors.length > 0) {
      console.warn('⚠️ M-Pesa Configuration Warnings:', errors);
    }
  }

  private getBaseUrl(): string {
    return this.config.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async generateAccessToken(): Promise<string> {
    try {
      // Check if we have a valid cached token
      if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.accessToken;
      }

      if (!this.config.consumerKey || !this.config.consumerSecret) {
        throw new Error('M-Pesa consumer key or secret is missing. Please check your environment variables.');
      }

      const auth = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');
      
      const response = await axios.get(`${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (!response.data.access_token) {
        throw new Error('Invalid access token response from M-Pesa API');
      }

      this.accessToken = response.data.access_token;
      // Cache token for 55 minutes (tokens expire in 1 hour)
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);

      return this.accessToken;
    } catch (error: any) {
      console.error('❌ Error generating M-Pesa access token:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      throw new Error(`Failed to generate access token: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const second = now.getSeconds().toString().padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  private generatePassword(timestamp: string): string {
    const data = `${this.config.shortCode}${this.config.passkey}${timestamp}`;
    return Buffer.from(data).toString('base64');
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    let phone = phoneNumber.replace(/\D/g, '');
    
    // Handle different phone number formats
    if (phone.startsWith('0')) {
      phone = '254' + phone.substring(1);
    } else if (phone.startsWith('+254')) {
      phone = phone.substring(1);
    } else if (phone.startsWith('254')) {
      // Already in correct format
    } else if (phone.length === 9) {
      phone = '254' + phone;
    }
    
    return phone;
  }

  // ==================== STK PUSH METHODS ====================

  async initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
    try {
      const accessToken = await this.generateAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);
      const formattedPhone = this.formatPhoneNumber(request.phoneNumber);

      // For PayBill, use CustomerPayBillOnline
      // PartyB should be the same as BusinessShortCode for PayBill
      const payload = {
        BusinessShortCode: this.config.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(request.amount),
        PartyA: formattedPhone,
        PartyB: this.config.shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: request.callbackUrl,
        AccountReference: request.orderId,
        TransactionDesc: `Payment for Order ${request.orderId}`
      };

      console.log('M-Pesa Configuration:', {
        shortCode: this.config.shortCode,
        environment: this.config.environment,
        baseUrl: this.getBaseUrl()
      });
      console.log('STK Push payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${this.getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      console.log('STK Push response:', response.data);

      if (response.data.ResponseCode === '0') {
        return {
          success: true,
          checkoutRequestId: response.data.CheckoutRequestID,
          responseCode: response.data.ResponseCode,
          responseDescription: response.data.ResponseDescription,
          customerMessage: response.data.CustomerMessage,
          merchantRequestId: response.data.MerchantRequestID
        };
      } else {
        return {
          success: false,
          error: response.data.ResponseDescription || 'Failed to initiate STK Push',
          responseCode: response.data.ResponseCode,
          responseDescription: response.data.ResponseDescription,
          customerMessage: response.data.CustomerMessage,
          merchantRequestId: response.data.MerchantRequestID,
          checkoutRequestId: response.data.CheckoutRequestID
        };
      }
    } catch (error: any) {
      console.error('Error initiating STK Push:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Internal server error',
        details: error.response?.data || error.stack
      };
    }
  }

  async querySTKStatus(checkoutRequestId: string): Promise<any> {
    try {
      const accessToken = await this.generateAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      const payload = {
        BusinessShortCode: this.config.shortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const response = await axios.post(
        `${this.getBaseUrl()}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      if (response.data.ResultCode === '0') {
        return {
          success: true,
          resultCode: response.data.ResultCode,
          resultDesc: response.data.ResultDesc,
          mpesaReceiptNumber: response.data.MpesaReceiptNumber,
          transactionDate: response.data.TransactionDate,
          amount: response.data.Amount,
          phoneNumber: response.data.PhoneNumber,
          checkoutRequestId: response.data.CheckoutRequestID
        };
      } else {
        return {
          success: false,
          resultCode: response.data.ResultCode,
          resultDesc: response.data.ResultDesc,
          isPending: response.data.ResultCode === '1032' // 1032 means transaction is still being processed
        };
      }
    } catch (error: any) {
      console.error('Error querying STK status:', error);
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Failed to query payment status'
      };
    }
  }

  // ==================== C2B REGISTRATION ====================

  async registerC2BURLs(): Promise<C2BRegisterURLResponse> {
    try {
      if (!this.config.consumerKey || !this.config.consumerSecret) {
        return {
          success: false,
          error: 'M-Pesa consumer key or secret is missing'
        };
      }

      if (!this.config.shortCode) {
        return {
          success: false,
          error: 'M-Pesa short code is not configured'
        };
      }

      let accessToken: string;
      try {
        accessToken = await this.generateAccessToken();
      } catch (tokenError: any) {
        return {
          success: false,
          error: tokenError.message || 'Failed to generate access token',
          responseCode: '401',
          responseDescription: 'Access token generation failed'
        };
      }

      const validationURL = process.env.MPESA_C2B_VALIDATION_URL;
      const confirmationURL = process.env.MPESA_C2B_CONFIRMATION_URL;
      const responseType = (process.env.MPESA_C2B_RESPONSE_TYPE as 'Completed' | 'Cancelled') || 'Completed';

      if (!validationURL || !confirmationURL) {
        return {
          success: false,
          error: 'C2B validation and confirmation URLs must be configured'
        };
      }

      const registerUrl = `${this.getBaseUrl()}/mpesa/c2b/v2/registerurl`;

      const payload = {
        ShortCode: this.config.shortCode,
        ResponseType: responseType,
        ConfirmationURL: confirmationURL,
        ValidationURL: validationURL
      };

      console.log('Registering C2B URLs:', {
        url: registerUrl,
        payload: { ...payload, ShortCode: this.config.shortCode }
      });

      const response = await axios.post(registerUrl, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });

      if (response.status === 200 && response.data.ResponseCode === '0') {
        return {
          success: true,
          originatorCoversationID: response.data.OriginatorConversationID,
          responseCode: response.data.ResponseCode,
          responseDescription: response.data.ResponseDescription
        };
      } else {
        return {
          success: false,
          error: response.data.errorMessage || response.data.ResponseDescription || 'Failed to register C2B URLs',
          responseCode: response.data.ResponseCode || String(response.status),
          responseDescription: response.data.ResponseDescription || response.statusText,
          details: response.data
        };
      }
    } catch (error: any) {
      console.error('C2B URL registration error:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
        responseCode: error.response?.status?.toString() || '500',
        responseDescription: error.response?.statusText || 'Internal server error',
        details: error.response?.data || error.stack
      };
    }
  }
}

// Export singleton instance
export const mpesaService = new MpesaService();
```

---

## API Routes

### 1. STK Push Initiation Route

```typescript
// app/api/mpesa/initiate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { mpesaService } from '@/lib/mpesa';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import MpesaTransaction from '@/lib/models/MpesaTransaction';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !['admin', 'superadmin', 'manager', 'user'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    const { orderId, phoneNumber, amount, paymentType = 'full' } = await request.json();

    if (!orderId || !phoneNumber || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, phoneNumber, amount' },
        { status: 400 }
      );
    }

    await connectDB();

    const order = await Order.findById(orderId).lean();
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 400 });
    }

    // Manager station authorization check (if needed)
    if (decoded.role === 'manager') {
      let managerStationId = decoded.stationId || decoded.managedStations?.[0];
      if (!managerStationId) {
        const manager = await User.findById(decoded.userId).select('stationId managedStations').lean();
        if (manager) {
          managerStationId = manager.stationId || manager.managedStations?.[0];
        }
      }
      
      let orderStationId = null;
      if (order.station?.stationId) {
        orderStationId = typeof order.station.stationId === 'object' 
          ? order.station.stationId._id.toString()
          : order.station.stationId.toString();
      } else if (order.stationId) {
        orderStationId = order.stationId.toString();
      }
      
      if (managerStationId && orderStationId && managerStationId.toString() !== orderStationId) {
        return NextResponse.json({
          error: 'You can only initiate payments for orders in your assigned station'
        }, { status: 403 });
      }
    }

    const callbackUrl = process.env.MPESA_CALLBACK_URL ||
      `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.econuru.co.ke'}/api/mpesa/callback`;

    if (!callbackUrl.startsWith('https://')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid callback URL configuration - must use HTTPS'
      }, { status: 500 });
    }

    const result = await mpesaService.initiateSTKPush({
      phoneNumber,
      amount: parseFloat(amount),
      orderId,
      callbackUrl
    });

    if (result.success && result.checkoutRequestId) {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'pending',
        paymentMethod: 'mpesa_stk',
        checkoutRequestId: result.checkoutRequestId,
        phoneNumber: phoneNumber,
        paymentInitiatedAt: new Date(),
        $set: {
          'pendingMpesaPayment': {
            checkoutRequestId: result.checkoutRequestId,
            merchantRequestId: result.merchantRequestId,
            amount: amount,
            phoneNumber: phoneNumber,
            paymentType: paymentType,
            initiatedAt: new Date(),
            status: 'pending'
          }
        }
      });

      await MpesaTransaction.create({
        transactionType: 'STK_PUSH',
        phoneNumber: phoneNumber,
        amountPaid: parseFloat(amount),
        checkoutRequestId: result.checkoutRequestId,
        merchantRequestId: result.merchantRequestId,
        status: 'Pending',
        transactionDate: new Date(),
        connectedOrderId: orderId,
        pendingOrderId: orderId,
        confirmationStatus: 'pending'
      });

      return NextResponse.json({
        success: true,
        message: 'STK Push sent successfully',
        checkoutRequestId: result.checkoutRequestId,
        customerMessage: result.customerMessage
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to initiate payment'
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error initiating M-Pesa payment:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. STK Push Callback Handler

```typescript
// app/api/mpesa/callback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import MpesaTransaction from '@/lib/models/MpesaTransaction';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    console.log('M-Pesa Callback received:', JSON.stringify(body, null, 2));

    const stkCallback = body.Body?.stkCallback;
    if (!stkCallback) {
      return NextResponse.json({ success: false, message: 'Invalid callback format' });
    }

    const {
      CheckoutRequestID: checkoutRequestId,
      ResultCode: resultCode,
      ResultDesc: resultDesc
    } = stkCallback;

    const order = await Order.findOne({
      $or: [
        { checkoutRequestId: checkoutRequestId },
        { 'pendingMpesaPayment.checkoutRequestId': checkoutRequestId }
      ]
    });

    if (!order) {
      console.error('Order not found for checkoutRequestId:', checkoutRequestId);
      return NextResponse.json({ success: false, message: 'Order not found' });
    }

    if (resultCode === 0) {
      // Payment successful
      const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
      const receiptNumber = callbackMetadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
      const transactionDate = callbackMetadata.find((item: any) => item.Name === 'TransactionDate')?.Value;
      const amount = callbackMetadata.find((item: any) => item.Name === 'Amount')?.Value;
      const phoneNumber = callbackMetadata.find((item: any) => item.Name === 'PhoneNumber')?.Value;

      const amountPaid = amount || order.totalAmount;
      const remainingBalance = Math.max(0, (order.remainingBalance || order.totalAmount) - amountPaid);
      const isFullyPaid = remainingBalance === 0;

      await Order.findByIdAndUpdate(order._id, {
        paymentStatus: isFullyPaid ? 'paid' : 'partial',
        paymentMethod: 'mpesa_stk',
        mpesaReceiptNumber: receiptNumber,
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
        amountPaid: amountPaid,
        remainingBalance: remainingBalance,
        resultCode: 0,
        resultDescription: resultDesc,
        paymentCompletedAt: new Date(),
        $push: {
          partialPayments: {
            amount: amountPaid,
            date: new Date(),
            mpesaReceiptNumber: receiptNumber,
            phoneNumber: phoneNumber || order.phoneNumber,
            method: 'mpesa_stk'
          }
        }
      });

      // Update MpesaTransaction
      await MpesaTransaction.findOneAndUpdate(
        { checkoutRequestId: checkoutRequestId },
        {
          status: 'Completed',
          mpesaReceiptNumber: receiptNumber,
          transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
          amountPaid: amountPaid,
          phoneNumber: phoneNumber,
          resultCode: '0',
          resultDescription: resultDesc,
          paymentCompletedAt: new Date(),
          confirmationStatus: 'confirmed'
        }
      );

      console.log(`✅ Payment successful for order ${order.orderNumber}: ${receiptNumber}`);
    } else {
      // Payment failed
      await Order.findByIdAndUpdate(order._id, {
        paymentStatus: 'failed',
        resultCode: resultCode,
        resultDescription: resultDesc,
        paymentCompletedAt: new Date()
      });

      await MpesaTransaction.findOneAndUpdate(
        { checkoutRequestId: checkoutRequestId },
        {
          status: 'Failed',
          resultCode: String(resultCode),
          resultDescription: resultDesc,
          confirmationStatus: 'rejected'
        }
      );

      console.log(`❌ Payment failed for order ${order.orderNumber}: ${resultDesc}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Callback processing error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### 3. STK Push Status Query Route

```typescript
// app/api/mpesa/status/[checkoutRequestId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { mpesaService } from '@/lib/mpesa';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import MpesaTransaction from '@/lib/models/MpesaTransaction';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { checkoutRequestId: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !['admin', 'superadmin', 'manager', 'user'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    await connectDB();

    const { checkoutRequestId } = await params;

    if (!checkoutRequestId) {
      return NextResponse.json({ error: 'Checkout Request ID is required' }, { status: 400 });
    }

    // Check local transaction first
    const localTransaction = await MpesaTransaction.findOne({ checkoutRequestId });

    if (localTransaction && localTransaction.status === 'Completed') {
      return NextResponse.json({
        success: true,
        message: 'Payment already completed',
        resultCode: '0',
        resultDesc: 'Payment already completed locally',
        mpesaReceiptNumber: localTransaction.mpesaReceiptNumber,
        amount: localTransaction.amountPaid,
        phoneNumber: localTransaction.phoneNumber,
        transactionDate: localTransaction.transactionDate,
        checkoutRequestId: localTransaction.checkoutRequestId
      });
    }

    // Query Safaricom API
    const result = await mpesaService.querySTKStatus(checkoutRequestId);

    if (result.success) {
      if (localTransaction) {
        await MpesaTransaction.findByIdAndUpdate(localTransaction._id, {
          status: 'Completed',
          resultCode: result.resultCode,
          resultDescription: result.resultDesc,
          mpesaReceiptNumber: result.mpesaReceiptNumber,
          transactionDate: result.transactionDate,
          amountPaid: result.amount,
          phoneNumber: result.phoneNumber,
          updatedAt: new Date()
        });
      }

      if (result.resultCode === '0' && localTransaction?.connectedOrderId) {
        await Order.findByIdAndUpdate(localTransaction.connectedOrderId, {
          paymentStatus: 'paid',
          mpesaReceiptNumber: result.mpesaReceiptNumber,
          transactionDate: result.transactionDate,
          amountPaid: result.amount,
          paymentCompletedAt: new Date()
        });
      }

      return NextResponse.json({
        success: true,
        message: result.resultDesc,
        resultCode: result.resultCode,
        resultDesc: result.resultDesc,
        mpesaReceiptNumber: result.mpesaReceiptNumber,
        amount: result.amount,
        phoneNumber: result.phoneNumber,
        transactionDate: result.transactionDate,
        checkoutRequestId: result.checkoutRequestId
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to query payment status',
        resultCode: result.resultCode,
        resultDesc: result.resultDesc
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error querying M-Pesa payment status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4. C2B Confirmation Handler

```typescript
// app/api/payments/c2b/confirmation/route.ts

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import MpesaTransaction from '@/lib/models/MpesaTransaction';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const confirmationData: any = await request.json();
    
    console.log('💰 C2B Confirmation Request received:', JSON.stringify(confirmationData, null, 2));

    const {
      TransactionType: transactionType,
      TransID: transID,
      TransTime: transTime,
      TransAmount: transAmount,
      BusinessShortCode: businessShortCode,
      BillRefNumber: billRefNumber,
      OrgAccountBalance: orgAccountBalance,
      ThirdPartyTransID: thirdPartyTransID,
      MSISDN: msisdn,
      FirstName: firstName,
      MiddleName: middleName,
      LastName: lastName
    } = confirmationData;

    const amount = parseFloat(String(transAmount)) || 0;
    const phoneNumber = msisdn ? String(msisdn).replace(/^254/, '+254') : '';
    const customerName = [firstName, middleName, lastName].filter(Boolean).join(' ') || 'Unknown';

    await connectDB();

    // Check if transaction already exists
    let transaction = await MpesaTransaction.findOne({ transactionId: transID });

    if (transaction) {
      console.log('Transaction already exists:', transID);
      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: 'Success'
      });
    }

    // Find order by billRefNumber (order number or order ID)
    let order = null;
    if (billRefNumber && billRefNumber !== '') {
      try {
        const queryConditions: any[] = [
          { orderNumber: billRefNumber }
        ];

        // Only add _id to query if billRefNumber is a valid MongoDB ObjectId
        if (mongoose.Types.ObjectId.isValid(billRefNumber)) {
          queryConditions.push({ _id: billRefNumber });
        }

        order = await Order.findOne({
          $or: queryConditions
        });
      } catch (error) {
        console.error('Error finding order:', error);
      }
    }

    // Create transaction record
    transaction = await MpesaTransaction.create({
      transactionId: transID,
      transactionType: 'C2B',
      phoneNumber: phoneNumber,
      amountPaid: amount,
      transactionDate: transTime ? new Date(transTime) : new Date(),
      billRefNumber: billRefNumber || '',
      thirdPartyTransID: thirdPartyTransID || '',
      orgAccountBalance: orgAccountBalance || '',
      customerName: customerName,
      firstName: firstName || '',
      middleName: middleName || '',
      lastName: lastName || '',
      status: 'Completed',
      confirmationStatus: 'confirmed',
      paymentCompletedAt: new Date(),
      connectedOrderId: order?._id || null,
      isConnectedToOrder: !!order
    });

    // Update order if found
    if (order) {
      const currentRemainingBalance = order.remainingBalance || order.totalAmount;
      const newRemainingBalance = Math.max(0, currentRemainingBalance - amount);
      const isFullyPaid = newRemainingBalance === 0;

      await Order.findByIdAndUpdate(order._id, {
        paymentStatus: isFullyPaid ? 'paid' : 'partial',
        paymentMethod: 'mpesa_c2b',
        remainingBalance: newRemainingBalance,
        mpesaReceiptNumber: transID,
        transactionDate: transTime ? new Date(transTime) : new Date(),
        amountPaid: amount,
        paymentCompletedAt: new Date(),
        $push: {
          partialPayments: {
            amount: amount,
            date: new Date(),
            mpesaReceiptNumber: transID,
            phoneNumber: phoneNumber,
            method: 'mpesa_c2b'
          }
        },
        $set: {
          'c2bPayment': {
            transactionId: transID,
            mpesaReceiptNumber: transID,
            transactionDate: transTime ? new Date(transTime) : new Date(),
            phoneNumber: phoneNumber,
            amountPaid: amount,
            transactionType: 'C2B',
            billRefNumber: billRefNumber,
            thirdPartyTransID: thirdPartyTransID,
            orgAccountBalance: orgAccountBalance,
            customerName: customerName,
            paymentCompletedAt: new Date()
          }
        }
      });

      await MpesaTransaction.findByIdAndUpdate(transaction._id, {
        isConnectedToOrder: true,
        connectedOrderId: order._id,
        connectedAt: new Date()
      });

      console.log(`✅ C2B payment processed for order ${order.orderNumber}: ${transID}`);
    } else {
      console.log(`⚠️ C2B payment received but no matching order found. BillRef: ${billRefNumber}`);
    }

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Success'
    });
  } catch (error: any) {
    console.error('C2B Confirmation error:', error);
    return NextResponse.json({
      ResultCode: 1,
      ResultDesc: 'Error processing confirmation'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'C2B Confirmation endpoint is active',
    method: 'GET',
    note: 'This endpoint expects POST requests from M-Pesa',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  }, { status: 200 });
}
```

### 5. C2B Registration Route

```typescript
// app/api/mpesa/c2b/register/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { mpesaService } from '@/lib/mpesa';

export async function POST(request: NextRequest) {
  try {
    console.log('Registering C2B URLs...');
    const result = await mpesaService.registerC2BURLs();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'C2B URLs registered successfully with M-Pesa',
        data: {
          originatorConversationID: result.originatorCoversationID,
          responseCode: result.responseCode,
          responseDescription: result.responseDescription
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to register C2B URLs',
        responseCode: result.responseCode,
        responseDescription: result.responseDescription,
        details: result
      }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const validationURL = process.env.MPESA_C2B_VALIDATION_URL;
    const confirmationURL = process.env.MPESA_C2B_CONFIRMATION_URL;
    const responseType = process.env.MPESA_C2B_RESPONSE_TYPE || 'Completed';
    const enableValidation = process.env.MPESA_C2B_ENABLE_VALIDATION === 'true';

    return NextResponse.json({
      configured: !!(validationURL && confirmationURL),
      settings: {
        validationURL,
        confirmationURL,
        responseType,
        enableValidation,
        environment: process.env.MPESA_ENVIRONMENT || 'sandbox'
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## C2B Registration

### How to Register C2B URLs

1. **Ensure your callback URLs are publicly accessible via HTTPS**
2. **Call the registration endpoint**:

```bash
POST /api/mpesa/c2b/register
```

Or use curl:

```bash
curl -X POST https://yourdomain.com/api/mpesa/c2b/register
```

3. **Check registration status**:

```bash
GET /api/mpesa/c2b/register
```

### Important Notes

- C2B URLs must be registered **once** and remain active
- Re-registration is only needed if URLs change
- Validation URL should return `ResultCode: 0` for valid transactions
- Confirmation URL processes the actual payment

---

## STK Push Implementation

### Frontend Integration Example

```typescript
// Example: Initiating payment from frontend

const handlePayOrder = async (order: Order) => {
  try {
    setProcessingPayment(true);
    
    const token = localStorage.getItem('clientAuthToken');
    
    // Format phone number
    let formattedPhone = order.customer.phone.replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+254')) {
      if (formattedPhone.startsWith('254')) {
        formattedPhone = '+' + formattedPhone;
      } else if (formattedPhone.startsWith('0')) {
        formattedPhone = '+254' + formattedPhone.substring(1);
      } else {
        formattedPhone = '+254' + formattedPhone;
      }
    }

    const amountToPay = order.remainingAmount || order.totalAmount;

    const response = await fetch('/api/mpesa/initiate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: order._id,
        phoneNumber: formattedPhone,
        amount: amountToPay,
        paymentType: 'full'
      })
    });

    const data = await response.json();

    if (data.success && data.checkoutRequestId) {
      // Start polling for payment status
      pollPaymentStatus(data.checkoutRequestId, order._id);
    } else {
      setError(data.error || 'Failed to initiate payment');
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    setError('Failed to initiate payment');
  } finally {
    setProcessingPayment(false);
  }
};

// Poll payment status
const pollPaymentStatus = async (checkoutRequestId: string, orderId: string) => {
  const maxAttempts = 30; // 5 minutes (30 * 10 seconds)
  let attempts = 0;

  const poll = async () => {
    if (attempts >= maxAttempts) {
      setError('Payment verification timeout');
      return;
    }

    attempts++;

    try {
      const token = localStorage.getItem('clientAuthToken');
      const response = await fetch(`/api/mpesa/status/${checkoutRequestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success && data.resultCode === '0') {
        // Payment successful
        setSuccess('Payment successful!');
        // Refresh orders
        fetchOrders();
      } else if (data.resultCode && data.resultCode !== '1032') {
        // Payment failed (1032 means still processing)
        setError(data.resultDesc || 'Payment failed');
      } else {
        // Still processing, poll again
        setTimeout(poll, 10000); // Poll every 10 seconds
      }
    } catch (error) {
      console.error('Error polling payment status:', error);
      setTimeout(poll, 10000);
    }
  };

  // Start polling after 5 seconds
  setTimeout(poll, 5000);
};
```

---

## Testing

### Sandbox Testing

1. **Use Safaricom Test Credentials**:
   - Short Code: `174379`
   - Test Phone: `254708374149`
   - Test Amount: Any amount (no real money deducted)

2. **Test STK Push**:
   - Initiate payment with test phone number
   - Enter PIN: `123456` (sandbox test PIN)
   - Verify callback is received

3. **Test C2B**:
   - Send money to your PayBill number
   - Use order number as account number
   - Verify confirmation is received

### Production Checklist

- [ ] All environment variables set correctly
- [ ] Callback URLs are HTTPS and publicly accessible
- [ ] C2B URLs registered with Safaricom
- [ ] Test with real phone number (small amount)
- [ ] Verify SMS notifications work
- [ ] Check order status updates correctly
- [ ] Verify receipt generation works

---

## Troubleshooting

### Common Issues

#### 1. "Invalid access token"
- **Cause**: Expired or invalid credentials
- **Solution**: Check `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET`

#### 2. "STK Push failed"
- **Cause**: Invalid phone number format or insufficient balance
- **Solution**: Ensure phone is in format `254712345678` (no +, no 0)

#### 3. "Callback not received"
- **Cause**: Callback URL not accessible or incorrect
- **Solution**: 
  - Verify URL is HTTPS
  - Check URL is publicly accessible
  - Verify `MPESA_CALLBACK_URL` is correct

#### 4. "Order not found in callback"
- **Cause**: `checkoutRequestId` mismatch
- **Solution**: Ensure order is saved with `checkoutRequestId` before initiating STK Push

#### 5. "C2B payment not connected to order"
- **Cause**: BillRefNumber doesn't match order number
- **Solution**: Ensure customer uses order number as account number when paying

### Debug Logging

Enable detailed logging by checking console output:
- M-Pesa API requests/responses
- Callback data received
- Order update operations
- Transaction creation

### Error Codes

- `0`: Success
- `1032`: Transaction still being processed (poll again)
- `1037`: Timeout waiting for customer input
- `1031`: Request cancelled by user
- `17`: Insufficient balance
- `1`: General error

---

## Security Considerations

1. **Never expose credentials** in frontend code
2. **Validate all inputs** before processing
3. **Use HTTPS** for all callback URLs
4. **Verify transaction amounts** match order amounts
5. **Implement rate limiting** on payment endpoints
6. **Log all transactions** for audit trail
7. **Handle duplicate transactions** (idempotency)

---

## Support

For M-Pesa API issues:
- Safaricom Developer Portal: https://developer.safaricom.co.ke
- API Documentation: https://developer.safaricom.co.ke/docs

---

## Version History

- **v1.0** - Initial implementation with STK Push and C2B support
- PayBill integration with CustomerPayBillOnline transaction type
- Full callback handling and status polling
- Transaction tracking and order updates

---

**Last Updated**: 2024
**Status**: Production Ready ✅

