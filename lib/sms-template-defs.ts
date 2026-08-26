export type SmsTemplateId =
  | 'purchase_confirmation'
  | 'promotion'
  | 'daily_report'
  | 'stock_alert'
  | 'stock_otp'
  | 'deficit_orders'
  | 'pending_confirmations'
  | 'paybill_instructions'
  | 'cash_sale_admin';

export type SmsTemplateField = {
  key: string;
  label: string;
  example: string;
  required?: boolean;
};

export type SmsTemplateDefinition = {
  id: SmsTemplateId;
  name: string;
  description: string;
  recipient: string;
  fields: SmsTemplateField[];
  defaultBody: string;
  sample: Record<string, string>;
};

export const SMS_TEMPLATE_DEFINITIONS: SmsTemplateDefinition[] = [
  {
    id: 'purchase_confirmation',
    name: 'Paid purchase confirmation',
    description: 'Sent to the customer once per day when a POS order is fully paid',
    recipient: 'Customer',
    fields: [
      { key: 'items', label: 'Items / services', example: 'Bulk A4 Normal Paper', required: true },
      { key: 'amount', label: 'Amount', example: 'Ksh 5', required: true },
      { key: 'order_no', label: 'Order number', example: 'ORD-805215-3334', required: true },
    ],
    defaultBody: `OMOTECH HUB COMPUTERS

Thank you for shopping with us.

Purchase: {{items}}
Amount: {{amount}}
Order No: #{{order_no}}

Your purchase has been confirmed successfully.

We offer services including:
• Laptop and desktop sales
• Computer and laptop repairs
• Electronics and accessories
• Printing, photocopying, binding and lamination
• Gas refilling, cylinder sales and delivery
• Laundry and pickup/delivery
• Student storage services
For enquiries or online orders, call/WhatsApp: 0740 802 704.

Thank you for choosing Omotech Hub Computers. We appreciate your business.`,
    sample: {
      items: 'Bulk A4 Normal Paper',
      amount: 'Ksh 5',
      order_no: 'ORD-805215-3334',
    },
  },
  {
    id: 'promotion',
    name: 'New promotion',
    description: 'Sent to clients registered this year when a promotion is created',
    recipient: 'Clients',
    fields: [
      { key: 'title', label: 'Promotion title', example: 'Summer Laptop Offer', required: true },
      { key: 'description', label: 'Description', example: 'Save on selected laptops' },
      { key: 'code', label: 'Promo code', example: 'SAVE15', required: true },
      { key: 'discount', label: 'Discount', example: '15% off', required: true },
      { key: 'valid', label: 'Valid dates', example: '18 Aug 2026 - 31 Aug 2026' },
      { key: 'min_order', label: 'Minimum order', example: 'KSh 5,000' },
    ],
    defaultBody: `OMOTECH HUB COMPUTERS

New promotion for you.

{{title}}
{{description}}

Code: {{code}}
Discount: {{discount}}
Valid: {{valid}}
Min order: {{min_order}}

Use this code at checkout or POS.

Thank you for choosing Omotech Hub Computers.`,
    sample: {
      title: 'Summer Laptop Offer',
      description: 'Save on selected laptops',
      code: 'SAVE15',
      discount: '15% off',
      valid: '18 Aug 2026 - 31 Aug 2026',
      min_order: 'KSh 5,000',
    },
  },
  {
    id: 'daily_report',
    name: 'Midnight daily report',
    description: 'Sent to the superadmin number at 12:00 AM',
    recipient: 'Superadmin',
    fields: [
      { key: 'date', label: 'Date', example: '18 Aug 2026', required: true },
      { key: 'orders', label: 'Orders count', example: '24', required: true },
      { key: 'sales', label: 'Sales', example: 'KSh 125,000', required: true },
      { key: 'collected', label: 'Collected', example: 'KSh 110,000', required: true },
      { key: 'expenses', label: 'Expenses', example: 'KSh 18,400', required: true },
      { key: 'profit_label', label: 'Profit or Loss label', example: 'Profit', required: true },
      { key: 'profit', label: 'Profit / Loss amount', example: 'KSh 106,600', required: true },
    ],
    defaultBody: `OMOTECH HUB COMPUTERS

Daily business report
{{date}}

Orders: {{orders}}
Sales: {{sales}}
Collected: {{collected}}
Expenses: {{expenses}}

{{profit_label}}: {{profit}}

End of day summary.`,
    sample: {
      date: '18 Aug 2026',
      orders: '24',
      sales: 'KSh 125,000',
      collected: 'KSh 110,000',
      expenses: 'KSh 18,400',
      profit_label: 'Profit',
      profit: 'KSh 106,600',
    },
  },
  {
    id: 'stock_alert',
    name: 'Morning stock alert',
    description: 'Stopped. Low-stock SMS is no longer sent.',
    recipient: 'Superadmin',
    fields: [
      { key: 'date', label: 'Date', example: '2026-08-18' },
      { key: 'out_count', label: 'Out of stock count', example: '5', required: true },
      { key: 'low_count', label: 'Low stock count', example: '12', required: true },
      { key: 'link', label: 'Secure list link', example: 'https://www.omotech.co.ke/stock-alert/...', required: true },
    ],
    defaultBody: `OMOTECH HUB COMPUTERS

Morning stock alert

Out of stock: {{out_count}}
Low stock: {{low_count}}

Open the secure list:
{{link}}

An OTP will be sent to this number to view and download.
Do not share this link.`,
    sample: {
      date: '2026-08-18',
      out_count: '5',
      low_count: '12',
      link: 'https://www.omotech.co.ke/stock-alert/secure-example',
    },
  },
  {
    id: 'stock_otp',
    name: 'Stock list OTP',
    description: 'Sent when the superadmin opens the stock link and requests OTP',
    recipient: 'Superadmin',
    fields: [
      { key: 'otp', label: 'OTP code', example: '482913', required: true },
    ],
    defaultBody: `OMOTECH HUB COMPUTERS

Your stock list OTP is {{otp}}.

Valid for 10 minutes.
Do not share it.`,
    sample: {
      otp: '482913',
    },
  },
  {
    id: 'deficit_orders',
    name: 'Partial payments due',
    description: 'Sent after 1:00 PM login with orders that still have a balance',
    recipient: 'Superadmin',
    fields: [
      { key: 'orders_list', label: 'Orders list', example: '0712345678 | HP Laptop | KSh 4,500 left', required: true },
      { key: 'count', label: 'Orders count', example: '2', required: true },
      { key: 'total_left', label: 'Total remaining', example: 'KSh 5,700', required: true },
    ],
    defaultBody: `OMOTECH HUB COMPUTERS

Partial payments due

{{orders_list}}

Orders: {{count}}
Total left: {{total_left}}`,
    sample: {
      orders_list: '0712345678 | HP Laptop | KSh 4,500 left\n0722123456 | Toner x2 | KSh 1,200 left',
      count: '2',
      total_left: 'KSh 5,700',
    },
  },
  {
    id: 'pending_confirmations',
    name: 'Payments awaiting confirmation',
    description: 'Sent after 8:00 PM login if M-Pesa payments still need review',
    recipient: 'Superadmin',
    fields: [
      { key: 'count', label: 'Payments count', example: '10' },
      { key: 'count_label', label: 'Count sentence', example: '10 M-Pesa payments need verification before they are linked to orders.', required: true },
      { key: 'review_url', label: 'Review page link', example: 'https://www.omotech.co.ke/admin/mpesa-transactions', required: true },
    ],
    defaultBody: `OMOTECH HUB COMPUTERS

Payments awaiting confirmation

{{count_label}}

Confirm them now so tonight's report stays accurate.

Review: {{review_url}}`,
    sample: {
      count: '10',
      count_label: '10 M-Pesa payments need verification before they are linked to orders.',
      review_url: 'https://www.omotech.co.ke/admin/mpesa-transactions',
    },
  },
  {
    id: 'paybill_instructions',
    name: 'Manual Paybill instructions',
    description: 'Sent to the customer from POS when paying via Paybill instead of STK',
    recipient: 'Customer',
    fields: [
      { key: 'paybill', label: 'Paybill number', example: '123456', required: true },
      { key: 'account', label: 'Account number', example: '0992', required: true },
      { key: 'amount', label: 'Amount', example: 'KSh 10', required: true },
      { key: 'items', label: 'Items / services', example: 'A4 Normal Printing' },
      { key: 'order_no', label: 'Order number', example: 'A1B2C3' },
    ],
    defaultBody: `OMOTECH HUB COMPUTERS

Pay via M-Pesa Paybill

Paybill: {{paybill}}
Account: {{account}}
Amount: {{amount}}

Purchase: {{items}}

Enter these details on your phone to complete payment.

Call/WhatsApp: 0740 802 704`,
    sample: {
      paybill: '123456',
      account: '0992',
      amount: 'KSh 10',
      items: 'A4 Normal Printing',
      order_no: 'A1B2C3',
    },
  },
  {
    id: 'cash_sale_admin',
    name: 'Yesterday cash sales',
    description: 'Sent once after 9:00 AM login with all cash sales from the previous day (midnight to midnight)',
    recipient: 'Superadmin',
    fields: [
      { key: 'date', label: 'Date', example: '19 Aug 2026', required: true },
      { key: 'count', label: 'Number of cash sales', example: '18', required: true },
      { key: 'total', label: 'Total cash collected', example: 'KSh 24,500', required: true },
      { key: 'stations_list', label: 'Totals by station', example: 'Kutus Store: 12 sales · KSh 18,000' },
    ],
    defaultBody: `OMOTECH HUB COMPUTERS

Yesterday cash sales
{{date}}

Sales: {{count}}
Total: {{total}}

{{stations_list}}`,
    sample: {
      date: '19 Aug 2026',
      count: '18',
      total: 'KSh 24,500',
      stations_list: 'Kutus Store: 12 sales · KSh 18,000\nKerugoya: 6 sales · KSh 6,500',
    },
  },
];

export const DEFAULT_SMS_TEMPLATES = Object.fromEntries(
  SMS_TEMPLATE_DEFINITIONS.map((item) => [item.id, item.defaultBody])
) as Record<SmsTemplateId, string>;

export function applySmsTemplate(template: string, vars: Record<string, string | number | undefined>) {
  const filled = String(template || '').replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key) => {
    const value = vars[String(key).toLowerCase()];
    return value == null ? '' : String(value);
  });
  return filled.replace(/\n{3,}/g, '\n\n').trim();
}

export function smsFieldTag(key: string) {
  return `{{${key}}}`;
}

export function templateHasPlaceholder(body: string, key: string) {
  return new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'i').test(String(body || ''));
}

export function extractSmsPlaceholders(body: string) {
  const matches = String(body || '').matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi);
  return [...new Set([...matches].map((match) => String(match[1]).toLowerCase()))];
}

export function getSmsTemplateDefinition(id: SmsTemplateId) {
  return SMS_TEMPLATE_DEFINITIONS.find((item) => item.id === id);
}

export function getMissingRequiredFields(id: SmsTemplateId, body: string) {
  const definition = getSmsTemplateDefinition(id);
  if (!definition) return [];
  return definition.fields.filter((field) => field.required && !templateHasPlaceholder(body, field.key));
}

export function getUnknownPlaceholders(id: SmsTemplateId, body: string) {
  const definition = getSmsTemplateDefinition(id);
  const allowed = new Set((definition?.fields || []).map((field) => field.key));
  return extractSmsPlaceholders(body).filter((key) => !allowed.has(key));
}

export function ensureRequiredPlaceholders(id: SmsTemplateId, body: string) {
  const definition = getSmsTemplateDefinition(id);
  let next = String(body || '').trim() || definition?.defaultBody || '';
  for (const field of definition?.fields.filter((item) => item.required) || []) {
    if (!templateHasPlaceholder(next, field.key)) {
      next = `${next}\n${field.label}: ${smsFieldTag(field.key)}`;
    }
  }
  return next;
}

export function validateSmsTemplates(templates: Record<string, string>) {
  const errors: string[] = [];
  for (const definition of SMS_TEMPLATE_DEFINITIONS) {
    const body = templates[definition.id] || definition.defaultBody;
    const missing = getMissingRequiredFields(definition.id, body);
    const unknown = getUnknownPlaceholders(definition.id, body);
    if (missing.length > 0) {
      errors.push(`${definition.name} must include ${missing.map((field) => field.label).join(', ')}.`);
    }
    if (unknown.length > 0) {
      errors.push(
        `${definition.name} has unknown fields: ${unknown.map((key) => smsFieldTag(key)).join(', ')}. Use the buttons to insert data.`
      );
    }
  }
  return errors;
}
