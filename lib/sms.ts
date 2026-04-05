interface SMSConfig {
  userId: string;
  password: string;
  senderId: string;
  apiUrl: string;
}

interface SMSResponse {
  status: string;
  mobile: string;
  invalidMobile: string;
  transactionId: string;
  statusCode: string;
  reason: string;
}

class SMSService {
  private config: SMSConfig;

  constructor() {
    this.config = {
      userId: process.env.SMS_USER_ID || '',
      password: process.env.SMS_PASSWORD || '',
      senderId: process.env.SMS_SENDER_ID || 'LUXURY',
      apiUrl: 'https://portal.zettatel.com/SMSApi/send'
    };
  }

  formatPhone(phone: string): string {
    let formatted = phone.trim();
    // Remove all non-digit except leading +
    formatted = formatted.replace(/(?!^\+)\D/g, '');
    if (!formatted.startsWith('+')) {
      // Default to Kenya country code if not present
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

  async sendSMS(mobile: string, message: string): Promise<SMSResponse> {
    const phone = this.formatPhone(mobile);
    const formData = new URLSearchParams({
      userid: this.config.userId,
      password: this.config.password,
      sendMethod: 'quick',
      mobile: phone,
      msg: message,
      senderid: this.config.senderId,
      msgType: 'text',
      duplicatecheck: 'true',
      output: 'json'
    });

    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache'
        },
        body: formData.toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data as SMSResponse;
    } catch (error) {
      console.error('SMS sending error:', error);
      throw error;
    }
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

    const symbol = statusSymbol[status] || '>>';
    
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