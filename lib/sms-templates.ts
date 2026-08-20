import SmsSettings from '@/lib/models/SmsSettings';
import connectDB from '@/lib/mongodb';
import {
  applySmsTemplate,
  DEFAULT_SMS_TEMPLATES,
  SMS_TEMPLATE_DEFINITIONS,
  ensureRequiredPlaceholders,
  validateSmsTemplates,
  type SmsTemplateId,
} from '@/lib/sms-template-defs';

export { applySmsTemplate, SMS_TEMPLATE_DEFINITIONS, validateSmsTemplates };
export type { SmsTemplateId };

const TEMPLATE_IDS = SMS_TEMPLATE_DEFINITIONS.map((item) => item.id);

const PREVIOUS_CASH_SALE_ADMIN_BODIES = [
  `OMOTECH HUB COMPUTERS

Cash sale

Items: {{items}}
Amount: {{amount}}
Order No: #{{order_no}}
Customer: {{customer}}
Phone: {{phone}}
Station: {{station}}`,
];

const PREVIOUS_PURCHASE_CONFIRMATION_BODIES = [
  `OMOTECH HUB COMPUTERS

Thank you for shopping with us.

Purchase: {{items}}
Amount: {{amount}}
Order No: #{{order_no}}

Your purchase has been confirmed successfully.

Thank you for choosing Omotech Hub Computers.
We appreciate your business.`,
  `OMOTECH HUB COMPUTERS

Thank you for shopping with us.

Purchase: {{items}}
Amount: {{amount}}
Order No: #{{order_no}}

Your purchase has been confirmed successfully.

Thank you for choosing Omotech Hub Computers. We appreciate your business.`,
  `OMOTECH HUB COMPUTERS

Thank you for shopping with us.

Purchase: {{items}}
Amount: {{amount}}
Order No: #{{order_no}}

Your purchase has been confirmed successfully.

For enquiries or online orders:
Call/WhatsApp: 0740 802 704

Thank you for choosing Omotech Hub Computers. We appreciate your business.`,
];

function normalizeTemplateBody(value: string) {
  return value.replace(/\r\n/g, '\n').trim();
}

export function sanitizeSmsTemplates(input: unknown): Record<SmsTemplateId, string> {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const next = { ...DEFAULT_SMS_TEMPLATES };
  for (const id of TEMPLATE_IDS) {
    const value = source[id];
    if (typeof value === 'string' && value.trim()) {
      const body = value.slice(0, 1600);
      if (
        id === 'purchase_confirmation' &&
        PREVIOUS_PURCHASE_CONFIRMATION_BODIES.some((old) => normalizeTemplateBody(old) === normalizeTemplateBody(body))
      ) {
        next[id] = DEFAULT_SMS_TEMPLATES.purchase_confirmation;
      } else if (
        id === 'cash_sale_admin' &&
        PREVIOUS_CASH_SALE_ADMIN_BODIES.some((old) => normalizeTemplateBody(old) === normalizeTemplateBody(body))
      ) {
        next[id] = DEFAULT_SMS_TEMPLATES.cash_sale_admin;
      } else {
        next[id] = body;
      }
    }
  }
  return next;
}

export async function getSmsTemplates(): Promise<Record<SmsTemplateId, string>> {
  await connectDB();
  const doc = await SmsSettings.findOne({ key: 'txtlink' }).lean() as { templates?: Record<string, string> } | null;
  return sanitizeSmsTemplates(doc?.templates);
}

export async function renderSmsTemplate(id: SmsTemplateId, vars: Record<string, string | number | undefined>) {
  const templates = await getSmsTemplates();
  const body = ensureRequiredPlaceholders(id, templates[id] || DEFAULT_SMS_TEMPLATES[id]);
  return applySmsTemplate(body, vars) || DEFAULT_SMS_TEMPLATES[id];
}
