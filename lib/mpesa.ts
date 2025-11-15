import axios from 'axios';

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
  error?: string;
}

export interface STKCallbackData {
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
  amount?: number;
}

// C2B Register URL interfaces
export interface C2BRegisterURLRequest {
  shortCode: string;
  responseType: 'Completed' | 'Cancelled';
  confirmationURL: string;
  validationURL: string;
}

export interface C2BRegisterURLResponse {
  success: boolean;
  originatorCoversationID?: string;
  responseCode?: string;
  responseDescription?: string;
  error?: string;
}

export interface C2BValidationRequest {
  transactionType: string;
  transID: string;
  transTime: string;
  transAmount: string;
  businessShortCode: string;
  billRefNumber: string;
  invoiceNumber?: string;
  orgAccountBalance?: string;
  thirdPartyTransID?: string;
  msisdn: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
}

export interface C2BConfirmationRequest extends C2BValidationRequest {
  // Same structure as validation request
}

export interface C2BValidationResponse {
  resultCode: string;
  resultDesc: string;
  thirdPartyTransID?: string;
}

export interface C2BConfirmationResponse {
  resultCode: string; // Always "0" for success
  resultDesc: string; // Usually "Success"
}

class MpesaService {
  private config: MpesaConfig;

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
      console.warn('M-Pesa Configuration Issues:', errors);
      console.warn('Current configuration:', {
        environment: this.config.environment,
        shortCode: this.config.shortCode,
        consumerKey: this.config.consumerKey?.substring(0, 10) + '...',
        hasPasskey: !!this.config.passkey,
        hasConsumerSecret: !!this.config.consumerSecret
      });
    }
  }

  private getBaseUrl(): string {
    return this.config.environment === 'production' 
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async generateAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');
      
      console.log('Generating access token for environment:', this.config.environment);
      console.log('Auth URL:', `${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`);
      
      const response = await axios.get(`${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log('Access token generated successfully');
      return response.data.access_token;
    } catch (error: any) {
      console.error('Error generating access token:', error);
      if (error.response) {
        console.error('Auth error response status:', error.response.status);
        console.error('Auth error response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(`Failed to generate M-Pesa access token: ${error.response?.data?.error_description || error.message}`);
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

  async initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
    try {
      const accessToken = await this.generateAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);
      const formattedPhone = this.formatPhoneNumber(request.phoneNumber);


      const payload = {
        BusinessShortCode: this.config.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerBuyGoodsOnline',
        Amount: Math.round(request.amount),
        PartyA: formattedPhone,
        PartyB: this.config.tillNumber,
        PhoneNumber: formattedPhone,
        CallBackURL: request.callbackUrl,
        AccountReference: request.orderId,
        TransactionDesc: `Payment for Order ${request.orderId}`
      };

      console.log('M-Pesa Configuration:', {
        shortCode: this.config.shortCode,
        environment: this.config.environment,
        consumerKey: this.config.consumerKey?.substring(0, 10) + '...',
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
          customerMessage: response.data.CustomerMessage
        };
      } else {
        return {
          success: false,
          responseCode: response.data.ResponseCode,
          responseDescription: response.data.ResponseDescription,
          error: response.data.errorMessage || response.data.ResponseDescription || 'STK Push failed'
        };
      }
    } catch (error: any) {
      console.error('STK Push error:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
        console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      return {
        success: false,
        error: error.response?.data?.errorMessage || 
               error.response?.data?.ResponseDescription ||
               error.response?.data?.message ||
               error.message || 
               'STK Push request failed'
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

      console.log('M-Pesa Status Query Configuration:', {
        shortCode: this.config.shortCode,
        environment: this.config.environment,
        baseUrl: this.getBaseUrl(),
        checkoutRequestId: checkoutRequestId
      });
      console.log('Status query payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${this.getBaseUrl()}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('STK status query response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('STK status query error:', error);
      
      // Check if this is the "transaction is being processed" response
      if (error.response?.status === 500 && 
          error.response?.data?.errorCode === '500.001.1001' &&
          error.response?.data?.errorMessage === 'The transaction is being processed') {
        
        console.log('Transaction is still being processed by Safaricom - this is normal');
        return {
          success: true,
          isPending: true,
          resultCode: '1032', // Pending status code
          resultDesc: 'Transaction is being processed',
          requestId: error.response.data.requestId,
          message: 'Transaction is still being processed by Safaricom'
        };
      }
      
      // Log detailed error information for other errors
      if (error.response) {
        console.error('Status query error response status:', error.response.status);
        console.error('Status query error response headers:', error.response.headers);
        console.error('Status query error response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      // Return a structured error response for other failures
      return {
        success: false,
        error: error.response?.data?.errorMessage || 
               error.response?.data?.ResponseDescription ||
               error.response?.data?.message ||
               error.message || 
               'STK status query failed',
        resultCode: error.response?.data?.ResultCode || 'ERROR',
        resultDesc: error.response?.data?.ResultDesc || 'Query failed'
      };
    }
  }

  async registerC2BURLs(): Promise<C2BRegisterURLResponse> {
    try {
      const accessToken = await this.generateAccessToken();
      
      // Get URLs from environment variables
      const validationURL = process.env.MPESA_C2B_VALIDATION_URL;
      const confirmationURL = process.env.MPESA_C2B_CONFIRMATION_URL;
      const responseType = (process.env.MPESA_C2B_RESPONSE_TYPE as 'Completed' | 'Cancelled') || 'Completed';
      
      if (!validationURL || !confirmationURL) {
        throw new Error('C2B validation and confirmation URLs must be configured in environment variables');
      }

      const payload: C2BRegisterURLRequest = {
        shortCode: this.config.shortCode,
        responseType: responseType,
        confirmationURL: confirmationURL,
        validationURL: validationURL
      };

      console.log('Registering C2B URLs:', JSON.stringify(payload, null, 2));

      const requestPayload = {
        ShortCode: payload.shortCode,
        ResponseType: payload.responseType,
        ConfirmationURL: payload.confirmationURL,
        ValidationURL: payload.validationURL
      };

      console.log('M-Pesa C2B Register URL Request:', {
        url: `${this.getBaseUrl()}/mpesa/c2b/v1/registerurl`,
        payload: requestPayload,
        environment: this.config.environment
      });

      const response = await axios.post(
        `${this.getBaseUrl()}/mpesa/c2b/v1/registerurl`,
        requestPayload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('M-Pesa C2B Register URL Response:', {
        status: response.status,
        data: response.data
      });

      // M-Pesa returns ResponseCode as string "0" for success
      if (response.data.ResponseCode === '0' || response.data.ResponseCode === 0) {
        return {
          success: true,
          originatorCoversationID: response.data.OriginatorCoversationID || response.data.OriginatorConversationID,
          responseCode: String(response.data.ResponseCode),
          responseDescription: response.data.ResponseDescription || 'Success'
        };
      } else {
        return {
          success: false,
          responseCode: String(response.data.ResponseCode || 'Unknown'),
          responseDescription: response.data.ResponseDescription || 'C2B URL registration failed',
          error: response.data.ResponseDescription || response.data.errorMessage || 'C2B URL registration failed'
        };
      }
    } catch (error: any) {
      console.error('C2B URL registration error:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      if (error.response) {
        console.error('M-Pesa API Error Response:', JSON.stringify(error.response.data, null, 2));
        
        // Return detailed error information
        return {
          success: false,
          responseCode: String(error.response.data?.ResponseCode || error.response.status || 'Unknown'),
          responseDescription: error.response.data?.ResponseDescription || error.response.data?.errorMessage,
          error: error.response.data?.errorMessage || 
                 error.response.data?.ResponseDescription ||
                 error.response.data?.error ||
                 `HTTP ${error.response.status}: ${error.response.statusText}` ||
                 error.message || 
                 'C2B URL registration failed',
          details: error.response.data
        };
      }
      
      // Network or other errors
      return {
        success: false,
        error: error.message || 'C2B URL registration failed',
        details: {
          code: error.code,
          message: error.message
        }
      };
    }
  }
}

export const mpesaService = new MpesaService(); 