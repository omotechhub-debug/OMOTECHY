import { getSmsRuntimeConfig, TXTLINK_BULK_URL, TXTLINK_SEND_URL } from '@/lib/sms-config';

export interface BulkSMSResult {
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}

interface SMSResponse {
  status: string;
  mobile: string;
  invalidMobile: string;
  transactionId: string;
  statusCode: string;
  reason: string;
  messageId?: string;
  segments?: number;
  totalCredits?: number;
  totalCostKes?: number;
  newBalance?: number;
  senderId?: string;
}

export type SmsTrafficType = 'transactional' | 'promotional';

function sanitizeGsmSms(message: string) {
  return String(message || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[‘’‛‹›]/g, "'")
    .replace(/[“”„«»]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/×/g, 'x')
    .replace(/KSh/g, 'Ksh')
    .replace(/[^\x09\x0a\x0d\x20-\x7e•]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

class SMSService {
  private bulkEndpointAvailable: boolean | null = null;

  formatPhone(phone: string): string {
    let formatted = phone.trim();
    formatted = formatted.replace(/(?!^\+)\D/g, '');
    if (!formatted.startsWith('+')) {
      if (formatted.startsWith('254')) {
        formatted = `+${formatted}`;
      } else if (formatted.startsWith('0')) {
        formatted = `+254${formatted.slice(1)}`;
      } else {
        formatted = `+254${formatted}`;
      }
    }
    return formatted;
  }

  async sendSMS(mobile: string, message: string, options?: { type?: SmsTrafficType }): Promise<SMSResponse> {
    const config = await getSmsRuntimeConfig();
    this.assertReady(config);
    return this.sendOne(
      config.apiKey,
      config.senderIdName,
      this.formatPhone(mobile),
      message,
      options?.type || 'transactional'
    );
  }

  async sendBulkSMS(recipients: string[], message: string, options?: { type?: SmsTrafficType }): Promise<BulkSMSResult> {
    const config = await getSmsRuntimeConfig();
    this.assertReady(config);
    const type = options?.type || 'promotional';

    const uniquePhones = [...new Set(
      recipients
        .map((phone) => {
          try {
            return this.formatPhone(phone);
          } catch {
            return '';
          }
        })
        .filter((phone) => /^\+254(7|1)\d{8}$/.test(phone))
    )];

    const skipped = recipients.length - uniquePhones.length;
    if (uniquePhones.length === 0) {
      return { sent: 0, failed: 0, skipped, errors: ['No valid Kenyan phone numbers'] };
    }

    const bulk = await this.tryBulkSend(config.apiKey, config.senderIdName, uniquePhones, message, type);
    if (bulk) {
      return { ...bulk, skipped: skipped + (bulk.skipped || 0) };
    }

    const errors: string[] = [];
    let sent = 0;
    let failed = 0;
    const concurrency = 8;

    for (let i = 0; i < uniquePhones.length; i += concurrency) {
      const chunk = uniquePhones.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        chunk.map((phone) => this.sendOne(config.apiKey, config.senderIdName, phone, message, type))
      );
      for (let index = 0; index < results.length; index++) {
        const result = results[index];
        if (result.status === 'fulfilled') {
          sent++;
        } else {
          failed++;
          if (errors.length < 8) {
            const reason = result.reason instanceof Error ? result.reason.message : 'Send failed';
            errors.push(`${chunk[index]}: ${reason}`);
          }
        }
      }
    }

    return { sent, failed, skipped, errors };
  }

  private assertReady(config: { enabled: boolean; apiKey: string }) {
    if (!config.enabled) {
      throw new Error('SMS sending is disabled in Admin → SMS Settings.');
    }
    if (!config.apiKey) {
      throw new Error('TXTLINK is not configured. Add the API key under Admin → SMS Settings.');
    }
  }

  private async tryBulkSend(
    apiKey: string,
    senderIdName: string,
    phones: string[],
    message: string,
    type: SmsTrafficType = 'promotional'
  ): Promise<BulkSMSResult | null> {
    if (this.bulkEndpointAvailable === false) return null;

    const text = this.prepareMessage(message);
    const errors: string[] = [];
    let sent = 0;
    let failed = 0;
    const chunkSize = 50;

    for (let i = 0; i < phones.length; i += chunkSize) {
      const chunk = phones.slice(i, i + chunkSize);
      const payload: Record<string, unknown> = {
        messages: chunk.map((to) => ({ to, message: text })),
        type,
      };
      if (senderIdName) {
        payload.senderId = senderIdName;
        payload.senderIdName = senderIdName;
      }

      const response = await fetch(TXTLINK_BULK_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 404 || response.status === 405) {
        this.bulkEndpointAvailable = false;
        return null;
      }

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || data?.success === false || data?.error) {
        this.bulkEndpointAvailable = false;
        return null;
      }

      this.bulkEndpointAvailable = true;
      const results = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.messages)
          ? data.messages
          : null;

      if (results) {
        for (const item of results) {
          if (item?.success === false || item?.error || item?.status === 'failed') {
            failed++;
            if (errors.length < 8) errors.push(String(item.error || item.status || 'failed'));
          } else {
            sent++;
          }
        }
      } else {
        sent += chunk.length;
      }
    }

    return { sent, failed, skipped: 0, errors };
  }

  private prepareMessage(message: string) {
    const text = sanitizeGsmSms(message);
    if (!text) {
      throw new Error('SMS message is empty after formatting');
    }
    if (/\{\{\s*[a-z0-9_]+\s*\}\}/i.test(text)) {
      throw new Error('SMS template was not filled. Refusing to send placeholders (msg mismatch).');
    }
    return text;
  }

  private async sendOne(
    apiKey: string,
    senderIdName: string,
    phone: string,
    message: string,
    type: SmsTrafficType = 'transactional'
  ): Promise<SMSResponse> {
    const text = this.prepareMessage(message);
    const payload: Record<string, string> = {
      to: phone,
      message: text,
      type,
    };
    if (senderIdName) {
      payload.senderId = senderIdName;
      payload.senderIdName = senderIdName;
    }

    const response = await fetch(TXTLINK_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let data: any = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    const statusText = String(data?.status || data?.reason || data?.error || '').toLowerCase();
    const looksRejected =
      data?.success === false ||
      Boolean(data?.error) ||
      statusText.includes('fail') ||
      statusText.includes('mismatch') ||
      statusText.includes('reject');

    if (!response.ok || looksRejected) {
      const errorMessage = data?.error || data?.message || data?.reason || `TXTLINK SMS failed (${response.status})`;
      console.error('TXTLINK SMS error:', { status: response.status, data, type, senderIdName });
      throw new Error(errorMessage);
    }

    return {
      status: data.status || 'queued',
      mobile: data.to || phone,
      invalidMobile: '',
      transactionId: data.messageId || '',
      statusCode: String(response.status),
      reason: 'success',
      messageId: data.messageId,
      segments: data.segments,
      totalCredits: data.totalCredits,
      totalCostKes: data.totalCostKes,
      newBalance: data.newBalance,
      senderId: data.senderId || senderIdName,
    };
  }

  async sendBookingConfirmation(orderData: any): Promise<SMSResponse> {
    const { customer, orderNumber, services, totalAmount, paymentStatus } = orderData;
    const phone = this.formatPhone(customer.phone);
    const serviceNames = services.map((s: any) => s.serviceName).join(', ');
    
    const message = `*** Welcome to Econuru Services! ***

Your order #${orderNumber} has been confirmed! 

Services: ${serviceNames}
Total Amount: Ksh ${totalAmount?.toLocaleString() || '0'}
Payment Status: ${paymentStatus?.toUpperCase() || 'UNPAID'}

We're excited to serve you with our premium laundry care!

Thank you for choosing Econuru Services!

Need help? Call us: +254757883799`;

    return this.sendSMS(phone, message);
  }

  async sendOrderStatusUpdate(orderData: any, status: string): Promise<SMSResponse> {
    const { customer, orderNumber } = orderData;
    const phone = this.formatPhone(customer.phone);
    
    const statusSymbol = {
      'processing': '>>',
      'in-progress': '>>',
      'completed': '✓',
      'ready-for-delivery': '>>',
      'delivered': '✓',
      'cancelled': 'X'
    };

    const symbol = statusSymbol[status as keyof typeof statusSymbol] || '>>';
    
    const message = `${symbol} Order Update - Econuru Services ${symbol}

Your order #${orderNumber} is now: ${status.toUpperCase()}

We're working hard to give your clothes the care they deserve!

Stay tuned for more updates! 

Thank you for trusting Econuru Services!

Customer care: +254757883799`;

    return this.sendSMS(phone, message);
  }

  async sendPickupReminder(orderData: any): Promise<SMSResponse> {
    const { customer, orderNumber, pickupDate, pickupTime } = orderData;
    const phone = this.formatPhone(customer.phone);

    const message = `*** Pickup Reminder - Econuru Services ***

Your laundry pickup is scheduled for:
Date: ${pickupDate} at ${pickupTime}

Order: #${orderNumber}

Please ensure someone is available for pickup.

We can't wait to make your clothes look amazing!

Your satisfaction is our priority!

Need to reschedule? Call us: +254757883799`;

    return this.sendSMS(phone, message);
  }

  async sendDeliveryNotification(orderData: any): Promise<SMSResponse> {
    const { customer, orderNumber } = orderData;
    const phone = this.formatPhone(customer.phone);

    const message = `*** Great News! - Econuru Services ***

Your order #${orderNumber} is ready for delivery! 

Your clothes have been treated with our premium care and are looking fabulous!

We'll contact you shortly to arrange delivery.

Thank you for choosing Econuru Services - where quality meets care!

Don't forget to share your experience with friends and family!

We appreciate your business!

Customer care: +254757883799`;

    return this.sendSMS(phone, message);
  }

  async sendWelcomeMessage(customer: any): Promise<SMSResponse> {
    const phone = this.formatPhone(customer.phone);

    const message = `*** Welcome to Econuru Services! ***

Thank you for joining our family of satisfied customers!

We're excited to provide you with:
- Premium laundry care
- Professional service
- Convenient pickup & delivery
- Outstanding customer support

Ready to experience the difference? Book your first order now!

Welcome to the Econuru family!

Customer care: +254757883799`;

    return this.sendSMS(phone, message);
  }

  async sendSpecialOffer(customer: any, offer: string): Promise<SMSResponse> {
    const phone = this.formatPhone(customer.phone);

    const message = `*** Special Offer - Econuru Services ***

${offer}

Limited time only! Don't miss out on this amazing deal!

Book now and experience our premium laundry care at special prices!

Hurry, offer ends soon!

Customer care: +254757883799`;

    return this.sendSMS(phone, message);
  }

  async sendAdminNewOrderNotification(orderData: any): Promise<SMSResponse> {
    const adminPhone = "+254757883799";
    const { customer, orderNumber, totalAmount, paymentStatus } = orderData;
    const message = `New order received!\nName: ${customer.name || 'N/A'}\nPhone: ${customer.phone}\nOrder #: ${orderNumber}\nAmount: Ksh ${totalAmount?.toLocaleString() || '0'}\nStatus: ${paymentStatus?.toUpperCase() || 'UNPAID'}`;
    return this.sendSMS(adminPhone, message);
  }
}

export const smsService = new SMSService();
export default smsService;
